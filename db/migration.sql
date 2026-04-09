-- ============================================================
-- SmartCart: Schema Migration (API ↔ DDL gap fixes)
-- Run AFTER schema.sql and insert_mockdata.sql
-- ============================================================

USE smartcart;

-- Gap 2: retailers needs a `color` column for frontend UI indicators
ALTER TABLE retailers ADD COLUMN color VARCHAR(7) NOT NULL DEFAULT '#888888' AFTER name;

UPDATE retailers SET color = '#FF9900' WHERE name = 'Amazon';
UPDATE retailers SET color = '#CC0000' WHERE name = 'Target';
UPDATE retailers SET color = '#0071DC' WHERE name = 'Walmart';

-- Gap 3: products needs an `icon` column (emoji) for frontend display
ALTER TABLE products ADD COLUMN icon VARCHAR(10) DEFAULT NULL AFTER name;

UPDATE products SET icon = '🥛' WHERE product_id = 1;   -- Whole Milk
UPDATE products SET icon = '🥛' WHERE product_id = 2;   -- Greek Yogurt
UPDATE products SET icon = '🧀' WHERE product_id = 3;   -- Shredded Cheddar Cheese
UPDATE products SET icon = '🍊' WHERE product_id = 4;   -- Orange Juice
UPDATE products SET icon = '💧' WHERE product_id = 5;   -- Sparkling Water
UPDATE products SET icon = '☕' WHERE product_id = 6;   -- Ground Coffee
UPDATE products SET icon = '🥜' WHERE product_id = 7;   -- Peanut Butter
UPDATE products SET icon = '🍝' WHERE product_id = 8;   -- Pasta
UPDATE products SET icon = '🥣' WHERE product_id = 9;   -- Granola Bars
UPDATE products SET icon = '🥔' WHERE product_id = 10;  -- Potato Chips
UPDATE products SET icon = '🧻' WHERE product_id = 11;  -- Toilet Paper
UPDATE products SET icon = '🧻' WHERE product_id = 12;  -- Paper Towels
UPDATE products SET icon = '🧴' WHERE product_id = 13;  -- Laundry Detergent
UPDATE products SET icon = '🧹' WHERE product_id = 14;  -- Disinfecting Wipes
UPDATE products SET icon = '👶' WHERE product_id = 15;  -- Baby Wipes
UPDATE products SET icon = '🍕' WHERE product_id = 16;  -- Frozen Pizza
UPDATE products SET icon = '🍦' WHERE product_id = 17;  -- Ice Cream

-- Gap 4: user_favorites junction table (no DDL existed)
CREATE TABLE IF NOT EXISTS user_favorites (
    user_id      INT NOT NULL,
    product_id   INT NOT NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, product_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed some favorites for demo
INSERT INTO user_favorites (user_id, product_id) VALUES
(1, 1), (1, 2), (1, 4), (1, 11),   -- Alex likes milk, yogurt, OJ, toilet paper
(2, 6), (2, 7), (2, 8), (2, 16),   -- Maria likes coffee, PB, pasta, pizza
(3, 1), (3, 5), (3, 9), (3, 17);   -- Sam likes milk, sparkling water, granola, ice cream

-- Gap 5: inventory_items needs `dismissed` column for "Running Low" dismiss feature
ALTER TABLE inventory_items ADD COLUMN dismissed BOOLEAN NOT NULL DEFAULT FALSE AFTER depletion_date;
