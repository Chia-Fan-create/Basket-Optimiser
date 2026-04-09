-- ============================================================
-- Products Queries
-- ============================================================

-- name: get_all_with_category
SELECT p.product_id AS id, p.name, p.icon,
       c.name AS category
FROM products p
LEFT JOIN categories c ON p.category_id = c.category_id
ORDER BY p.product_id;
