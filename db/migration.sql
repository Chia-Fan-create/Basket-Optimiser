-- ============================================================
-- SmartCart: Schema Migration v2 → v3
-- Run on existing databases that already have the v2 schema
-- + the previous migration (color, icon, user_favorites, dismissed)
-- ============================================================

USE smartcart;

-- ────────────────────────────────────────────────
-- F3: products.default_consumption_days_per_unit
-- ────────────────────────────────────────────────
ALTER TABLE products
  ADD COLUMN default_consumption_days_per_unit INT DEFAULT NULL
  AFTER image_url;

-- ────────────────────────────────────────────────
-- F2: inventory_items.consumption_days → consumption_days_per_unit
-- ────────────────────────────────────────────────
ALTER TABLE inventory_items
  CHANGE COLUMN consumption_days consumption_days_per_unit INT NOT NULL;

-- ────────────────────────────────────────────────
-- G5: inventory_items.dismissed → is_dismissed
-- ────────────────────────────────────────────────
ALTER TABLE inventory_items
  CHANGE COLUMN dismissed is_dismissed BOOLEAN NOT NULL DEFAULT FALSE;

-- ────────────────────────────────────────────────
-- F4: inventory_items UNIQUE(user_id, product_id)
-- ────────────────────────────────────────────────
ALTER TABLE inventory_items
  ADD CONSTRAINT uq_inventory_user_product UNIQUE (user_id, product_id);

-- ────────────────────────────────────────────────
-- F1 + F5 + UC4: todos table changes
--   - Add alert_id FK
--   - Add snapshot_price, compared_price (NOT NULL)
--   - Change todo_type ENUM to only 'buy_now'
-- ────────────────────────────────────────────────

-- First update any 'return_rebuy' rows to 'buy_now' before changing the ENUM
UPDATE todos SET todo_type = 'buy_now' WHERE todo_type = 'return_rebuy';

-- UC4: Restrict ENUM to 'buy_now' only
ALTER TABLE todos
  MODIFY COLUMN todo_type ENUM('buy_now') NOT NULL;

-- F1: Add alert_id column + FK
ALTER TABLE todos
  ADD COLUMN alert_id INT DEFAULT NULL AFTER variant_id;

ALTER TABLE todos
  ADD CONSTRAINT fk_todos_alert
  FOREIGN KEY (alert_id) REFERENCES price_alerts(alert_id)
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX idx_todos_alert ON todos(alert_id);

-- F5: Add snapshot_price and compared_price
-- Backfill existing rows with 0.00 before adding NOT NULL
ALTER TABLE todos
  ADD COLUMN snapshot_price DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER message,
  ADD COLUMN compared_price DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER snapshot_price;

-- Remove defaults after backfill (match DDL v3)
ALTER TABLE todos
  ALTER COLUMN snapshot_price DROP DEFAULT,
  ALTER COLUMN compared_price DROP DEFAULT;

-- ────────────────────────────────────────────────
-- F6: New table — scrape_failures
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scrape_failures (
    failure_id     INT            AUTO_INCREMENT PRIMARY KEY,
    scrape_job_id  INT            NOT NULL,
    variant_id     INT            NOT NULL,
    error_message  TEXT,
    failed_at      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_scrape_failures_job
        FOREIGN KEY (scrape_job_id) REFERENCES scrape_jobs(job_id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT fk_scrape_failures_variant
        FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_scrape_failures_variant ON scrape_failures(variant_id);
CREATE INDEX idx_scrape_failures_job ON scrape_failures(scrape_job_id);

-- ────────────────────────────────────────────────
-- F7: New table — seasonal_pattern_years
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seasonal_pattern_years (
    pattern_year_id  INT            AUTO_INCREMENT PRIMARY KEY,
    pattern_id       INT            NOT NULL,
    year             INT            NOT NULL,
    observed_discount DECIMAL(5,2)  NOT NULL,
    observed_at      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_pattern_years_pattern
        FOREIGN KEY (pattern_id) REFERENCES seasonal_patterns(pattern_id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT uq_pattern_year
        UNIQUE (pattern_id, year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────
-- Index changes
-- ────────────────────────────────────────────────

-- scrape_jobs: replace retailer_time index with retailer_status
DROP INDEX idx_scrape_jobs_retailer_time ON scrape_jobs;
CREATE INDEX idx_scrape_jobs_retailer_status ON scrape_jobs(retailer_id, status);

-- product_variants: remove unused composite index
DROP INDEX idx_variants_product_retailer ON product_variants;

-- price_records: add DEFAULT CURRENT_TIMESTAMP to scraped_at
ALTER TABLE price_records
  ALTER COLUMN scraped_at SET DEFAULT (CURRENT_TIMESTAMP);

-- ────────────────────────────────────────────────
-- Update views to match v3 DDL
-- ────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_cheapest_unit_price AS
SELECT
    p.product_id,
    p.name          AS product_name,
    c.name          AS category_name,
    b.name          AS brand_name,
    r.name          AS retailer_name,
    pv.variant_id,
    pv.pack_size,
    u.abbreviation  AS unit_abbr,
    pv.unit_quantity,
    pr.price,
    pr.unit_price,
    pr.scraped_at
FROM products p
JOIN product_variants pv ON p.product_id = pv.product_id
JOIN retailers r         ON pv.retailer_id = r.retailer_id
JOIN units u             ON pv.unit_id = u.unit_id
LEFT JOIN brands b       ON p.brand_id = b.brand_id
LEFT JOIN categories c   ON p.category_id = c.category_id
JOIN price_records pr    ON pv.variant_id = pr.variant_id
WHERE pr.record_id = (
    SELECT pr2.record_id
    FROM price_records pr2
    WHERE pr2.variant_id = pv.variant_id
    ORDER BY pr2.scraped_at DESC
    LIMIT 1
);

CREATE OR REPLACE VIEW v_monthly_spending_by_category AS
SELECT
    sl.user_id,
    YEAR(li.purchased_at)  AS purchase_year,
    MONTH(li.purchased_at) AS purchase_month,
    c.name                 AS category_name,
    COUNT(*)               AS items_bought,
    SUM(pr.price * li.quantity) AS total_spent
FROM list_items li
JOIN shopping_lists sl   ON li.list_id = sl.list_id
JOIN product_variants pv ON li.variant_id = pv.variant_id
JOIN products p          ON pv.product_id = p.product_id
LEFT JOIN categories c   ON p.category_id = c.category_id
JOIN price_records pr    ON pv.variant_id = pr.variant_id
WHERE li.is_purchased = TRUE
  AND li.purchased_at IS NOT NULL
  AND pr.record_id = (
      SELECT pr2.record_id
      FROM price_records pr2
      WHERE pr2.variant_id = pv.variant_id
        AND pr2.scraped_at <= li.purchased_at
      ORDER BY pr2.scraped_at DESC
      LIMIT 1
  )
GROUP BY sl.user_id, purchase_year, purchase_month, c.name;
