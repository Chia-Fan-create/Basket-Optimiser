-- ============================================================
-- Receipt Processing Queries
-- ============================================================

-- name: get_retailer_by_name
SELECT retailer_id FROM retailers WHERE name = %s;

-- name: find_product_by_name
-- Fuzzy match: product name starts with the given keyword
SELECT product_id, name, default_consumption_days_per_unit
FROM products
WHERE name LIKE CONCAT(%s, '%%')
LIMIT 1;

-- name: find_variant_for_product_retailer
SELECT variant_id
FROM product_variants
WHERE product_id = %s AND retailer_id = %s
LIMIT 1;

-- name: mark_list_items_purchased
-- Mark all unpurchased list_items for a given list + variant as purchased
UPDATE list_items
SET is_purchased = TRUE, purchased_at = NOW()
WHERE list_id = %s AND variant_id = %s AND is_purchased = FALSE;

-- name: insert_receipt_scrape_job
-- Create a scrape_job entry to hold receipt-sourced price records
INSERT INTO scrape_jobs (retailer_id, status, items_scraped)
VALUES (%s, 'success', %s);

-- name: insert_price_record
INSERT INTO price_records (variant_id, price, unit_price, scrape_job_id)
VALUES (%s, %s, %s, %s);

-- name: upsert_inventory
-- Check if inventory entry exists for this user + product
SELECT inventory_id, quantity, consumption_days_per_unit
FROM inventory_items
WHERE user_id = %s AND product_id = %s;

-- name: update_inventory
UPDATE inventory_items
SET quantity = %s, purchase_date = %s,
    consumption_days_per_unit = %s, depletion_date = %s, is_dismissed = FALSE
WHERE inventory_id = %s;

-- name: insert_inventory
INSERT INTO inventory_items
    (user_id, product_id, quantity, purchase_date, consumption_days_per_unit, depletion_date)
VALUES (%s, %s, %s, %s, %s, %s);
