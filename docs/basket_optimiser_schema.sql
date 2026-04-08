-- ============================================================
-- Basket Optimiser — MySQL DDL
-- INFSCI 2710 Final Project
-- Team: Johnson Jao, Fran Hsu, Allen Jung
-- ============================================================
-- Engine: InnoDB | Charset: utf8mb4 | Naming: snake_case
-- ============================================================

-- Drop tables in reverse dependency order (if re-running)
DROP TABLE IF EXISTS seasonal_patterns;
DROP TABLE IF EXISTS price_records;
DROP TABLE IF EXISTS scrape_jobs;
DROP TABLE IF EXISTS inventory_items;
DROP TABLE IF EXISTS todos;
DROP TABLE IF EXISTS price_alerts;
DROP TABLE IF EXISTS list_items;
DROP TABLE IF EXISTS shopping_lists;
DROP TABLE IF EXISTS product_variants;
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
    logo_url       VARCHAR(255)
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
-- ============================================================
CREATE TABLE products (
    product_id     INT            AUTO_INCREMENT PRIMARY KEY,
    name           VARCHAR(255)   NOT NULL,
    description    TEXT,
    upc            VARCHAR(50)    UNIQUE,
    brand_id       INT,
    category_id    INT,
    image_url      VARCHAR(255),
    created_at     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_products_brand
        FOREIGN KEY (brand_id) REFERENCES brands(brand_id)
        ON DELETE SET NULL ON UPDATE CASCADE,

    CONSTRAINT fk_products_category
        FOREIGN KEY (category_id) REFERENCES categories(category_id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Index: frequently filtered by category
CREATE INDEX idx_products_category ON products(category_id);

-- Index: frequently filtered by brand
CREATE INDEX idx_products_brand ON products(brand_id);


-- ============================================================
-- 7. product_variants
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

-- Index: look up all variants for a product
CREATE INDEX idx_variants_product ON product_variants(product_id);

-- Index: look up all variants at a retailer
CREATE INDEX idx_variants_retailer ON product_variants(retailer_id);

-- Index: composite for cross-retailer comparison queries
CREATE INDEX idx_variants_product_retailer ON product_variants(product_id, retailer_id);


-- ============================================================
-- 8. scrape_jobs
-- ============================================================
CREATE TABLE scrape_jobs (
    job_id         INT            AUTO_INCREMENT PRIMARY KEY,
    retailer_id    INT            NOT NULL,
    status         ENUM('running', 'success', 'failed') NOT NULL DEFAULT 'running',
    started_at     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at   DATETIME,
    items_scraped  INT            NOT NULL DEFAULT 0,
    error_message  TEXT,

    CONSTRAINT fk_scrape_jobs_retailer
        FOREIGN KEY (retailer_id) REFERENCES retailers(retailer_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Index: find jobs by retailer and time
CREATE INDEX idx_scrape_jobs_retailer_time ON scrape_jobs(retailer_id, started_at);


-- ============================================================
-- 9. price_records
-- ============================================================
CREATE TABLE price_records (
    record_id      INT            AUTO_INCREMENT PRIMARY KEY,
    variant_id     INT            NOT NULL,
    price          DECIMAL(10,2)  NOT NULL,
    unit_price     DECIMAL(10,4)  NOT NULL,
    scraped_at     DATETIME       NOT NULL,
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
-- 10. shopping_lists
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
-- 11. list_items (Junction Table)
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
-- 12. price_alerts
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
-- 13. todos
-- ============================================================
CREATE TABLE todos (
    todo_id        INT            AUTO_INCREMENT PRIMARY KEY,
    user_id        INT            NOT NULL,
    variant_id     INT            NOT NULL,
    todo_type      ENUM('buy_now', 'return_rebuy') NOT NULL,
    message        TEXT           NOT NULL,
    is_done        BOOLEAN        NOT NULL DEFAULT FALSE,
    created_at     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at   DATETIME,

    CONSTRAINT fk_todos_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT fk_todos_variant
        FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Index: find pending todos for a user
CREATE INDEX idx_todos_user_pending ON todos(user_id, is_done);


-- ============================================================
-- 14. inventory_items
-- ============================================================
CREATE TABLE inventory_items (
    inventory_id     INT            AUTO_INCREMENT PRIMARY KEY,
    user_id          INT            NOT NULL,
    product_id       INT            NOT NULL,
    quantity         DECIMAL(10,2)  NOT NULL,
    purchase_date    DATE           NOT NULL,
    consumption_days INT            NOT NULL,
    depletion_date   DATE           NOT NULL,
    updated_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_inventory_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT fk_inventory_product
        FOREIGN KEY (product_id) REFERENCES products(product_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Index: find items running low for a user (UC6 core query)
CREATE INDEX idx_inventory_user_depletion ON inventory_items(user_id, depletion_date);


-- ============================================================
-- 15. seasonal_patterns
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
-- VIEWS
-- ============================================================

-- View 1: Cheapest current unit price per product across all retailers
-- Used by: UC1 (comparison), UC2 (shopping list cost estimation)
CREATE OR REPLACE VIEW v_cheapest_unit_price AS
SELECT
    p.product_id,
    p.name AS product_name,
    c.name AS category_name,
    b.name AS brand_name,
    r.name AS retailer_name,
    pv.variant_id,
    pv.pack_size,
    u.abbreviation AS unit,
    pv.unit_quantity,
    pr.price,
    pr.unit_price,
    pr.scraped_at
FROM price_records pr
INNER JOIN (
    -- Subquery: get the latest price record for each variant
    SELECT variant_id, MAX(record_id) AS latest_record_id
    FROM price_records
    GROUP BY variant_id
) latest ON pr.record_id = latest.latest_record_id
INNER JOIN product_variants pv ON pr.variant_id = pv.variant_id
INNER JOIN products p ON pv.product_id = p.product_id
INNER JOIN retailers r ON pv.retailer_id = r.retailer_id
INNER JOIN units u ON pv.unit_id = u.unit_id
LEFT JOIN categories c ON p.category_id = c.category_id
LEFT JOIN brands b ON p.brand_id = b.brand_id
ORDER BY p.product_id, pr.unit_price ASC;


-- View 2: Monthly spending by category per user
-- Used by: UC5 (spending analytics dashboard)
CREATE OR REPLACE VIEW v_monthly_spending_by_category AS
SELECT
    sl.user_id,
    YEAR(li.purchased_at)  AS purchase_year,
    MONTH(li.purchased_at) AS purchase_month,
    c.name AS category_name,
    COUNT(li.list_item_id) AS items_bought,
    SUM(pr.price * li.quantity) AS total_spent
FROM list_items li
INNER JOIN shopping_lists sl ON li.list_id = sl.list_id
INNER JOIN product_variants pv ON li.variant_id = pv.variant_id
INNER JOIN products p ON pv.product_id = p.product_id
LEFT JOIN categories c ON p.category_id = c.category_id
INNER JOIN (
    -- Get the price closest to purchase time for accurate spending calc
    SELECT variant_id, MAX(record_id) AS latest_record_id
    FROM price_records
    GROUP BY variant_id
) latest ON pv.variant_id = latest.variant_id
INNER JOIN price_records pr ON pr.record_id = latest.latest_record_id
WHERE li.is_purchased = TRUE
  AND li.purchased_at IS NOT NULL
GROUP BY sl.user_id, purchase_year, purchase_month, c.name
ORDER BY sl.user_id, purchase_year DESC, purchase_month DESC, total_spent DESC;


-- ============================================================
-- TRANSACTION EXAMPLE (for reference — execute in application)
-- ============================================================
-- Scenario: Add an item to a shopping list and update the estimated total.
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
