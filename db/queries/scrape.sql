-- ============================================================
-- Scrape Job Queries (not yet implemented)
-- ============================================================

-- name: insert_job
-- TODO: Insert a new scrape job record
-- INSERT INTO scrape_jobs (retailer_id, status, items_scraped)
-- VALUES (%s, 'running', 0);

-- name: update_job_success
-- TODO: Update job status to success
-- UPDATE scrape_jobs
-- SET status = 'success', completed_at = NOW(), items_scraped = %s
-- WHERE job_id = %s;

-- name: update_job_failed
-- TODO: Update job status to failed
-- UPDATE scrape_jobs
-- SET status = 'failed', completed_at = NOW(), error_message = %s
-- WHERE job_id = %s;

-- name: insert_price_record
-- TODO: Insert a new price record
-- INSERT INTO price_records (variant_id, price, unit_price, scraped_at, scrape_job_id)
-- VALUES (%s, %s, %s, NOW(), %s);

-- name: check_triggered_alerts
-- TODO: Check if any alerts are triggered (current lowest price <= target price)
-- SELECT pa.alert_id, pa.user_id, pa.product_id, pa.target_price
-- FROM price_alerts pa
-- WHERE pa.is_active = TRUE
--   AND pa.triggered_at IS NULL
--   AND pa.target_price >= (
--       SELECT MIN(pr.unit_price)
--       FROM price_records pr
--       INNER JOIN product_variants pv ON pr.variant_id = pv.variant_id
--       WHERE pv.product_id = pa.product_id
--         AND pr.scrape_job_id = %s
--   );

-- name: trigger_alert
-- TODO: Mark an alert as triggered
-- UPDATE price_alerts
-- SET triggered_at = NOW()
-- WHERE alert_id = %s;
