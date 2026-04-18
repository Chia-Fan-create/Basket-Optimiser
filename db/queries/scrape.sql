-- ============================================================
-- Scrape Job Queries
-- ============================================================

-- name: get_all_retailers
SELECT retailer_id FROM retailers;

-- name: get_variants_by_retailer
SELECT pv.variant_id, pv.product_id
FROM product_variants pv
WHERE pv.retailer_id = %s;

-- name: get_latest_price
SELECT price, unit_price
FROM price_records
WHERE variant_id = %s
ORDER BY record_id DESC
LIMIT 1;

-- name: insert_job
INSERT INTO scrape_jobs (retailer_id, status, items_scraped)
VALUES (%s, 'running', 0);

-- name: update_job_success
UPDATE scrape_jobs
SET status = 'success', completed_at = NOW(), items_scraped = %s
WHERE job_id = %s;

-- name: update_job_failed
UPDATE scrape_jobs
SET status = 'failed', completed_at = NOW(), error_message = %s
WHERE job_id = %s;

-- name: insert_price_record
INSERT INTO price_records (variant_id, price, unit_price, scrape_job_id)
VALUES (%s, %s, %s, %s);

-- name: insert_failure
INSERT INTO scrape_failures (scrape_job_id, variant_id, error_message)
VALUES (%s, %s, %s);

-- name: check_triggered_alerts
-- Find active alerts where current lowest price <= target price
SELECT pa.alert_id, pa.user_id, pa.product_id, pa.target_price
FROM price_alerts pa
WHERE pa.is_active = TRUE
  AND pa.triggered_at IS NULL
  AND pa.target_price >= (
      SELECT MIN(pr.unit_price)
      FROM price_records pr
      INNER JOIN product_variants pv ON pr.variant_id = pv.variant_id
      INNER JOIN (
          SELECT variant_id, MAX(record_id) AS latest
          FROM price_records GROUP BY variant_id
      ) l ON pr.record_id = l.latest
      WHERE pv.product_id = pa.product_id
  );

-- name: trigger_alert
UPDATE price_alerts
SET triggered_at = NOW()
WHERE alert_id = %s;
