# SmartCart — 前端 End-to-End 測試指南

SmartCart 是一個比價購物網站，讓使用者比較 Amazon、Target、Walmart 三家零售商的商品價格。前端用 React 18，後端用 Flask + PyMySQL（raw SQL），資料庫是遠端 MySQL。

---

## 環境準備

### 前置需求

- Python 3.10+
- Node.js 16+
- MySQL client（用來直接查資料庫驗證）

### 1. 啟動後端

```bash
cd backend
source venv/bin/activate
python app.py
```

後端 port 由 `backend/.env` 裡的 `FLASK_PORT` 決定（預設 5000）。前端 proxy 目前指向 `http://127.0.0.1:50123`（在 `front-end/package.json`），兩邊要對上。

> **macOS 注意：** AirPlay Receiver 預設佔用 port 5000，建議在 `.env` 設定 `FLASK_PORT=50123` 或關掉 AirPlay。

### 2. 啟動前端

```bash
cd front-end
npm start    # http://localhost:3000
```

### 3. 確認 USE_MOCK = false

打開 `front-end/src/api/index.js` 第 15 行，確認是：

```javascript
const USE_MOCK = false;
```

這樣前端所有 API 呼叫都會打到真實後端，資料來自 MySQL 資料庫。

### 4. 連線 MySQL

```bash
用 mysqlworkbench 連線到 mysql
```

密碼在 `backend/.env` 的 `DB_PASSWORD`。測試過程中保持這個 terminal 開著，隨時用 SQL 驗證資料。

### 測試帳號

所有 demo 使用者的密碼都是 `password123`：

| 帳號 | 姓名 |
|------|------|
| alex.lee@example.com | Alex Lee |
| maria.chen@example.com | Maria Chen |
| sam.patel@example.com | Sam Patel |
| jordan.kim@example.com | Jordan Kim |
| taylor.nguyen@example.com | Taylor Nguyen |

---

## E2E 測試流程

> **使用方式：** 把下面整段 SQL 複製貼到 MySQL Workbench。註解裡包含完整的瀏覽器操作步驟和預期結果。從頭到尾順著看，遇到 `👉` 就去瀏覽器操作，操作完選取下方的 SQL 按 ⌘+Enter 驗證 DB。
>
> **測試原則：**
> - 每次測試**建立一個全新帳號**，確保乾淨的起始狀態
> - 所有 SQL 查詢都用 `@test_uid` 變數，不需手動替換 user_id
> - 測試完畢刪除帳號，所有資料自動 CASCADE 清除，不影響其他人

```sql
-- ============================================================
-- SmartCart E2E 測試 — 完整流程
-- ============================================================
-- 前提：後端跑在 localhost:50123，前端跑在 localhost:3000
--       USE_MOCK = false，MySQL Workbench 已連線
-- ============================================================


-- ══════════════════════════════════════════════════════════════
-- UC7 — 註冊新帳號
-- ══════════════════════════════════════════════════════════════
-- 👉 瀏覽器操作：
--    1. 進入 http://localhost:3000/login
--    2. 切換到 Register
--    3. Email: e2e.test@example.com
--       Password: password123
--       Display Name: E2E Test
--    4. 點 Register → 自動登入，跳轉到 Dashboard
--    5. F5 重新整理 → 確認沒被登出（JWT session 保持）
-- ──────────────────────────────────────────────────────────────

SELECT user_id, email, display_name, created_at
FROM users WHERE email = 'e2e.test@example.com';
-- ✅ 1 筆，password_hash 是 $2b$ 開頭（bcrypt）

SET @test_uid = (SELECT user_id FROM users WHERE email = 'e2e.test@example.com');
SELECT @test_uid;
-- ✅ 有值（記住這個數字，後面全部用 @test_uid）


-- ══════════════════════════════════════════════════════════════
-- UC9 — 設定喜好商品（Favorites）
-- ══════════════════════════════════════════════════════════════
-- 👉 瀏覽器操作：
--    1. Dashboard 點 edit → 進入 /select
--    2. 勾選：Whole Milk、Sparkling Water、Ground Coffee、Ice Cream
--    3. 點「See my dashboard →」儲存
--    4. 確認 Dashboard 顯示 4 個商品卡片
--    5. F5 重新整理 → 確認 4 個仍在
-- ──────────────────────────────────────────────────────────────

SELECT uf.product_id, p.name
FROM user_favorites uf
INNER JOIN products p ON uf.product_id = p.product_id
WHERE uf.user_id = @test_uid
ORDER BY uf.product_id;
-- ✅ 4 筆：1 Whole Milk, 5 Sparkling Water, 6 Ground Coffee, 17 Ice Cream

-- 👉 瀏覽器操作：
--    6. 再進 /select → 取消 Sparkling Water → 儲存
--    7. F5 確認只剩 3 個
-- ──────────────────────────────────────────────────────────────

SELECT uf.product_id, p.name
FROM user_favorites uf
INNER JOIN products p ON uf.product_id = p.product_id
WHERE uf.user_id = @test_uid
ORDER BY uf.product_id;
-- ✅ 3 筆：1, 6, 17（Sparkling Water 已移除）

-- 👉 瀏覽器操作：
--    8. 再進 /select → 把 Sparkling Water 加回來 → 儲存
--       （後面 UC8 需要看 Sparkling Water 趨勢）
-- ──────────────────────────────────────────────────────────────

SELECT uf.product_id, p.name
FROM user_favorites uf
INNER JOIN products p ON uf.product_id = p.product_id
WHERE uf.user_id = @test_uid
ORDER BY uf.product_id;
-- ✅ 4 筆：1, 5, 6, 17（回到 4 個）


-- ══════════════════════════════════════════════════════════════
-- UC1 — 商品比價
-- ══════════════════════════════════════════════════════════════
-- 👉 瀏覽器操作：
--    1. 進入 /compare
--    2. 點 Whole Milk tab
--    3. 確認 3 筆結果，按 unit price 由低到高
--    4. 第 1 名標示 BEST VALUE
--    5. 確認頁面上沒有「+ List」按鈕（已移除）
-- ──────────────────────────────────────────────────────────────

SELECT r.name AS store, pr.price, pr.unit_price
FROM price_records pr
INNER JOIN (
    SELECT variant_id, MAX(record_id) AS latest
    FROM price_records GROUP BY variant_id
) l ON pr.record_id = l.latest
INNER JOIN product_variants pv ON pr.variant_id = pv.variant_id
INNER JOIN retailers r ON pv.retailer_id = r.retailer_id
WHERE pv.product_id = 1
ORDER BY pr.unit_price ASC;
-- ✅ 順序：Amazon（最便宜）→ Walmart → Target
-- ✅ 前端第 1 名 = SQL 第 1 筆，價格完全一致


-- ══════════════════════════════════════════════════════════════
-- UC8 — 價格趨勢與季節性預測
-- ══════════════════════════════════════════════════════════════
-- 👉 瀏覽器操作：
--    1. 進入 /trends → 點 Ice Cream tab
--    2. 確認圖表 x 軸有 May → Apr 共 12 個月
--    3. 確認 3 條實線 (Amazon 橘/Target 紅/Walmart 藍) + 虛線 (Predicted 灰)
--    4. hover 數據點 → tooltip 顯示 retailer、價格、月份
--    5. 目視確認：夏天 (Jun-Aug) 線段偏高、冬天 (Nov-Jan) 偏低
--    6. 圖表下方 Seasonal Patterns 卡片：
--       - Prime Day Ice Cream (Amazon, Jul) 12.0% off — 2023:8.5%, 2024:13.1%, 2025:14.4%
--       - Ice Cream Season End (Walmart, Oct) 15.6% off — 2023:12.3%, 2024:16.8%, 2025:17.7%
--    7. 換 Sparkling Water tab → 確認趨勢相反（夏天低、冬天高）
-- ──────────────────────────────────────────────────────────────

SELECT DATE_FORMAT(pr.scraped_at, '%Y-%m') AS month,
       r.name AS retailer,
       ROUND(AVG(pr.unit_price), 4) AS avg_unit_price
FROM price_records pr
INNER JOIN product_variants pv ON pr.variant_id = pv.variant_id
INNER JOIN retailers r ON pv.retailer_id = r.retailer_id
WHERE pv.product_id = 17
GROUP BY YEAR(pr.scraped_at), MONTH(pr.scraped_at), month, r.name
ORDER BY month, r.name;
-- ✅ ~12 個月的資料
-- ✅ Walmart Jul (~0.12) > Nov (~0.10) = 夏高冬低

SELECT sp.event_name, sp.typical_month, sp.avg_discount_pct,
       r.name AS retailer, sp.confidence_score
FROM seasonal_patterns sp
INNER JOIN retailers r ON sp.retailer_id = r.retailer_id
WHERE sp.product_id = 17;
-- ✅ 2 筆 pattern

SELECT spy.pattern_id, spy.year, spy.observed_discount
FROM seasonal_pattern_years spy
INNER JOIN seasonal_patterns sp ON spy.pattern_id = sp.pattern_id
WHERE sp.product_id = 17
ORDER BY spy.pattern_id, spy.year;
-- ✅ 每個 pattern 有 2023/2024/2025 三年觀測折扣


-- ══════════════════════════════════════════════════════════════
-- UC2 — 購物清單管理
-- ══════════════════════════════════════════════════════════════
-- 👉 瀏覽器操作：
--    1. 進入 /lists → 確認是空的（新帳號）
--    2. 點 + New List → 輸入「E2E Test List」→ 建立
-- ──────────────────────────────────────────────────────────────

SELECT list_id, name, estimated_total, created_at
FROM shopping_lists WHERE user_id = @test_uid;
-- ✅ 1 筆

SET @test_list = (SELECT list_id FROM shopping_lists
                  WHERE user_id = @test_uid ORDER BY created_at DESC LIMIT 1);

-- 👉 瀏覽器操作：
--    3. 點 + Add Item → 搜尋 milk → 點選 Whole Milk（自動加入 qty 1）
--    4. 再搜尋 granola → 點選 Granola Bars（qty 1）
--    5. 關閉搜尋 modal → 確認顯示 Cheapest Store、各家總價、Savings
-- ──────────────────────────────────────────────────────────────

SELECT li.list_item_id, pv.product_id, p.name, li.quantity, li.variant_id
FROM list_items li
INNER JOIN product_variants pv ON li.variant_id = pv.variant_id
INNER JOIN products p ON pv.product_id = p.product_id
WHERE li.list_id = @test_list;
-- ✅ 2 筆：Whole Milk + Granola Bars

SELECT list_id, name, estimated_total
FROM shopping_lists WHERE list_id = @test_list;
-- ✅ estimated_total > 0

-- 👉 瀏覽器操作：
--    6. 點 Granola Bars 旁的 ✕ 刪除
-- ──────────────────────────────────────────────────────────────

SELECT COUNT(*) AS item_count FROM list_items WHERE list_id = @test_list;
-- ✅ 1（Granola Bars 已刪）

SELECT estimated_total FROM shopping_lists WHERE list_id = @test_list;
-- ✅ 扣掉了 Granola Bars 的價格

-- 👉 瀏覽器操作：
--    7. 勾選 Whole Milk 的 checkbox（標記已購買）
-- ──────────────────────────────────────────────────────────────

SELECT list_item_id, is_purchased, purchased_at
FROM list_items WHERE list_id = @test_list;
-- ✅ is_purchased = 1, purchased_at 有值

-- 👉 瀏覽器操作：
--    8. 點 Process Purchased Items → 確認商品正確 → Confirm & Save
-- ──────────────────────────────────────────────────────────────

SELECT ii.inventory_id, p.name, ii.quantity, ii.depletion_date
FROM inventory_items ii
INNER JOIN products p ON ii.product_id = p.product_id
WHERE ii.user_id = @test_uid;
-- ✅ Whole Milk 已自動加入 inventory

-- 👉 瀏覽器操作：
--    9. 成功畫面 → Done — Clear purchased items → 清單項目被清空，但清單名還在
-- ──────────────────────────────────────────────────────────────

SELECT COUNT(*) AS remaining_items FROM list_items WHERE list_id = @test_list;
-- ✅ 0

SELECT list_id, name, estimated_total FROM shopping_lists WHERE list_id = @test_list;
-- ✅ 清單 row 還在，estimated_total = 0


-- ══════════════════════════════════════════════════════════════
-- UC6 — 家庭庫存追蹤
-- ══════════════════════════════════════════════════════════════
-- ⚠️ UC2 的 Process 已經把 Whole Milk 加進 inventory，所以不會是空的
--
-- 👉 瀏覽器操作：
--    1. 進入 /inventory → 確認已有 Whole Milk（UC2 時加的）
--    2. 點 + Add Item → 搜尋 coffee → 選 Ground Coffee
--       Quantity: 2, Days per unit: 自動帶入 7 → Save
--    3. 確認列表出現 Ground Coffee qty=2
-- ──────────────────────────────────────────────────────────────

SELECT ii.inventory_id, p.name, ii.quantity,
       ii.purchase_date, ii.depletion_date, ii.is_dismissed,
       DATEDIFF(ii.depletion_date, ii.purchase_date) AS total_days
FROM inventory_items ii
INNER JOIN products p ON ii.product_id = p.product_id
WHERE ii.user_id = @test_uid
ORDER BY p.name;
-- ✅ Ground Coffee qty=2, total_days=14 + Whole Milk（UC2 的）

-- 👉 瀏覽器操作：
--    4. 再加一次 Ground Coffee（qty=1）→ 確認仍只有一筆，qty 變 3
-- ──────────────────────────────────────────────────────────────

SELECT COUNT(*) AS row_count
FROM inventory_items
WHERE user_id = @test_uid AND product_id = 6;
-- ✅ 1（不是 2，UPSERT 成功）

SELECT ii.inventory_id, p.name, ii.quantity,
       DATEDIFF(ii.depletion_date, ii.purchase_date) AS total_days
FROM inventory_items ii
INNER JOIN products p ON ii.product_id = p.product_id
WHERE ii.user_id = @test_uid AND ii.product_id = 6;
-- ✅ quantity=3, total_days=21 (3 × 7)

-- 👉 瀏覽器操作：
--    5. 測試 Dismiss → 加一個快到期的商品：
--       搜尋 pasta → 選 Pasta → Quantity: 1, Days per unit: 改成 1 → Save
--    6. Pasta 出現在 Running Low 區塊（因為明天就到期）
--       旁邊有 Dismiss 和 + Add to List 按鈕
--    7. 點 Dismiss → Pasta 從 Running Low 消失
--    8. （+ Add to List 只會導到 /lists，不會自動帶入商品 — 已知設計）
-- ──────────────────────────────────────────────────────────────

SELECT ii.inventory_id, p.name, ii.is_dismissed
FROM inventory_items ii
INNER JOIN products p ON ii.product_id = p.product_id
WHERE ii.user_id = @test_uid
ORDER BY p.name;
-- ✅ Pasta: is_dismissed=1，Ground Coffee 和 Whole Milk: is_dismissed=0


-- ══════════════════════════════════════════════════════════════
-- UC3 — 價格警報
-- ══════════════════════════════════════════════════════════════
-- 👉 瀏覽器操作：
--    1. 進入 /alerts
--    2. 新增警報 #1：選 Whole Milk，目標價填 0.08
--       （高於目前最低價 ~$0.059，會立即觸發）
--    3. 確認出現在 Triggered 區塊（✅ 綠色）
--    4. 新增警報 #2：選 Ice Cream，目標價填 0.01
--       （遠低於目前價，不會觸發）
--    5. 確認出現在 Active 區塊（進度條）
-- ──────────────────────────────────────────────────────────────

SELECT pa.alert_id, p.name, pa.target_price, pa.is_active, pa.triggered_at
FROM price_alerts pa
INNER JOIN products p ON pa.product_id = p.product_id
WHERE pa.user_id = @test_uid;
-- ✅ Whole Milk target=0.08 → triggered
-- ✅ Ice Cream target=0.01 → NOT triggered

SELECT MIN(pr.unit_price) AS current_lowest
FROM price_records pr
INNER JOIN (
    SELECT variant_id, MAX(record_id) AS latest
    FROM price_records GROUP BY variant_id
) l ON pr.record_id = l.latest
INNER JOIN product_variants pv ON pr.variant_id = pv.variant_id
WHERE pv.product_id = 1;
-- ✅ ~0.059 < 0.08 → 正確觸發

-- 👉 瀏覽器操作：
--    6. 刪除 Ice Cream 的警報（點 ✕）
-- ──────────────────────────────────────────────────────────────

SELECT COUNT(*) FROM price_alerts WHERE user_id = @test_uid;
-- ✅ 1（只剩 Whole Milk）


-- ══════════════════════════════════════════════════════════════
-- 模擬爬蟲 — POST /api/admin/scrape
-- ══════════════════════════════════════════════════════════════
-- 👉 瀏覽器操作：
--    1. 進入 /select → 勾選全部 17 個商品 → 儲存
--       （讓 scrape 的 forced_drops 一定命中 favorites，保證觸發 Smart Alerts）
--
-- 👉 終端機操作：
--    2. 跑 curl -X POST http://localhost:50123/api/admin/scrape
--    3. 確認回傳 JSON：
--       - success: true
--       - prices_recorded: ~50
--       - jobs_created: 3
--       - forced_drops: 6 筆（2 個商品 × 3 家 retailer，降幅 25-35%）
--       - alerts_triggered: >= 1
--    4. ⚠️ 記下 forced_drops 裡的 product_id，UC4 會用到
-- ──────────────────────────────────────────────────────────────

SELECT job_id, retailer_id, status, items_scraped
FROM scrape_jobs ORDER BY job_id DESC LIMIT 3;
-- ✅ 3 筆 status='success', items_scraped ≈ 17

SELECT COUNT(*) AS new_prices
FROM price_records
WHERE scrape_job_id >= (SELECT MAX(job_id) - 2 FROM scrape_jobs);
-- ✅ ~50 筆

-- 爬蟲失敗記錄（F6 反饋：scrape_failures 表）
SELECT failure_id, variant_id, error_message
FROM scrape_failures ORDER BY failure_id DESC LIMIT 5;
-- ✅ 如果 failures > 0，這裡有 HTTP 503, CAPTCHA 等錯誤

SELECT pa.alert_id, p.name, pa.target_price, pa.triggered_at
FROM price_alerts pa
INNER JOIN products p ON pa.product_id = p.product_id
WHERE pa.user_id = @test_uid;
-- ✅ Whole Milk 的 triggered_at 有值（scrape 觸發了它）


-- ══════════════════════════════════════════════════════════════
-- UC4 — 智慧警報（Smart Alerts）
-- ══════════════════════════════════════════════════════════════
-- 👉 瀏覽器操作：
--    1. F5 重整 /alerts（必須重整才會觸發偵測）
--    2. 確認 Whole Milk alert 顯示 Triggered（✅ 綠色）
--    3. 滾到下方 Smart Alerts 區塊（⚡ 圖示）
--       → 因為已把全部商品加到 favorites，forced_drops 的商品一定在裡面
--       → 應該能看到 Smart Alert 卡片
--    4. 每張卡片確認：商品名、降幅 %、目前價格、零售商
--       + 「Deal still valid」或「Price recovered」文字
--    5. 比對終端機 forced_drops 的 product_id → 前端商品名一致
-- ──────────────────────────────────────────────────────────────

SELECT pv.product_id, p.name,
       ROUND((1 - MIN(pr_now.unit_price) / AVG(pr_all.unit_price)) * 100, 1) AS drop_pct
FROM product_variants pv
INNER JOIN products p ON pv.product_id = p.product_id
INNER JOIN price_records pr_all ON pr_all.variant_id = pv.variant_id
INNER JOIN (
    SELECT pr.variant_id, pr.unit_price
    FROM price_records pr
    INNER JOIN (SELECT variant_id, MAX(record_id) AS latest FROM price_records GROUP BY variant_id) l
      ON pr.record_id = l.latest
) pr_now ON pr_now.variant_id = pv.variant_id
WHERE pv.product_id IN (SELECT product_id FROM user_favorites WHERE user_id = @test_uid)
GROUP BY pv.product_id, p.name
HAVING drop_pct >= 20;
-- ✅ forced_drops 的商品應出現（drop ≥ 25%）
-- ✅ 數量 = 前端 Smart Alert 卡片數

SELECT t.todo_id, p.name, t.snapshot_price, t.compared_price
FROM todos t
INNER JOIN product_variants pv ON t.variant_id = pv.variant_id
INNER JOIN products p ON pv.product_id = p.product_id
WHERE t.user_id = @test_uid AND t.todo_type = 'buy_now';
-- ✅ todos 表有 buy_now 記錄，數量 = 前端卡片數

-- 👉 瀏覽器操作：
--    6. 進入 /select → 改回原本 4 個：Whole Milk, Sparkling Water, Ground Coffee, Ice Cream → 儲存


-- ══════════════════════════════════════════════════════════════
-- UC8 — 價格趨勢（Scrape 後驗證）
-- ══════════════════════════════════════════════════════════════
-- 👉 瀏覽器操作：
--    1. 回到 /trends → 選 Ice Cream
--    2. 確認 Apr 的數據點有更新（scrape 新增了價格）
-- ──────────────────────────────────────────────────────────────

SELECT r.name AS retailer,
       ROUND(AVG(pr.unit_price), 4) AS avg_unit_price,
       COUNT(*) AS data_points
FROM price_records pr
INNER JOIN product_variants pv ON pr.variant_id = pv.variant_id
INNER JOIN retailers r ON pv.retailer_id = r.retailer_id
WHERE pv.product_id = 17
  AND YEAR(pr.scraped_at) = 2026 AND MONTH(pr.scraped_at) = 4
GROUP BY r.name;
-- ✅ data_points 比 scrape 前多 1（每家 retailer）


-- ══════════════════════════════════════════════════════════════
-- UC5 — 消費分析
-- ══════════════════════════════════════════════════════════════
-- （前提：UC2 已經把 Whole Milk 標為已購買）
--
-- 👉 瀏覽器操作：
--    1. 進入 /insight
--    2. 確認月度消費圖表有一根柱子（本月）
--    3. 確認分類佔比：Dairy 100%
--    4. 確認摘要文字提到 Dairy 是最大支出
-- ──────────────────────────────────────────────────────────────

SELECT DATE_FORMAT(li.purchased_at, '%Y-%m') AS month,
       ROUND(SUM(pr.price * li.quantity), 2) AS total
FROM list_items li
INNER JOIN shopping_lists sl ON li.list_id = sl.list_id
INNER JOIN product_variants pv ON li.variant_id = pv.variant_id
INNER JOIN (
    SELECT variant_id, MAX(record_id) AS latest
    FROM price_records GROUP BY variant_id
) l ON pv.variant_id = l.variant_id
INNER JOIN price_records pr ON pr.record_id = l.latest
WHERE sl.user_id = @test_uid AND li.is_purchased = TRUE
GROUP BY DATE_FORMAT(li.purchased_at, '%Y-%m')
ORDER BY month;
-- ✅ 金額 = 前端月度圖表的數字

SELECT c.name AS category,
       ROUND(SUM(pr.price * li.quantity), 2) AS total
FROM list_items li
INNER JOIN shopping_lists sl ON li.list_id = sl.list_id
INNER JOIN product_variants pv ON li.variant_id = pv.variant_id
INNER JOIN products p ON pv.product_id = p.product_id
LEFT JOIN categories c ON p.category_id = c.category_id
INNER JOIN (
    SELECT variant_id, MAX(record_id) AS latest
    FROM price_records GROUP BY variant_id
) l ON pv.variant_id = l.variant_id
INNER JOIN price_records pr ON pr.record_id = l.latest
WHERE sl.user_id = @test_uid AND li.is_purchased = TRUE
GROUP BY c.name
ORDER BY total DESC;
-- ✅ Dairy 100%


-- ══════════════════════════════════════════════════════════════
-- 清理 — 刪除測試帳號
-- ══════════════════════════════════════════════════════════════
-- 👉 全部 UC 測完後執行：

DELETE FROM users WHERE user_id = @test_uid;

SELECT 'users' AS tbl, COUNT(*) AS cnt FROM users WHERE user_id = @test_uid
UNION ALL SELECT 'favorites', COUNT(*) FROM user_favorites WHERE user_id = @test_uid
UNION ALL SELECT 'lists', COUNT(*) FROM shopping_lists WHERE user_id = @test_uid
UNION ALL SELECT 'alerts', COUNT(*) FROM price_alerts WHERE user_id = @test_uid
UNION ALL SELECT 'todos', COUNT(*) FROM todos WHERE user_id = @test_uid
UNION ALL SELECT 'inventory', COUNT(*) FROM inventory_items WHERE user_id = @test_uid;
-- ✅ 全部 cnt = 0
-- ⚠️ scrape_jobs/price_records/scrape_failures 不受影響（全域資料，不屬於 user）
```

---

## 常見問題

| 問題 | 解法 |
|------|------|
| 前端 API 回 404 或 CORS 錯誤 | 確認後端有跑，且 port 跟 `package.json` proxy 一致 |
| 登入後重新整理被登出 | 確認 `localStorage` 有 token，JWT 有效期 3 小時 |
| Insight 頁面沒資料 | 需要先在 UC2 把清單項目標為「已購買」 |
| Smart Alerts 區塊是空的 | 正常 — 只有追蹤商品降價 ≥ 20% 才會觸發 |
| SQL 結果跟前端不一致 | 確認 `USE_MOCK = false`，前端不是在用 mock data |
| 連不上 MySQL | 確認 IP `167.71.90.83`、帳號 `joj161`、密碼正確 |

---

## 專案結構

```
Basket-Optimiser/
├── front-end/                  # React 18 前端
│   ├── src/
│   │   ├── pages/              # 10 個頁面元件
│   │   ├── components/         # Nav, Icons
│   │   ├── api/index.js        # API 層（USE_MOCK 開關）
│   │   └── data/mockData.js    # Mock 資料（測試時不使用）
│   └── package.json            # proxy → http://127.0.0.1:50123
│
├── backend/                    # Flask 後端
│   ├── app.py                  # 進入點，註冊 11 個 blueprint
│   ├── routes/                 # 11 個路由檔
│   ├── auth.py                 # bcrypt + JWT + @require_auth
│   ├── sql_loader.py           # 讀取 db/queries/*.sql
│   ├── config.py               # 讀 .env
│   ├── .env                    # 機密設定（不進 git）
│   └── tests/                  # pytest 測試
│
├── db/                         # 資料庫
│   ├── schema.sql              # 18 張表（v3 DDL）
│   └── queries/                # 12 個 SQL 檔，後端透過 sql_loader 載入
│
└── docs/                       # API 規格、Use Cases、Table 屬性
    ├── API_SPEC_v2.md          # 24 個 endpoint 完整文件
    ├── Basket_Optimiser_Use_Cases.md
    └── SmartCart_Table_Attributes_v3.md
```

## 待辦事項（TODO）

> 根據老師 Deliverable II 反饋（詳見 `docs/SmartCart_Feedback_Response_v3.md`）以及目前實作狀態整理。

### 已完成的反饋修改（Schema v3）

| # | 反饋 | 改動 | 狀態 |
|---|------|------|------|
| F1 | `price_alerts` 和 `todos` 之間無法追蹤觸發關係 | `todos` 新增 `alert_id INT NULL` FK → `price_alerts`，ON DELETE SET NULL | ✅ Schema + 後端 |
| F2 | `consumption_days` 忽略 `quantity`，`depletion_date` 不準 | 改名為 `consumption_days_per_unit`，公式改為 `purchase_date + (per_unit × qty)` | ✅ Schema + 後端 + mock data |
| F3 | 沒有共用的 consumption 預設值，每個使用者重複輸入 | `products` 新增 `default_consumption_days_per_unit INT NULL`，17 個商品已填預設值 | ✅ Schema + mock data |
| F4 | `inventory_items` 沒有 UNIQUE 約束，同使用者+同商品可能重複 | 新增 `UNIQUE(user_id, product_id)` | ✅ Schema |
| F5 | `todos.message` 嵌入寫死的價格數字，日後會過時 | 新增 `snapshot_price` 和 `compared_price`（DECIMAL），UI 可比較當前價判斷優惠是否仍有效 | ✅ Schema + 後端寫入 |
| F6 | 只有 `scrape_jobs.items_scraped` 計數，無法追蹤哪些 variant 持續失敗 | 新增 `scrape_failures` 表（5 筆 mock data） | ✅ Schema |
| F7 | `confidence_score` 是魔術數字，沒有逐年證據可稽核 | 新增 `seasonal_pattern_years` 表（21 筆 mock data），分數可從年度觀測值推導 | ✅ Schema |
| UC4 | 團隊決定移除 `return_rebuy` — 鼓勵退貨再買對零售商不公平 | `todo_type` ENUM 改為只有 `'buy_now'` | ✅ Schema |

### 尚未完成

| # | 項目 | 說明 | 相關檔案 |
|---|------|------|----------|
| ~~T1~~ | ~~**前端：Inventory 表單預填 consumption 預設值**~~ | Inventory 選商品時自動帶入 `default_consumption_days_per_unit`，搜尋列表旁顯示 `Xd/unit` 提示 | ✅ `front-end/src/pages/Inventory.js` |
| ~~T2~~ | ~~**前端：Smart Alerts 顯示優惠是否仍有效**~~ | API 回傳 `snapshot_price` + `deal_still_valid`，前端顯示 "Deal still valid" 或 "Price recovered" | ✅ `alerts.py`, `alerts.sql`, `Alerts.js` |
| ~~T3~~ | ~~**自動爬蟲流程**~~ | `POST /api/admin/scrape` 已實作模擬爬蟲：建立 scrape job → 寫入 price_records（±5% 波動 + 2 個隨機商品強制降價 25–35%）→ 更新 scrape_jobs → 檢查觸發 price_alerts | ✅ `backend/routes/scrape.py`, `db/queries/scrape.sql` |
| ~~T4~~ | ~~**爬蟲失敗追蹤**~~ | scrape 中 5% 機率模擬失敗，寫入 `scrape_failures`（含隨機錯誤訊息） | ✅ 同 T3 |
| ~~T5~~ | ~~**Receipt OCR**~~ | 不在專案範圍。購物清單的「Process Purchased Items」已可將已購買商品寫入 inventory，OCR 為未來擴充 | 移除 |
| ~~T6~~ | ~~**`GET /api/auth/me` endpoint**~~ | 後端已實作，前端 App.js mount 時呼叫 `getMe()` 恢復 session | ✅ `auth_routes.py`, `App.js` |

---

## Endpoint × DB 表 對照表

### 公開 Endpoint（不需登入）

| Endpoint | SQL query | 讀取的表 |
|----------|-----------|---------|
| `GET /api/retailers` | `retailers.get_all` | retailers |
| `GET /api/products` | `products.get_all_with_category` | products, categories |
| `GET /api/compare/{id}` | `compare.get_top5_cheapest` | price_records, product_variants, products, retailers, units, brands |
| `POST /api/compare/summary` | `compare.get_top5_cheapest` ×N | 同上 |
| `GET /api/trends/{id}` | `trends.get_monthly_avg_by_retailer`, `trends.get_seasonal_patterns`, `trends.get_pattern_years` | price_records, product_variants, retailers, seasonal_patterns, seasonal_pattern_years |
| `POST /api/admin/scrape` | `scrape.*` (10 queries) | scrape_jobs, price_records, scrape_failures, price_alerts |
| `POST /api/auth/register` | `auth.check_email_exists`, `auth.insert_user` | users |
| `POST /api/auth/login` | `auth.get_user_by_email` | users |

### 需登入 Endpoint

| Endpoint | SQL query | 寫入的表 | Transaction |
|----------|-----------|---------|-------------|
| `GET /api/user/favorites` | `favorites.get_by_user` | — | — |
| `PUT /api/user/favorites` | `favorites.delete_all_by_user`, `favorites.insert_one` ×N | user_favorites | — |
| `GET /api/lists` | `lists.get_user_lists` | — | — |
| `GET /api/lists/{id}` | `lists.verify_ownership` + 3 queries | — | — |
| `POST /api/lists` | `lists.insert_list` | shopping_lists | — |
| `POST /api/lists/{id}/items` | `lists.insert_item`, `lists.update_estimated_total` | list_items, shopping_lists | **YES** |
| `PATCH /api/lists/{id}/items/{id}` | 動態 UPDATE | list_items | — |
| `GET /api/inventory` | `inventory.get_user_inventory` | — | — |
| `POST /api/inventory` | `inventory.check_existing`, INSERT 或 UPDATE | inventory_items | — |
| `PATCH /api/inventory/{id}/dismiss` | `inventory.dismiss` | inventory_items | — |
| `GET /api/alerts` | 多個 query + smart alert 偵測 | todos | **YES** |
| `POST /api/alerts` | `alerts.insert_alert` | price_alerts | — |
| `DELETE /api/alerts/{id}` | `alerts.delete_alert` | price_alerts | — |
| `GET /api/insight/monthly` | `insight.spending_cte` + `insight.get_monthly` | — | — |
| `GET /api/insight/categories` | `insight.spending_cte` + `insight.get_by_category` | — | — |
| `GET /api/insight/summary` | `insight.spending_cte` + 2 queries | — | — |
