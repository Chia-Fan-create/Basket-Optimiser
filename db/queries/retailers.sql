-- ============================================================
-- Retailers Queries
-- ============================================================

-- name: get_all
SELECT retailer_id AS id, name, color, logo_url, base_url
FROM retailers
ORDER BY retailer_id;
