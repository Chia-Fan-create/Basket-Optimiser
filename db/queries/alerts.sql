-- ============================================================
-- Alerts & Smart Alerts Queries
-- ============================================================

-- name: get_user_alerts
SELECT pa.alert_id, pa.product_id, p.name AS product_name, p.icon,
       pa.target_price, pa.is_active, pa.triggered_at
FROM price_alerts pa
INNER JOIN products p ON pa.product_id = p.product_id
WHERE pa.user_id = %s
ORDER BY pa.created_at DESC;

-- name: get_cheapest_current_price
-- Get the cheapest current price and retailer for a product
SELECT pr.unit_price, r.name AS store, r.color AS store_color
FROM price_records pr
INNER JOIN (
    SELECT variant_id, MAX(record_id) AS latest_record_id
    FROM price_records GROUP BY variant_id
) latest ON pr.record_id = latest.latest_record_id
INNER JOIN product_variants pv ON pr.variant_id = pv.variant_id
INNER JOIN retailers r ON pv.retailer_id = r.retailer_id
WHERE pv.product_id = %s
ORDER BY pr.unit_price ASC
LIMIT 1;

-- name: get_tracked_product_ids
-- Get tracked product IDs for a user (from favorites + alerts)
SELECT DISTINCT product_id FROM user_favorites WHERE user_id = %s
UNION
SELECT DISTINCT product_id FROM price_alerts WHERE user_id = %s;

-- name: get_latest_cheapest_with_date
-- For smart alerts: get latest cheapest price with scrape timestamp
SELECT pr.unit_price AS latest_price, r.name AS store,
       r.color AS store_color, pr.scraped_at
FROM price_records pr
INNER JOIN (
    SELECT variant_id, MAX(record_id) AS latest_record_id
    FROM price_records GROUP BY variant_id
) latest ON pr.record_id = latest.latest_record_id
INNER JOIN product_variants pv ON pr.variant_id = pv.variant_id
INNER JOIN retailers r ON pv.retailer_id = r.retailer_id
WHERE pv.product_id = %s
ORDER BY pr.unit_price ASC
LIMIT 1;

-- name: get_avg_price
-- Get the historical average unit price for a product
SELECT AVG(pr.unit_price) AS avg_price
FROM price_records pr
INNER JOIN product_variants pv ON pr.variant_id = pv.variant_id
WHERE pv.product_id = %s;

-- name: check_existing_todo
-- Check if an incomplete buy_now todo already exists (prevent duplicates)
SELECT todo_id FROM todos
WHERE user_id = %s
  AND variant_id IN (
      SELECT variant_id FROM product_variants WHERE product_id = %s
  )
  AND todo_type = 'buy_now'
  AND is_done = FALSE;

-- name: get_variant_for_product
SELECT variant_id FROM product_variants
WHERE product_id = %s
LIMIT 1;

-- name: insert_smart_todo
-- TRANSACTION: auto-generate todo when price drops > 20%
INSERT INTO todos (user_id, variant_id, todo_type, message)
VALUES (%s, %s, 'buy_now', %s);

-- name: get_product_name_icon
SELECT p.name AS product_name, p.icon
FROM products p
WHERE p.product_id = %s;

-- name: check_product_exists
SELECT name FROM products WHERE product_id = %s;

-- name: insert_alert
INSERT INTO price_alerts (user_id, product_id, target_price)
VALUES (%s, %s, %s);

-- name: delete_alert
DELETE FROM price_alerts
WHERE alert_id = %s AND user_id = %s;
