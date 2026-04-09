-- ============================================================
-- Price Comparison Queries
-- ============================================================

-- name: get_top5_cheapest
-- Get top 5 cheapest variants for a product, sorted by unit price
-- Tables: price_records, product_variants, products, retailers, units, brands
SELECT
    pv.variant_id,
    CONCAT(b.name, ' ', p.name, ' ', pv.pack_size, ' ', u.abbreviation) AS product,
    r.name   AS store,
    r.color  AS storeColor,
    pr.unit_price AS unitPrice,
    CONCAT('per ', u.name) AS unit,
    pr.price AS totalPrice,
    CONCAT(pv.pack_size, ' ', u.abbreviation) AS originalPack,
    COALESCE(pv.url, r.base_url) AS url
FROM price_records pr
INNER JOIN (
    SELECT variant_id, MAX(record_id) AS latest_record_id
    FROM price_records
    GROUP BY variant_id
) latest ON pr.record_id = latest.latest_record_id
INNER JOIN product_variants pv ON pr.variant_id = pv.variant_id
INNER JOIN products p ON pv.product_id = p.product_id
INNER JOIN retailers r ON pv.retailer_id = r.retailer_id
INNER JOIN units u ON pv.unit_id = u.unit_id
LEFT JOIN brands b ON p.brand_id = b.brand_id
WHERE pv.product_id = %s
ORDER BY pr.unit_price ASC
LIMIT 5;
