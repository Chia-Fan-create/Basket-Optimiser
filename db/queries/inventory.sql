-- ============================================================
-- Inventory Queries
-- ============================================================

-- name: get_user_inventory
SELECT ii.inventory_id, ii.product_id, p.name AS product_name,
       p.icon, ii.quantity, ii.purchase_date,
       ii.consumption_days, ii.depletion_date, ii.dismissed
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
UPDATE inventory_items
SET quantity = %s, purchase_date = %s,
    consumption_days = %s, depletion_date = %s, dismissed = FALSE
WHERE inventory_id = %s;

-- name: insert_new
INSERT INTO inventory_items
    (user_id, product_id, quantity, purchase_date, consumption_days, depletion_date)
VALUES (%s, %s, %s, %s, %s, %s);

-- name: dismiss
UPDATE inventory_items
SET dismissed = TRUE
WHERE inventory_id = %s AND user_id = %s;
