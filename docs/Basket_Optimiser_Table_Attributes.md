# Basket Optimiser — Table & Attribute Reference

> Internal document for team discussion. Covers all 15 tables with attribute-level UC mapping and 3NF verification.
> Last updated: 2026-03-26

---

## Entity Tables

---

### 1. `users`

Stores registered user accounts. All personalized features depend on this table.

| Attribute       | Type         | Constraint | Used in UC | Purpose |
|-----------------|--------------|------------|------------|---------|
| `user_id`       | INT          | PK, AUTO_INCREMENT | UC2-UC8 | Unique identifier for every user |
| `email`         | VARCHAR(255) | UNIQUE, NOT NULL | UC7 | Login credential, also used for notifications |
| `password_hash` | VARCHAR(255) | NOT NULL   | UC7 | Hashed password for authentication |
| `display_name`  | VARCHAR(100) | NOT NULL   | UC7 | Display name shown in UI |
| `created_at`    | DATETIME     | NOT NULL, DEFAULT NOW | UC7 | Account creation timestamp |
| `updated_at`    | DATETIME     | NOT NULL, DEFAULT NOW ON UPDATE | UC7 | Last profile update timestamp |

**3NF check:** All non-key attributes (`email`, `password_hash`, `display_name`, `created_at`, `updated_at`) depend solely on `user_id`. No transitive dependencies. **Passes 3NF.**

---

### 2. `retailers`

Stores the three retail platforms we scrape from. Seed data — populated once manually.

| Attribute     | Type         | Constraint | Used in UC | Purpose |
|---------------|--------------|------------|------------|---------|
| `retailer_id` | INT          | PK, AUTO_INCREMENT | UC1, UC2, UC5, UC8 | Unique identifier for each retailer |
| `name`        | VARCHAR(100) | UNIQUE, NOT NULL | UC1 | Display name (e.g., "Amazon", "Target", "Walmart") |
| `base_url`    | VARCHAR(255) |            | UC1 | Retailer's main website URL, used for linking back |
| `logo_url`    | VARCHAR(255) |            | UC1 | Path to retailer logo image for UI display |

**3NF check:** All attributes depend solely on `retailer_id`. No transitive dependencies. **Passes 3NF.**

---

### 3. `categories`

Product categories for browsing and analytics grouping. Seed data.

| Attribute     | Type         | Constraint | Used in UC | Purpose |
|---------------|--------------|------------|------------|---------|
| `category_id` | INT          | PK, AUTO_INCREMENT | UC1, UC5 | Unique identifier for each category |
| `name`        | VARCHAR(100) | UNIQUE, NOT NULL | UC1 | Category display name (e.g., "Dairy", "Toiletries", "Snacks") |
| `description` | TEXT         |            | UC1 | Optional longer description of the category |

**3NF check:** All attributes depend solely on `category_id`. **Passes 3NF.**

---

### 4. `brands`

Brand information extracted from scraped data.

| Attribute  | Type         | Constraint | Used in UC | Purpose |
|------------|--------------|------------|------------|---------|
| `brand_id` | INT          | PK, AUTO_INCREMENT | UC1 | Unique identifier for each brand |
| `name`     | VARCHAR(100) | UNIQUE, NOT NULL | UC1 | Brand name (e.g., "Charmin", "Bounty", "Kirkland") |

**3NF check:** Only one non-key attribute, depends solely on `brand_id`. **Passes 3NF.**

---

### 5. `units`

Defines measurement units for normalizing per-unit price. Seed data.

| Attribute      | Type         | Constraint | Used in UC | Purpose |
|----------------|--------------|------------|------------|---------|
| `unit_id`      | INT          | PK, AUTO_INCREMENT | UC1 | Unique identifier for each unit |
| `name`         | VARCHAR(50)  | NOT NULL   | UC1 | Full name (e.g., "ounce", "count", "sheet") |
| `abbreviation` | VARCHAR(10)  | NOT NULL   | UC1 | Short form for UI display (e.g., "oz", "ct", "sht") |
| `unit_type`    | VARCHAR(50)  | NOT NULL   | UC1 | Grouping for conversion logic (e.g., "weight", "volume", "count") |

**3NF check:** Could `abbreviation` be derived from `name`? No — abbreviations are not always predictable (e.g., "pound" → "lb", not "pd"). All attributes depend solely on `unit_id`. `unit_type` depends on `unit_id`, not on `name` (different units can share the same type). **Passes 3NF.**

---

### 6. `products`

Core product entity. Represents an abstract product regardless of retailer or pack size.

| Attribute     | Type         | Constraint | Used in UC | Purpose |
|---------------|--------------|------------|------------|---------|
| `product_id`  | INT          | PK, AUTO_INCREMENT | UC1-UC6, UC8 | Unique identifier for each product |
| `name`        | VARCHAR(255) | NOT NULL   | UC1 | Product name (e.g., "Charmin Ultra Soft Toilet Paper") |
| `description` | TEXT         |            | UC1 | Detailed product description |
| `upc`         | VARCHAR(50)  | UNIQUE     | UC1 | Universal Product Code for cross-retailer matching |
| `brand_id`    | INT          | FK → brands | UC1 | Which brand makes this product |
| `category_id` | INT          | FK → categories | UC1, UC5 | Which category this product belongs to |
| `image_url`   | VARCHAR(255) |            | UC1 | Product image URL for UI display |
| `created_at`  | DATETIME     | NOT NULL   | — | Record creation timestamp |
| `updated_at`  | DATETIME     | NOT NULL   | — | Last update timestamp |

**3NF check:**
- `brand_id` → we do NOT store `brand_name` here; that lives in `brands`. Good.
- `category_id` → we do NOT store `category_name` here; that lives in `categories`. Good.
- All non-key attributes depend solely on `product_id`. No transitive dependencies.
- **Passes 3NF.**

---

### 7. `product_variants`

A specific version of a product at a specific retailer with a specific pack size. This is the level at which prices are tracked.

| Attribute      | Type          | Constraint | Used in UC | Purpose |
|----------------|---------------|------------|------------|---------|
| `variant_id`   | INT           | PK, AUTO_INCREMENT | UC1, UC2, UC4 | Unique identifier for each variant |
| `product_id`   | INT           | FK → products, NOT NULL | UC1 | Which abstract product this variant belongs to |
| `retailer_id`  | INT           | FK → retailers, NOT NULL | UC1, UC2 | Which retailer sells this variant |
| `retailer_sku` | VARCHAR(100)  |            | UC1 | Retailer's internal SKU for linking back to product page |
| `pack_size`    | DECIMAL(10,2) | NOT NULL   | UC1 | Number of items in this package (e.g., 24 for a 24-pack) |
| `unit_id`      | INT           | FK → units, NOT NULL | UC1 | What unit this variant is measured in |
| `unit_quantity` | DECIMAL(10,2)| NOT NULL   | UC1 | Total quantity in the package in terms of unit (e.g., 48 oz) |
| `url`          | VARCHAR(500)  |            | UC1 | Direct link to this product on the retailer's site |
| `created_at`   | DATETIME      | NOT NULL   | — | Record creation timestamp |

**3NF check:**
- `retailer_id` → we do NOT store `retailer_name` here. Good.
- `unit_id` → we do NOT store `unit_name` or `abbreviation` here. Good.
- `product_id` → we do NOT store `product_name` or `brand` here. Good.
- Could `unit_quantity` be derived from `pack_size` × some conversion? No — `pack_size` is the number of items (e.g., 24 rolls), and `unit_quantity` is the total measurement (e.g., 24 × 200 sheets = 4800 sheets). They are independent facts about the variant.
- All non-key attributes depend solely on `variant_id`. **Passes 3NF.**

**Design note:** One might ask why not make (`product_id`, `retailer_id`) the PK. Because the same product can appear at the same retailer in multiple pack sizes (12-pack and 24-pack). `variant_id` as surrogate PK handles this cleanly.

---

### 8. `shopping_lists`

User-created shopping lists. Each user can have multiple lists.

| Attribute        | Type          | Constraint | Used in UC | Purpose |
|------------------|---------------|------------|------------|---------|
| `list_id`        | INT           | PK, AUTO_INCREMENT | UC2 | Unique identifier for each list |
| `user_id`        | INT           | FK → users, NOT NULL | UC2 | Which user owns this list |
| `name`           | VARCHAR(100)  | NOT NULL   | UC2 | List name (e.g., "Weekly Groceries") |
| `estimated_total`| DECIMAL(10,2) | NOT NULL, DEFAULT 0.00 | UC2 | Calculated total cost (updated atomically — transaction scenario) |
| `created_at`     | DATETIME      | NOT NULL   | UC2 | List creation timestamp |
| `updated_at`     | DATETIME      | NOT NULL   | UC2 | Last modification timestamp |

**3NF check:**
- `user_id` → we do NOT store `user_name` or `email` here. Good.
- `estimated_total` is a derived/cached value (could be computed from `list_items` + `price_records`). **This is a deliberate denormalization.** We store it here to support the transaction scenario required by the course: "add item + update total atomically with ROLLBACK on failure." Without this column, there's no second write operation for the transaction to be meaningful. This is documented and justified.
- All other attributes depend solely on `list_id`. **Passes 3NF (with documented denormalization).**

---

### 9. `price_alerts`

User-defined threshold alerts on specific products.

| Attribute      | Type          | Constraint | Used in UC | Purpose |
|----------------|---------------|------------|------------|---------|
| `alert_id`     | INT           | PK, AUTO_INCREMENT | UC3 | Unique identifier for each alert |
| `user_id`      | INT           | FK → users, NOT NULL | UC3 | Which user set this alert |
| `product_id`   | INT           | FK → products, NOT NULL | UC3 | Which product to monitor |
| `target_price` | DECIMAL(10,2) | NOT NULL   | UC3 | Price threshold — notify when price drops below this |
| `is_active`    | BOOLEAN       | DEFAULT TRUE | UC3 | Whether this alert is still active |
| `created_at`   | DATETIME      | NOT NULL   | UC3 | When the alert was created |
| `triggered_at` | DATETIME      |            | UC3 | When the alert was last triggered (NULL if never) |

**3NF check:** All non-key attributes depend solely on `alert_id`. No transitive dependencies. **Passes 3NF.**

**Design note:** Alert is set at the `product` level (not `variant` level) because users care about "Charmin dropping below $20" regardless of which retailer hits the target first.

---

### 10. `todos`

System-generated actionable items triggered by significant price drops.

| Attribute      | Type          | Constraint | Used in UC | Purpose |
|----------------|---------------|------------|------------|---------|
| `todo_id`      | INT           | PK, AUTO_INCREMENT | UC4 | Unique identifier for each todo |
| `user_id`      | INT           | FK → users, NOT NULL | UC4 | Which user receives this todo |
| `variant_id`   | INT           | FK → product_variants, NOT NULL | UC4 | Which specific variant triggered this todo |
| `todo_type`    | ENUM('buy_now', 'return_rebuy') | NOT NULL | UC4 | Whether to buy now or return-and-rebuy |
| `message`      | TEXT          | NOT NULL   | UC4 | Human-readable description (e.g., "Charmin dropped 30% at Target — save $6") |
| `is_done`      | BOOLEAN       | DEFAULT FALSE | UC4 | Whether user has acted on this todo |
| `created_at`   | DATETIME      | NOT NULL   | UC4 | When the todo was generated |
| `completed_at` | DATETIME      |            | UC4 | When user marked it done (NULL if pending) |

**3NF check:**
- `message` could theoretically be derived from `variant_id` + price data, but it's a snapshot of the state at the time the todo was created (prices change, but the message should reflect the moment it was triggered). It's a stored fact, not a derivation.
- All non-key attributes depend solely on `todo_id`. **Passes 3NF.**

---

### 11. `inventory_items`

Tracks what users currently have at home and their consumption cycles.

| Attribute         | Type          | Constraint | Used in UC | Purpose |
|-------------------|---------------|------------|------------|---------|
| `inventory_id`    | INT           | PK, AUTO_INCREMENT | UC6 | Unique identifier for each inventory entry |
| `user_id`         | INT           | FK → users, NOT NULL | UC6 | Which user's household this belongs to |
| `product_id`      | INT           | FK → products, NOT NULL | UC6 | Which product is being tracked |
| `quantity`         | DECIMAL(10,2)| NOT NULL   | UC6 | Current quantity at home |
| `purchase_date`   | DATE          | NOT NULL   | UC6 | When this item was last purchased |
| `consumption_days`| INT           | NOT NULL   | UC6 | Estimated days to fully consume this item |
| `depletion_date`  | DATE          | NOT NULL   | UC6 | Estimated date when item runs out |
| `updated_at`      | DATETIME      | NOT NULL   | UC6 | Last update timestamp |

**3NF check:**
- `depletion_date` can be derived from `purchase_date` + `consumption_days`. **This is a deliberate denormalization** for query convenience — the system frequently queries "which items are depleting within 2 days" and computing this on the fly across all users' inventory would be expensive. Indexed for fast lookup. Documented and justified.
- All other non-key attributes depend solely on `inventory_id`. **Passes 3NF (with documented denormalization).**

---

### 12. `scrape_jobs`

Logs each execution of the scraping pipeline. Used for data provenance and debugging.

| Attribute       | Type          | Constraint | Used in UC | Purpose |
|-----------------|---------------|------------|------------|---------|
| `job_id`        | INT           | PK, AUTO_INCREMENT | (admin) | Unique identifier for each scrape run |
| `retailer_id`   | INT           | FK → retailers, NOT NULL | (admin) | Which retailer was scraped |
| `status`        | ENUM('running', 'success', 'failed') | NOT NULL | (admin) | Outcome of the scrape job |
| `started_at`    | DATETIME      | NOT NULL   | (admin) | When the scrape started |
| `completed_at`  | DATETIME      |            | (admin) | When it finished (NULL if still running) |
| `items_scraped` | INT           | NOT NULL, DEFAULT 0 | (admin) | Number of price records produced |
| `error_message` | TEXT          |            | (admin) | Error details if status = 'failed' |

**3NF check:** All non-key attributes depend solely on `job_id`. `error_message` only applies when `status = 'failed'`, but that's a conditional NULL, not a dependency violation. **Passes 3NF.**

---

### 13. `seasonal_patterns`

System-generated analysis results identifying recurring discount patterns from historical price data.

| Attribute          | Type          | Constraint | Used in UC | Purpose |
|--------------------|---------------|------------|------------|---------|
| `pattern_id`       | INT           | PK, AUTO_INCREMENT | UC8 | Unique identifier for each pattern |
| `product_id`       | INT           | FK → products, NOT NULL | UC8 | Which product exhibits this pattern |
| `retailer_id`      | INT           | FK → retailers, NOT NULL | UC8 | At which retailer the pattern is observed |
| `event_name`       | VARCHAR(100)  | NOT NULL   | UC8 | Name of the shopping event (e.g., "Black Friday", "Prime Day") |
| `typical_month`    | INT           | NOT NULL   | UC8 | Month when the deal typically occurs (1-12) |
| `avg_discount_pct` | DECIMAL(5,2)  | NOT NULL   | UC8 | Average historical discount percentage |
| `confidence_score` | DECIMAL(3,2)  | NOT NULL   | UC8 | How reliable the pattern is (0.00 to 1.00), based on how many years it repeated |
| `last_analyzed_at` | DATETIME      | NOT NULL   | UC8 | When this pattern was last recalculated |

**3NF check:**
- Could `typical_month` be derived from `event_name`? Not always — Black Friday is always November, but "back-to-school" could vary by retailer. Keeping both allows flexibility.
- All non-key attributes depend solely on `pattern_id`. **Passes 3NF.**

**Design note:** A UNIQUE constraint on (`product_id`, `retailer_id`, `event_name`) prevents duplicate patterns.

---

## Relation Tables

---

### 14. `list_items` (Junction Table)

Resolves the M:N relationship between `shopping_lists` and `product_variants`. A list can contain many variants, and a variant can appear in many users' lists.

| Attribute      | Type          | Constraint | Used in UC | Purpose |
|----------------|---------------|------------|------------|---------|
| `list_item_id` | INT           | PK, AUTO_INCREMENT | UC2, UC4, UC5 | Unique identifier for each list entry |
| `list_id`      | INT           | FK → shopping_lists, NOT NULL | UC2 | Which shopping list this item belongs to |
| `variant_id`   | INT           | FK → product_variants, NOT NULL | UC2 | Which product variant is being added |
| `quantity`      | INT           | NOT NULL, DEFAULT 1 | UC2 | How many of this variant the user wants to buy |
| `is_purchased` | BOOLEAN       | NOT NULL, DEFAULT FALSE | UC2, UC4, UC5, UC6 | Whether the user has actually bought this item |
| `purchased_at` | DATETIME      |            | UC4, UC5 | When the purchase was made (NULL if not yet purchased). Used by UC4 to check "recently bought" and by UC5 for spending analytics |
| `added_at`     | DATETIME      | NOT NULL   | UC2 | When this item was added to the list |

**3NF check:**
- All non-key attributes depend on `list_item_id` (which uniquely identifies a specific item-in-a-specific-list).
- `is_purchased` and `purchased_at` are independent facts about this particular list entry, not derivable from other attributes.
- **Passes 3NF.**

**Why this is a Relation Table:** Without `list_items`, we'd need to either (a) store arrays of variant_ids in `shopping_lists` (violates 1NF) or (b) duplicate shopping list info per item. The junction table cleanly resolves the M:N relationship while carrying additional attributes (`quantity`, `is_purchased`, `purchased_at`) that belong to the relationship itself, not to either entity.

---

### 15. `price_records` (Time-Series Fact Table)

Each row is a price snapshot for a specific product variant at a specific point in time. This is the highest-volume table — it grows with every scrape.

| Attribute      | Type          | Constraint | Used in UC | Purpose |
|----------------|---------------|------------|------------|---------|
| `record_id`    | INT           | PK, AUTO_INCREMENT | UC1, UC2, UC3, UC4, UC5, UC8 | Unique identifier for each price record |
| `variant_id`   | INT           | FK → product_variants, NOT NULL | UC1, UC2, UC3 | Which variant this price belongs to |
| `price`        | DECIMAL(10,2) | NOT NULL   | UC1, UC2, UC3, UC4 | The actual listed price at scrape time |
| `unit_price`   | DECIMAL(10,4) | NOT NULL   | UC1, UC2 | Calculated price-per-unit (price ÷ unit_quantity) |
| `scraped_at`   | DATETIME      | NOT NULL   | UC1, UC5, UC8 | When this price was captured |
| `scrape_job_id`| INT           | FK → scrape_jobs, NOT NULL | (admin) | Which scrape job produced this record, for data provenance |

**3NF check:**
- `unit_price` can be derived from `price` ÷ `product_variants.unit_quantity`. **This is a deliberate denormalization** — `unit_price` is the most frequently queried column in the entire system (UC1 sorts by it, UC2 calculates totals from it, UC5 aggregates it). Computing it via JOIN on every query would be costly. Stored at scrape time and indexed. Documented and justified.
- `variant_id` → we do NOT store `product_name`, `retailer_name`, or `unit` here. Good.
- All other non-key attributes depend solely on `record_id`. **Passes 3NF (with documented denormalization).**

**Why this is a Relation Table:** `price_records` captures a fact that exists at the intersection of a `product_variant` and a point in time. It's conceptually similar to a junction table — it records "variant X had price Y at time Z." Without it, we'd have to overwrite prices on `product_variants` and lose all history.

---

## 3NF Summary

| Table | Passes 3NF? | Notes |
|-------|-------------|-------|
| `users` | Yes | Clean |
| `retailers` | Yes | Clean |
| `categories` | Yes | Clean |
| `brands` | Yes | Clean |
| `units` | Yes | Clean |
| `products` | Yes | Clean — FKs to `brands` and `categories`, no redundant name storage |
| `product_variants` | Yes | Clean — FKs to `products`, `retailers`, `units` |
| `shopping_lists` | Yes* | `estimated_total` is denormalized for transaction scenario (documented) |
| `price_alerts` | Yes | Clean |
| `todos` | Yes | `message` is a snapshot, not a derivation |
| `inventory_items` | Yes* | `depletion_date` is denormalized for query performance (documented) |
| `scrape_jobs` | Yes | Clean |
| `seasonal_patterns` | Yes | Clean |
| `list_items` | Yes | Clean junction table |
| `price_records` | Yes* | `unit_price` is denormalized for query performance (documented) |

**\* = passes 3NF with documented, justified denormalization**

Three columns across the entire schema are intentionally denormalized:
1. `shopping_lists.estimated_total` — supports transaction scenario (course requirement)
2. `inventory_items.depletion_date` — supports efficient "what's running low" queries
3. `price_records.unit_price` — supports the core comparison feature without expensive JOINs

All three are documented with justification, which satisfies the course requirement for "3NF with written justification."
