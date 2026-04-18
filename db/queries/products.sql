-- ============================================================
-- Products Queries
-- ============================================================

-- name: get_all_with_category
SELECT p.product_id AS id, p.name,
       c.name AS category,
       p.default_consumption_days_per_unit
FROM products p
LEFT JOIN categories c ON p.category_id = c.category_id
ORDER BY p.product_id;
