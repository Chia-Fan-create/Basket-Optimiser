-- ============================================================
-- Spending Insight Queries
-- ============================================================

-- name: spending_cte
-- Shared subquery for spending analytics: aggregate by user, month, category
-- Now reads from purchases + purchase_items (price snapshot at purchase time)
-- instead of list_items + price_records (which get deleted on Clear)
SELECT
    p.user_id,
    YEAR(p.purchased_at)  AS purchase_year,
    MONTH(p.purchased_at) AS purchase_month,
    c.name AS category_name,
    COUNT(pi.item_id) AS items_bought,
    SUM(pi.price * pi.quantity) AS total_spent
FROM purchase_items pi
INNER JOIN purchases p ON pi.purchase_id = p.purchase_id
INNER JOIN products prod ON pi.product_id = prod.product_id
LEFT JOIN categories c ON prod.category_id = c.category_id
GROUP BY p.user_id, purchase_year, purchase_month, c.name;

-- name: get_monthly
-- Note: {spending_cte} is replaced by spending_cte content at runtime
SELECT purchase_month AS mo, purchase_year AS yr,
       SUM(total_spent) AS amount
FROM ({spending_cte}) AS spending
WHERE user_id = %s
GROUP BY purchase_year, purchase_month
ORDER BY purchase_year DESC, purchase_month DESC
LIMIT %s;

-- name: get_by_category
-- Note: {spending_cte} is replaced by spending_cte content at runtime
SELECT category_name AS category, SUM(total_spent) AS amount
FROM ({spending_cte}) AS spending
WHERE user_id = %s
  AND (purchase_year * 100 + purchase_month) >= (
      SELECT MAX(s2.purchase_year * 100 + s2.purchase_month) - %s
      FROM ({spending_cte}) AS s2 WHERE s2.user_id = %s
  )
GROUP BY category_name
ORDER BY amount DESC;

-- name: get_summary_months
-- Note: {spending_cte} is replaced by spending_cte content at runtime
SELECT purchase_year AS yr, purchase_month AS mo,
       SUM(total_spent) AS amount
FROM ({spending_cte}) AS spending
WHERE user_id = %s
GROUP BY purchase_year, purchase_month
ORDER BY purchase_year DESC, purchase_month DESC
LIMIT 6;

-- name: get_top_category
-- Note: {spending_cte} is replaced by spending_cte content at runtime
SELECT category_name, SUM(total_spent) AS amount
FROM ({spending_cte}) AS spending
WHERE user_id = %s
GROUP BY category_name
ORDER BY amount DESC
LIMIT 1;

-- name: get_purchase_history
-- List all purchases for a user (most recent first)
SELECT p.purchase_id, p.purchased_at, p.total_amount, p.store,
       (SELECT COUNT(*) FROM purchase_items pi WHERE pi.purchase_id = p.purchase_id) AS item_count
FROM purchases p
WHERE p.user_id = %s
ORDER BY p.purchased_at DESC;

-- name: get_purchase_detail
-- Get items for a specific purchase
SELECT pi.item_id, pi.product_id, prod.name AS product_name,
       pi.quantity, pi.price, pi.unit_price,
       c.name AS category
FROM purchase_items pi
INNER JOIN products prod ON pi.product_id = prod.product_id
LEFT JOIN categories c ON prod.category_id = c.category_id
WHERE pi.purchase_id = %s
ORDER BY prod.name;
