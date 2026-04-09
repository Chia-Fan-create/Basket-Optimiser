-- ============================================================
-- Spending Insight Queries
-- ============================================================

-- name: spending_cte
-- 消費分析的共用子查詢：按使用者、月份、分類彙總消費金額
-- 此區塊被 monthly、categories、summary 查詢引用
SELECT
    sl.user_id,
    YEAR(li.purchased_at)  AS purchase_year,
    MONTH(li.purchased_at) AS purchase_month,
    c.name AS category_name,
    COUNT(li.list_item_id) AS items_bought,
    SUM(pr.price * li.quantity) AS total_spent
FROM list_items li
INNER JOIN shopping_lists sl ON li.list_id = sl.list_id
INNER JOIN product_variants pv ON li.variant_id = pv.variant_id
INNER JOIN products p ON pv.product_id = p.product_id
LEFT JOIN categories c ON p.category_id = c.category_id
INNER JOIN (
    SELECT variant_id, MAX(record_id) AS latest_record_id
    FROM price_records
    GROUP BY variant_id
) latest ON pv.variant_id = latest.variant_id
INNER JOIN price_records pr ON pr.record_id = latest.latest_record_id
WHERE li.is_purchased = TRUE
  AND li.purchased_at IS NOT NULL
GROUP BY sl.user_id, purchase_year, purchase_month, c.name;

-- name: get_monthly
-- 注意：{spending_cte} 在 Python 中替換為上方的 spending_cte 內容
SELECT purchase_month AS mo, purchase_year AS yr,
       SUM(total_spent) AS amount
FROM ({spending_cte}) AS spending
WHERE user_id = %s
GROUP BY purchase_year, purchase_month
ORDER BY purchase_year DESC, purchase_month DESC
LIMIT %s;

-- name: get_by_category
-- 注意：{spending_cte} 在 Python 中替換為 spending_cte 內容
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
-- 注意：{spending_cte} 在 Python 中替換為 spending_cte 內容
SELECT purchase_year AS yr, purchase_month AS mo,
       SUM(total_spent) AS amount
FROM ({spending_cte}) AS spending
WHERE user_id = %s
GROUP BY purchase_year, purchase_month
ORDER BY purchase_year DESC, purchase_month DESC
LIMIT 6;

-- name: get_top_category
-- 注意：{spending_cte} 在 Python 中替換為 spending_cte 內容
SELECT category_name, SUM(total_spent) AS amount
FROM ({spending_cte}) AS spending
WHERE user_id = %s
GROUP BY category_name
ORDER BY amount DESC
LIMIT 1;
