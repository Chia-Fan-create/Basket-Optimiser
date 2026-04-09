-- ============================================================
-- Price Trends Queries
-- ============================================================

-- name: get_monthly_avg_by_retailer
-- Get monthly average unit price by retailer for a product
SELECT DATE_FORMAT(pr.scraped_at, '%%b') AS month_label,
       YEAR(pr.scraped_at) AS yr,
       MONTH(pr.scraped_at) AS mo,
       r.name AS retailer,
       ROUND(AVG(pr.unit_price), 2) AS avg_price
FROM price_records pr
INNER JOIN product_variants pv ON pr.variant_id = pv.variant_id
INNER JOIN retailers r ON pv.retailer_id = r.retailer_id
WHERE pv.product_id = %s
GROUP BY yr, mo, month_label, r.name
ORDER BY yr, mo;

-- name: get_seasonal_patterns
-- Get seasonal discount patterns for a product
SELECT sp.typical_month, r.name AS retailer,
       sp.avg_discount_pct
FROM seasonal_patterns sp
INNER JOIN retailers r ON sp.retailer_id = r.retailer_id
WHERE sp.product_id = %s;
