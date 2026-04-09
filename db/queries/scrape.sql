-- ============================================================
-- Scrape Job Queries (尚未實作)
-- ============================================================

-- name: insert_job
-- TODO: 新增爬蟲 job 記錄
-- INSERT INTO scrape_jobs (retailer_id, status, items_scraped)
-- VALUES (%s, 'running', 0);

-- name: update_job_success
-- TODO: 更新 job 狀態為成功
-- UPDATE scrape_jobs
-- SET status = 'success', completed_at = NOW(), items_scraped = %s
-- WHERE job_id = %s;

-- name: update_job_failed
-- TODO: 更新 job 狀態為失敗
-- UPDATE scrape_jobs
-- SET status = 'failed', completed_at = NOW(), error_message = %s
-- WHERE job_id = %s;

-- name: insert_price_record
-- TODO: 插入新的價格記錄
-- INSERT INTO price_records (variant_id, price, unit_price, scraped_at, scrape_job_id)
-- VALUES (%s, %s, %s, NOW(), %s);

-- name: check_triggered_alerts
-- TODO: 檢查是否有警報被觸發（目前最低價 ≤ 目標價）
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
-- TODO: 標記警報為已觸發
-- UPDATE price_alerts
-- SET triggered_at = NOW()
-- WHERE alert_id = %s;
