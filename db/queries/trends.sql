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
SELECT sp.pattern_id, sp.event_name, sp.typical_month,
       r.name AS retailer, sp.avg_discount_pct,
       sp.confidence_score
FROM seasonal_patterns sp
INNER JOIN retailers r ON sp.retailer_id = r.retailer_id
WHERE sp.product_id = %s;

-- name: get_pattern_years
-- Get year-by-year evidence for seasonal patterns of a product
SELECT spy.pattern_id, spy.year, spy.observed_discount
FROM seasonal_pattern_years spy
INNER JOIN seasonal_patterns sp ON spy.pattern_id = sp.pattern_id
WHERE sp.product_id = %s
ORDER BY spy.pattern_id, spy.year;
