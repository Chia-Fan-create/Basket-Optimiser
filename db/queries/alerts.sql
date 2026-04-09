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
-- 取得某商品目前最便宜的價格及零售商
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
-- 取得使用者追蹤的商品 ID（來自 favorites + alerts）
SELECT DISTINCT product_id FROM user_favorites WHERE user_id = %s
UNION
SELECT DISTINCT product_id FROM price_alerts WHERE user_id = %s;

-- name: get_latest_cheapest_with_date
-- Smart alert 用：取得最新最低價及爬取時間
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
-- 取得某商品所有歷史價格的平均值
SELECT AVG(pr.unit_price) AS avg_price
FROM price_records pr
INNER JOIN product_variants pv ON pr.variant_id = pv.variant_id
WHERE pv.product_id = %s;

-- name: check_existing_todo
-- 檢查該商品是否已有未完成的 buy_now todo（避免重複）
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
-- TRANSACTION：偵測到降價 > 20% 時自動產生 todo
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
