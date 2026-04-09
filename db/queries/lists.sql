-- ============================================================
-- Shopping Lists Queries
-- ============================================================

-- name: get_user_lists
SELECT sl.list_id, sl.name, sl.estimated_total,
       COUNT(li.list_item_id) AS items_count,
       sl.created_at, sl.updated_at
FROM shopping_lists sl
LEFT JOIN list_items li ON sl.list_id = li.list_id
WHERE sl.user_id = %s
GROUP BY sl.list_id
ORDER BY sl.updated_at DESC;

-- name: verify_ownership
SELECT list_id, name
FROM shopping_lists
WHERE list_id = %s AND user_id = %s;

-- name: get_items_with_product_info
SELECT li.list_item_id, pv.product_id, p.name AS product_name,
       p.icon, li.variant_id, li.quantity,
       li.is_purchased, li.purchased_at
FROM list_items li
INNER JOIN product_variants pv ON li.variant_id = pv.variant_id
INNER JOIN products p ON pv.product_id = p.product_id
WHERE li.list_id = %s;

-- name: get_best_prices_for_products
-- Note: {placeholders} is dynamically replaced with %s,%s,... at runtime
SELECT pv.product_id, r.name AS store, r.color AS store_color,
       pr.unit_price, CONCAT('per ', u.name) AS unit
FROM price_records pr
INNER JOIN (
    SELECT variant_id, MAX(record_id) AS latest_record_id
    FROM price_records GROUP BY variant_id
) latest ON pr.record_id = latest.latest_record_id
INNER JOIN product_variants pv ON pr.variant_id = pv.variant_id
INNER JOIN retailers r ON pv.retailer_id = r.retailer_id
INNER JOIN units u ON pv.unit_id = u.unit_id
WHERE pv.product_id IN ({placeholders})
ORDER BY pv.product_id, pr.unit_price ASC;

-- name: get_store_prices_for_products
-- Note: {placeholders} is dynamically replaced with %s,%s,... at runtime
SELECT pv.product_id, r.name AS store, pr.price
FROM price_records pr
INNER JOIN (
    SELECT variant_id, MAX(record_id) AS latest_record_id
    FROM price_records GROUP BY variant_id
) latest ON pr.record_id = latest.latest_record_id
INNER JOIN product_variants pv ON pr.variant_id = pv.variant_id
INNER JOIN retailers r ON pv.retailer_id = r.retailer_id
WHERE pv.product_id IN ({placeholders});

-- name: insert_list
INSERT INTO shopping_lists (user_id, name) VALUES (%s, %s);

-- name: insert_item
-- TRANSACTION step 1: insert item
INSERT INTO list_items (list_id, variant_id, quantity)
VALUES (%s, %s, %s);

-- name: update_estimated_total
-- TRANSACTION step 2: update shopping list estimated_total using latest price
UPDATE shopping_lists
SET estimated_total = estimated_total + (
    SELECT pr.price * %s
    FROM price_records pr
    INNER JOIN (
        SELECT variant_id, MAX(record_id) AS latest_record_id
        FROM price_records
        WHERE variant_id = %s
        GROUP BY variant_id
    ) latest ON pr.record_id = latest.latest_record_id
)
WHERE list_id = %s;

-- name: get_estimated_total
SELECT estimated_total FROM shopping_lists WHERE list_id = %s;

-- name: verify_item_ownership
SELECT li.list_item_id
FROM list_items li
INNER JOIN shopping_lists sl ON li.list_id = sl.list_id
WHERE li.list_item_id = %s AND li.list_id = %s AND sl.user_id = %s;

-- name: get_item_after_update
SELECT list_item_id, is_purchased, purchased_at
FROM list_items
WHERE list_item_id = %s;
