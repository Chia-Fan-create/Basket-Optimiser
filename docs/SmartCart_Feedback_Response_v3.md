# Smart Cart — Deliverable II Feedback Response

> **Course:** INFSCI 2710 · **Team:** Johnson Jao, Fran Hsu, Allen Jung
> **Deliverable:** Database Fully Designed and Implemented
> **Score:** 35 / 40
> **Grader:** Dmitriy Babichenko · **Feedback date:** Apr 12, 2026
> **Response date:** Apr 14, 2026

---

## Overview

Thank you for the detailed feedback. We have reviewed all seven points, discussed them as a team, and implemented the corresponding changes. The entire schema has been rebuilt from scratch — all tables were dropped and recreated with the updated DDL. The updated schema (v2) and mock data have been applied to the class server database.

Additionally, as a team decision separate from the feedback, we removed the `return_rebuy` todo type from UC4. We determined that encouraging return-and-rebuy behavior could be unfair to retailers and potentially abusive of their return policies.

---

## Issue 1 — Granularity mismatch between `price_alerts` and `todos`

**Your feedback:** `price_alerts` uses `product_id` while `todos` uses `variant_id`. UC3 is defined as triggering UC4, but there is no way to trace which alert generated which todo.

**Our response:** You are correct. Our UC3 flow step 4 states "If current price ≤ target price, system creates a notification (and optionally a todo — see UC4)," so we did define this trigger path ourselves. The product-level vs variant-level design is intentional (alerts are product-level because users care about price regardless of retailer; todos are variant-level because the action targets a specific retailer), but the lack of a traceable link between the two was an oversight.

Without a direct link, we cannot: clean up pending todos when a user cancels an alert, prevent duplicate todos from the same alert, distinguish which alert fired when a user has multiple alerts on the same product at different thresholds, or show alert trigger history.

**What we changed:** Added `alert_id INT NULL` with a foreign key to `price_alerts` on the `todos` table. It is nullable because todos can be generated via two paths: the system detects a large price drop independently (`alert_id = NULL`), or a user's price alert triggers (`alert_id` points to the specific alert). `ON DELETE SET NULL` ensures that if an alert is deleted, the todo remains but loses the link. An index on `alert_id` supports queries like "find all todos triggered by this alert."

---

## Issue 2 — `consumption_days` ignores `quantity`, making `depletion_date` inaccurate

**Your feedback:** `depletion_date` is derived from `purchase_date + consumption_days`, but when `quantity > 1`, this formula is wrong. Depletion should be derived from both quantity and rate together.

**Our response:** You are correct. For example, our mock data had inventory_id 4 (Toilet Paper): `quantity = 8.0`, `consumption_days = 30`, `purchase_date = 2026-03-10`, `depletion_date = 2026-04-09`. That was `purchase_date + 30 days`, but 8 units at 30 days each should deplete in 240 days (2026-11-05), not 30. The root cause was that `consumption_days` had ambiguous semantics — it was unclear whether it meant "days to consume one unit" or "days to consume all units."

**What we changed:** Renamed `consumption_days` to `consumption_days_per_unit` to make the per-unit semantics explicit from the DDL alone. The depletion formula is now `depletion_date = purchase_date + (consumption_days_per_unit × quantity)`. All 32 rows of mock data have been recalculated accordingly.

---

## Issue 3 — No shared default for `consumption_days`

**Your feedback:** `consumption_days` is stored per inventory entry with no shared baseline. Two users tracking the same product each enter their own rate manually.

**Our response:** You are correct. In our mock data, all four users tracking Whole Milk independently entered `consumption_days = 7`, and all four users tracking Greek Yogurt entered `10`. These are clearly common defaults the system should provide.

**What we changed:** Added `default_consumption_days_per_unit INT NULL` to the `products` table. The column name follows the same `_per_unit` convention from Issue 2 for consistency. It is nullable because not every product has a universally reasonable default. Mock data has been populated with defaults for all 17 products (e.g., 7 for Whole Milk, 10 for Greek Yogurt, 30 for Toilet Paper). The application layer will pre-fill `inventory_items.consumption_days_per_unit` from this value when a user first adds a product; users can still override it.

---

## Issue 4 — No UNIQUE constraint on `(user_id, product_id)` in `inventory_items`

**Your feedback:** Without a unique constraint, a user could have duplicate rows for the same product with no way to tell which is current.

**Our response:** Agreed. Our mock data happened to have no duplicates, but the schema should enforce this at the database level, not rely on application logic.

**What we changed:** Added `UNIQUE(user_id, product_id)` constraint on `inventory_items`.

---

## Issue 5 — `todos.message` embeds hardcoded price figures that become stale

**Your feedback:** Messages like "was $4.38" are baked into a text string. Two weeks later the price may have changed, making the message misleading. A separate numeric column for the snapshot price would let the UI render a fresh, accurate message.

**Our response:** Our original 3NF analysis argued that `message` is "a snapshot of the state at the time the todo was created — a stored fact, not a derivation." That argument is valid for normalization purposes, but you are correct that it creates a usability problem: the UI has no way to compare the snapshot against the current price to determine if the deal is still valid, because the numbers are trapped inside a text string.

**What we changed:** Added two numeric columns to `todos`: `snapshot_price DECIMAL(10,2) NOT NULL` (the actual price at todo creation time, e.g., $3.99) and `compared_price DECIMAL(10,2) NOT NULL` (the baseline used for comparison, e.g., $4.38 recent average). The `message` column remains for display. The numeric columns enable the UI to compare `snapshot_price` against the latest `price_records` and determine if the deal is still valid. All 6 mock data rows have been updated with values extracted from the existing message text.

---

## Issue 6 — No tracking of per-variant scrape failures

**Your feedback:** `scrape_jobs.items_scraped` counts successes, but there is no way to know which specific variants are consistently failing to scrape.

**Our response:** Agreed. For a system whose core value depends on fresh price data, this is a data quality blind spot. A single column on `scrape_jobs` cannot capture per-variant failures because one job can have multiple variants fail — a one-to-many relationship. This required a new table.

**What we changed:** Created `scrape_failures`:

```sql
CREATE TABLE scrape_failures (
    failure_id       INT            AUTO_INCREMENT PRIMARY KEY,
    scrape_job_id    INT            NOT NULL,
    variant_id       INT            NOT NULL,
    error_message    TEXT,
    failed_at        DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_scrape_failures_job
        FOREIGN KEY (scrape_job_id) REFERENCES scrape_jobs(job_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_scrape_failures_variant
        FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_scrape_failures_variant ON scrape_failures(variant_id);
CREATE INDEX idx_scrape_failures_job ON scrape_failures(scrape_job_id);
```

Mock data includes 5 failure records. Notably, variant 42 (Disinfecting Wipes on Amazon) fails across 3 consecutive scrape jobs, demonstrating the kind of pattern this table is designed to detect.

---

## Issue 7 — `confidence_score` has no underlying evidence

**Your feedback:** `seasonal_patterns` stores a `confidence_score` described as "based on how many years the pattern repeated," but the year-by-year observations are not stored. Without a supporting detail table, the score cannot be audited or recalculated.

**Our response:** Agreed. A score without traceable evidence is effectively a magic number. We also recognize that `confidence_score` and `avg_discount_pct` on `seasonal_patterns` are now denormalized values — they can be derived from the new detail table. We have documented this as a deliberate denormalization for query convenience, consistent with our treatment of the other denormalized columns in the schema.

**What we changed:** Created `seasonal_pattern_years`:

```sql
CREATE TABLE seasonal_pattern_years (
    pattern_year_id    INT            AUTO_INCREMENT PRIMARY KEY,
    pattern_id         INT            NOT NULL,
    year               INT            NOT NULL,
    observed_discount  DECIMAL(5,2)   NOT NULL,
    observed_at        DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_pattern_years_pattern
        FOREIGN KEY (pattern_id) REFERENCES seasonal_patterns(pattern_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT uq_pattern_year
        UNIQUE (pattern_id, year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

Mock data includes 21 rows (7 patterns × 3 years: 2023–2025). For patterns with lower confidence scores (e.g., 0.67), the underlying data shows years with `observed_discount = 0.00`, making the score derivation transparent and auditable.

---

## Additional Change — UC4 `return_rebuy` Removal

This change is a team decision, not in response to the feedback. After team discussion, we removed the `return_rebuy` todo type from UC4. The `todo_type` ENUM has been changed from `('buy_now', 'return_rebuy')` to `('buy_now')`. The ENUM is preserved for future extensibility.

---

## Summary of All Schema Changes

| # | Source | Table | Change |
|---|---|---|---|
| F1 | Feedback | `todos` | Added `alert_id INT NULL` — FK → `price_alerts` |
| F2 | Feedback | `inventory_items` | Renamed `consumption_days` → `consumption_days_per_unit`. Recalculated all `depletion_date` values. |
| F3 | Feedback | `products` | Added `default_consumption_days_per_unit INT NULL` |
| F4 | Feedback | `inventory_items` | Added `UNIQUE(user_id, product_id)` |
| F5 | Feedback | `todos` | Added `snapshot_price` and `compared_price` (both `DECIMAL(10,2) NOT NULL`) |
| F6 | Feedback | `scrape_failures` | **New table** — per-variant failure tracking (5 mock rows) |
| F7 | Feedback | `seasonal_pattern_years` | **New table** — year-by-year evidence for confidence scores (21 mock rows) |
| UC4 | Team | `todos` | `todo_type` ENUM changed to `('buy_now')` only |

The schema has grown from **15 tables to 17 tables** (13 entity + 2 detail + 2 relation), with **20 indexes**, **23 foreign keys**, and **2 views**. All tables were dropped and recreated from the complete DDL v2. Updated mock data has been loaded. All changes are live on the class server.
