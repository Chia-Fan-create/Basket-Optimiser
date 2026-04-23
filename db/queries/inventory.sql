-- ============================================================
-- Inventory Queries
-- ============================================================

-- name: get_user_inventory
SELECT ii.inventory_id, ii.product_id, p.name AS product_name,
       ii.quantity, ii.purchase_date,
       ii.consumption_days_per_unit, ii.depletion_date, ii.is_dismissed
FROM inventory_items ii
INNER JOIN products p ON ii.product_id = p.product_id
WHERE ii.user_id = %s
ORDER BY ii.depletion_date ASC;

-- name: get_unit_abbreviation
SELECT u.abbreviation
FROM product_variants pv
INNER JOIN units u ON pv.unit_id = u.unit_id
WHERE pv.product_id = %s
LIMIT 1;

-- name: check_existing
SELECT inventory_id
FROM inventory_items
WHERE user_id = %s AND product_id = %s;

-- name: update_existing
-- Add to existing quantity and recalculate depletion from today
UPDATE inventory_items
SET quantity = quantity + %s, purchase_date = %s,
    consumption_days_per_unit = %s, depletion_date = %s, is_dismissed = FALSE
WHERE inventory_id = %s;

-- name: get_existing_quantity
SELECT quantity FROM inventory_items WHERE inventory_id = %s;

-- name: insert_new
INSERT INTO inventory_items
    (user_id, product_id, quantity, purchase_date, consumption_days_per_unit, depletion_date)
VALUES (%s, %s, %s, %s, %s, %s);

-- name: dismiss
UPDATE inventory_items
SET is_dismissed = TRUE
WHERE inventory_id = %s AND user_id = %s;

-- name: delete_item
DELETE FROM inventory_items
WHERE inventory_id = %s AND user_id = %s;
