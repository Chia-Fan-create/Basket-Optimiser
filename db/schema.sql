-- ============================================================
-- Smart Cart — MySQL DDL (v3)
-- INFSCI 2710 Final Project
-- Team: Johnson Jao, Fran Hsu, Allen Jung
-- ============================================================
-- Engine: InnoDB | Charset: utf8mb4 | Naming: snake_case
-- ============================================================
-- Changes from v1 (professor feedback + UC4 scope change):
--   F1: todos.alert_id (FK → price_alerts)
--   F2: inventory_items.consumption_days → consumption_days_per_unit
--   F3: products.default_consumption_days_per_unit
--   F4: inventory_items UNIQUE(user_id, product_id)
--   F5: todos.snapshot_price, todos.compared_price
--   F6: New table: scrape_failures
--   F7: New table: seasonal_pattern_years
--   UC4: todos.todo_type ENUM changed to ('buy_now') only
-- Changes from v2 (API spec gap resolution):
--   G2: retailers.color
--   G4: New table: user_favorites
--   G5: inventory_items.is_dismissed
-- ============================================================

-- Drop tables in reverse dependency order (if re-running)
DROP TABLE IF EXISTS purchase_items;
DROP TABLE IF EXISTS purchases;
DROP TABLE IF EXISTS seasonal_pattern_years;
DROP TABLE IF EXISTS seasonal_patterns;
DROP TABLE IF EXISTS scrape_failures;
DROP TABLE IF EXISTS price_records;
DROP TABLE IF EXISTS scrape_jobs;
DROP TABLE IF EXISTS inventory_items;
DROP TABLE IF EXISTS todos;
DROP TABLE IF EXISTS price_alerts;
DROP TABLE IF EXISTS list_items;
DROP TABLE IF EXISTS shopping_lists;
DROP TABLE IF EXISTS product_variants;
DROP TABLE IF EXISTS user_favorites;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS units;
DROP TABLE IF EXISTS brands;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS retailers;
DROP TABLE IF EXISTS users;


-- ============================================================
-- 1. users
-- ============================================================
CREATE TABLE users (
    user_id        INT            AUTO_INCREMENT PRIMARY KEY,
    email          VARCHAR(255)   NOT NULL UNIQUE,
    password_hash  VARCHAR(255)   NOT NULL,
    display_name   VARCHAR(100)   NOT NULL,
    created_at     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 2. retailers
-- ============================================================
CREATE TABLE retailers (
    retailer_id    INT            AUTO_INCREMENT PRIMARY KEY,
    name           VARCHAR(100)   NOT NULL UNIQUE,
    base_url       VARCHAR(255),
    logo_url       VARCHAR(255),
    color          VARCHAR(7)                                      -- [G2] Hex color for UI display (e.g., '#FF9900')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 3. categories
-- ============================================================
CREATE TABLE categories (
    category_id    INT            AUTO_INCREMENT PRIMARY KEY,
    name           VARCHAR(100)   NOT NULL UNIQUE,
    description    TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 4. brands
-- ============================================================
CREATE TABLE brands (
    brand_id       INT            AUTO_INCREMENT PRIMARY KEY,
    name           VARCHAR(100)   NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 5. units
-- ============================================================
CREATE TABLE units (
    unit_id        INT            AUTO_INCREMENT PRIMARY KEY,
    name           VARCHAR(50)    NOT NULL,
    abbreviation   VARCHAR(10)    NOT NULL,
    unit_type      VARCHAR(50)    NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 6. products
-- [F3] Added default_consumption_days_per_unit
-- ============================================================
CREATE TABLE products (
    product_id     INT            AUTO_INCREMENT PRIMARY KEY,
    name           VARCHAR(255)   NOT NULL,
    description    TEXT,
    upc            VARCHAR(50)    UNIQUE,
    brand_id       INT,
    category_id    INT,
    image_url      VARCHAR(255),
    default_consumption_days_per_unit INT,  -- [F3] Shared baseline for inventory consumption rate
    created_at     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_products_brand
        FOREIGN KEY (brand_id) REFERENCES brands(brand_id)
        ON DELETE SET NULL ON UPDATE CASCADE,

    CONSTRAINT fk_products_category
        FOREIGN KEY (category_id) REFERENCES categories(category_id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Index: browse by category (UC1)
CREATE INDEX idx_products_category ON products(category_id);

-- Index: browse by brand (UC1)
CREATE INDEX idx_products_brand ON products(brand_id);


-- ============================================================
-- 7. user_favorites [NEW — G4]
-- Junction table: users ↔ products (M:N favorite relationship)
-- ============================================================
CREATE TABLE user_favorites (
    user_id        INT            NOT NULL,
    product_id     INT            NOT NULL,
    created_at     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (user_id, product_id),

    CONSTRAINT fk_favorites_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT fk_favorites_product
        FOREIGN KEY (product_id) REFERENCES products(product_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 8. product_variants
-- ============================================================
CREATE TABLE product_variants (
    variant_id     INT            AUTO_INCREMENT PRIMARY KEY,
    product_id     INT            NOT NULL,
    retailer_id    INT            NOT NULL,
    retailer_sku   VARCHAR(100),
    pack_size      DECIMAL(10,2)  NOT NULL,
    unit_id        INT            NOT NULL,
    unit_quantity  DECIMAL(10,2)  NOT NULL,
    url            VARCHAR(500),
    created_at     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_variants_product
        FOREIGN KEY (product_id) REFERENCES products(product_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    CONSTRAINT fk_variants_retailer
        FOREIGN KEY (retailer_id) REFERENCES retailers(retailer_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    CONSTRAINT fk_variants_unit
        FOREIGN KEY (unit_id) REFERENCES units(unit_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Index: find all variants for a product (UC1 comparison view)
CREATE INDEX idx_variants_product ON product_variants(product_id);

-- Index: find all variants at a retailer
CREATE INDEX idx_variants_retailer ON product_variants(retailer_id);


-- ============================================================
-- 9. scrape_jobs
-- ============================================================
CREATE TABLE scrape_jobs (
    job_id         INT            AUTO_INCREMENT PRIMARY KEY,
    retailer_id    INT            NOT NULL,
    status         ENUM('running', 'success', 'failed') NOT NULL,
    started_at     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at   DATETIME,
    items_scraped  INT            NOT NULL DEFAULT 0,
    error_message  TEXT,

    CONSTRAINT fk_scrape_jobs_retailer
        FOREIGN KEY (retailer_id) REFERENCES retailers(retailer_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Index: find jobs by retailer and status
CREATE INDEX idx_scrape_jobs_retailer_status ON scrape_jobs(retailer_id, status);


-- ============================================================
-- 10. price_records (Time-Series Fact Table)
-- ============================================================
CREATE TABLE price_records (
    record_id      INT            AUTO_INCREMENT PRIMARY KEY,
    variant_id     INT            NOT NULL,
    price          DECIMAL(10,2)  NOT NULL,
    unit_price     DECIMAL(10,4)  NOT NULL,
    scraped_at     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    scrape_job_id  INT            NOT NULL,

    CONSTRAINT fk_price_records_variant
        FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    CONSTRAINT fk_price_records_job
        FOREIGN KEY (scrape_job_id) REFERENCES scrape_jobs(job_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Index: price history for a variant sorted by time (core query for UC1, UC5, UC8)
CREATE INDEX idx_price_records_variant_time ON price_records(variant_id, scraped_at);

-- Index: find all records from a specific scrape job
CREATE INDEX idx_price_records_job ON price_records(scrape_job_id);

-- Index: time-based queries for trend analysis (UC5, UC8)
CREATE INDEX idx_price_records_scraped_at ON price_records(scraped_at);


-- ============================================================
-- 11. shopping_lists
-- ============================================================
CREATE TABLE shopping_lists (
    list_id        INT            AUTO_INCREMENT PRIMARY KEY,
    user_id        INT            NOT NULL,
    name           VARCHAR(100)   NOT NULL,
    estimated_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_shopping_lists_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Index: find all lists for a user
CREATE INDEX idx_shopping_lists_user ON shopping_lists(user_id);


-- ============================================================
-- 12. list_items (Junction Table)
-- ============================================================
CREATE TABLE list_items (
    list_item_id   INT            AUTO_INCREMENT PRIMARY KEY,
    list_id        INT            NOT NULL,
    variant_id     INT            NOT NULL,
    quantity       INT            NOT NULL DEFAULT 1,
    is_purchased   BOOLEAN        NOT NULL DEFAULT FALSE,
    purchased_at   DATETIME,
    added_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_list_items_list
        FOREIGN KEY (list_id) REFERENCES shopping_lists(list_id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT fk_list_items_variant
        FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Index: find all items in a list
CREATE INDEX idx_list_items_list ON list_items(list_id);

-- Index: find purchase history for a variant (used by UC4 to check recent purchases)
CREATE INDEX idx_list_items_variant ON list_items(variant_id);

-- Index: spending analytics queries — filter purchased items by time (UC5)
CREATE INDEX idx_list_items_purchased ON list_items(is_purchased, purchased_at);


-- ============================================================
-- 13. price_alerts
-- ============================================================
CREATE TABLE price_alerts (
    alert_id       INT            AUTO_INCREMENT PRIMARY KEY,
    user_id        INT            NOT NULL,
    product_id     INT            NOT NULL,
    target_price   DECIMAL(10,2)  NOT NULL,
    is_active      BOOLEAN        NOT NULL DEFAULT TRUE,
    created_at     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    triggered_at   DATETIME,

    CONSTRAINT fk_price_alerts_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT fk_price_alerts_product
        FOREIGN KEY (product_id) REFERENCES products(product_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Index: find all active alerts for checking against new prices
CREATE INDEX idx_price_alerts_active ON price_alerts(is_active, product_id);

-- Index: find all alerts for a user
CREATE INDEX idx_price_alerts_user ON price_alerts(user_id);


-- ============================================================
-- 14. todos
-- [F1] Added alert_id (FK → price_alerts)
-- [F5] Added snapshot_price, compared_price
-- [UC4] todo_type ENUM changed to ('buy_now') only
-- ============================================================
CREATE TABLE todos (
    todo_id        INT            AUTO_INCREMENT PRIMARY KEY,
    user_id        INT            NOT NULL,
    variant_id     INT            NOT NULL,
    alert_id       INT,                                           -- [F1] NULL = system-generated, non-null = triggered by this alert
    todo_type      ENUM('buy_now') NOT NULL,                      -- [UC4] return_rebuy removed
    message        TEXT           NOT NULL,
    snapshot_price DECIMAL(10,2)  NOT NULL,                       -- [F5] Actual price at todo creation time
    compared_price DECIMAL(10,2)  NOT NULL,                       -- [F5] Baseline price for comparison
    is_done        BOOLEAN        NOT NULL DEFAULT FALSE,
    created_at     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at   DATETIME,

    CONSTRAINT fk_todos_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT fk_todos_variant
        FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    CONSTRAINT fk_todos_alert                                     -- [F1]
        FOREIGN KEY (alert_id) REFERENCES price_alerts(alert_id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Index: find pending todos for a user
CREATE INDEX idx_todos_user_pending ON todos(user_id, is_done);

-- Index: find todos triggered by a specific alert [F1]
CREATE INDEX idx_todos_alert ON todos(alert_id);


-- ============================================================
-- 15. inventory_items
-- [F2] consumption_days → consumption_days_per_unit
-- [F4] Added UNIQUE(user_id, product_id)
-- ============================================================
CREATE TABLE inventory_items (
    inventory_id   INT            AUTO_INCREMENT PRIMARY KEY,
    user_id        INT            NOT NULL,
    product_id     INT            NOT NULL,
    quantity       DECIMAL(10,2)  NOT NULL,
    purchase_date  DATE           NOT NULL,
    consumption_days_per_unit INT NOT NULL,                        -- [F2] Days to consume ONE unit
    depletion_date DATE           NOT NULL,                        -- [F2] = purchase_date + (consumption_days_per_unit × quantity)
    is_dismissed   BOOLEAN        NOT NULL DEFAULT FALSE,          -- [G5] User dismissed the depletion reminder but keeps the record
    updated_at     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_inventory_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT fk_inventory_product
        FOREIGN KEY (product_id) REFERENCES products(product_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    CONSTRAINT uq_inventory_user_product                          -- [F4]
        UNIQUE (user_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Index: find items running low for a user (UC6 core query)
CREATE INDEX idx_inventory_user_depletion ON inventory_items(user_id, depletion_date);


-- ============================================================
-- 16. purchases [UC10]
-- Each "Process Purchased Items" creates one purchase record
-- ============================================================
CREATE TABLE purchases (
    purchase_id    INT            AUTO_INCREMENT PRIMARY KEY,
    user_id        INT            NOT NULL,
    purchased_at   DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_amount   DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
    store          VARCHAR(100)   NULL,
    list_id        INT            NULL,

    CONSTRAINT fk_purchases_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT fk_purchases_list
        FOREIGN KEY (list_id) REFERENCES shopping_lists(list_id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_purchases_user_date ON purchases(user_id, purchased_at);


-- ============================================================
-- 17. purchase_items [UC10]
-- Line items for each purchase — price snapshot at purchase time
-- ============================================================
CREATE TABLE purchase_items (
    item_id        INT            AUTO_INCREMENT PRIMARY KEY,
    purchase_id    INT            NOT NULL,
    product_id     INT            NOT NULL,
    variant_id     INT            NOT NULL,
    quantity       INT            NOT NULL DEFAULT 1,
    price          DECIMAL(10,2)  NOT NULL,
    unit_price     DECIMAL(10,4)  NOT NULL,

    CONSTRAINT fk_purchase_items_purchase
        FOREIGN KEY (purchase_id) REFERENCES purchases(purchase_id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT fk_purchase_items_product
        FOREIGN KEY (product_id) REFERENCES products(product_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    CONSTRAINT fk_purchase_items_variant
        FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_purchase_items_purchase ON purchase_items(purchase_id);


-- ============================================================
-- 18. seasonal_patterns
-- ============================================================
CREATE TABLE seasonal_patterns (
    pattern_id       INT            AUTO_INCREMENT PRIMARY KEY,
    product_id       INT            NOT NULL,
    retailer_id      INT            NOT NULL,
    event_name       VARCHAR(100)   NOT NULL,
    typical_month    INT            NOT NULL,
    avg_discount_pct DECIMAL(5,2)   NOT NULL,
    confidence_score DECIMAL(3,2)   NOT NULL,
    last_analyzed_at DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_seasonal_product
        FOREIGN KEY (product_id) REFERENCES products(product_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    CONSTRAINT fk_seasonal_retailer
        FOREIGN KEY (retailer_id) REFERENCES retailers(retailer_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    -- Prevent duplicate patterns for same product + retailer + event
    CONSTRAINT uq_seasonal_product_retailer_event
        UNIQUE (product_id, retailer_id, event_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Index: find all patterns for a product (UC8 product detail page)
CREATE INDEX idx_seasonal_product ON seasonal_patterns(product_id);


-- ============================================================
-- 17. scrape_failures [NEW — F6]
-- Per-variant failure tracking for data quality monitoring
-- ============================================================
CREATE TABLE scrape_failures (
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

-- Index: find failure history for a specific variant
CREATE INDEX idx_scrape_failures_variant ON scrape_failures(variant_id);

-- Index: find all failures in a specific job
CREATE INDEX idx_scrape_failures_job ON scrape_failures(scrape_job_id);


-- ============================================================
-- 18. seasonal_pattern_years [NEW — F7]
-- Year-by-year evidence for seasonal pattern confidence scores
-- ============================================================
CREATE TABLE seasonal_pattern_years (
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


-- ============================================================
-- VIEWS
-- ============================================================

-- View 1: Cheapest unit price per product across all retailers (UC1, UC2)
-- Returns the most recent unit_price for each variant, so the UI
-- can highlight the best deal per product.
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


-- View 2: Monthly spending by category per user (UC5)
-- Aggregates purchased list_items by month and category for
-- the analytics dashboard.
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


-- ============================================================
-- TRANSACTION EXAMPLE (for application layer reference)
-- ============================================================
-- Use case: UC2 — Add item to shopping list + update estimated total
--           If either operation fails, ROLLBACK both.
--
-- START TRANSACTION;
--
-- INSERT INTO list_items (list_id, variant_id, quantity)
-- VALUES (@list_id, @variant_id, @quantity);
--
-- UPDATE shopping_lists
-- SET estimated_total = estimated_total + (
--     SELECT pr.price * @quantity
--     FROM price_records pr
--     INNER JOIN (
--         SELECT variant_id, MAX(record_id) AS latest_record_id
--         FROM price_records
--         WHERE variant_id = @variant_id
--         GROUP BY variant_id
--     ) latest ON pr.record_id = latest.latest_record_id
-- )
-- WHERE list_id = @list_id;
--
-- COMMIT;
-- (Application catches errors and issues ROLLBACK on failure)
