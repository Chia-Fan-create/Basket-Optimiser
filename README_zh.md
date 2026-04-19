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

> **測試原則：**
> - 每次測試**建立一個全新帳號**，確保乾淨的起始狀態
> - 每個操作在前端執行後，立刻到 MySQL Workbench 跑對應的 SQL，確認 DB 跟前端一致
> - 所有 SQL 查詢都用 `@test_uid` 變數，不需手動替換 user_id
> - 測試完畢刪除帳號，所有資料自動 CASCADE 清除，不影響其他人
>
> **一次複製所有 SQL：** 頁面最底部有 [E2E 測試用 SQL（一次複製）](#e2e-測試用-sql一次複製) 段落，把整段 SQL 貼到 MySQL Workbench，測試時直接選取對應段落按 ⌘+Enter 執行，不用來回找。

### Step 0 — 設定 MySQL 變數

測試開始前，先在 MySQL Workbench 跑這行，後面所有 SQL 都會用到：

```sql
-- ⚠️ 先不要跑，等 UC7 註冊完再回來跑這行
SET @test_uid = (SELECT user_id FROM users WHERE email = 'e2e.test@example.com');
```

---

### UC7 — 註冊新帳號

**瀏覽器操作：**
1. 進入 http://localhost:3000/login
2. 切換到 Register
3. 填入：
   - Email: `e2e.test@example.com`
   - Password: `password123`
   - Display Name: `E2E Test`
4. 點 Register → 應自動登入，跳轉到 Dashboard
5. 按 F5 重新整理頁面 → 確認仍然是登入狀態，沒被登出

**SQL 驗證：**
```sql
-- 確認帳號已寫入
SELECT user_id, email, display_name, created_at
FROM users
WHERE email = 'e2e.test@example.com';
-- ✅ 應該有一筆，password_hash 是 bcrypt 雜湊（$2b$ 開頭，不是明文）

-- 設定變數，後面所有 SQL 都用 @test_uid
SET @test_uid = (SELECT user_id FROM users WHERE email = 'e2e.test@example.com');
SELECT @test_uid;  -- 確認有值
```

---

### UC9 — 設定喜好商品（Favorites）

**瀏覽器操作：**
1. 在 Dashboard 點 edit 按鈕，進入 /select
2. 勾選這 4 個商品：**Whole Milk**、**Sparkling Water**、**Ground Coffee**、**Ice Cream**
3. 點「See my dashboard →」儲存
4. 確認 Dashboard 顯示 4 個商品卡片
5. 按 F5 重新整理 → 確認 4 個商品仍在，沒消失
6. 再進 /select，**取消 Sparkling Water**，儲存
7. 按 F5 確認只剩 3 個

**SQL 驗證：**
```sql
-- Step 5 之後（應有 4 筆）：
SELECT uf.product_id, p.name
FROM user_favorites uf
INNER JOIN products p ON uf.product_id = p.product_id
WHERE uf.user_id = @test_uid
ORDER BY uf.product_id;
-- ✅ 預期：1 Whole Milk, 5 Sparkling Water, 6 Ground Coffee, 17 Ice Cream

-- Step 7 之後（應有 3 筆）：
SELECT uf.product_id, p.name
FROM user_favorites uf
INNER JOIN products p ON uf.product_id = p.product_id
WHERE uf.user_id = @test_uid
ORDER BY uf.product_id;
-- ✅ 預期：1 Whole Milk, 6 Ground Coffee, 17 Ice Cream（Sparkling Water 已移除）
```

---

### UC1 — 商品比價

**瀏覽器操作：**
1. 進入 /compare
2. 點 **Whole Milk** tab
3. 確認顯示 3 筆結果（3 家 retailer），按 unit price 由低到高
4. 確認每筆有：商品名、零售商（帶顏色圓點）、包裝大小、總價、單位價格
5. 第 1 名應標示 **BEST VALUE**
6. 確認頁面上**沒有**「+ List」按鈕（已移除）

**SQL 驗證：**
```sql
-- 查 Whole Milk 比價結果，順序應跟前端完全一致
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
-- ✅ 預期順序：Amazon（最便宜）→ Walmart → Target
-- 前端第 1 名 = SQL 第 1 筆
```

---

### UC8 — 價格趨勢與季節性預測

**瀏覽器操作：**
1. 進入 /trends，點 **Ice Cream** tab
2. 確認圖表 x 軸有 **May → Apr 共 12 個月**
3. 確認 3 條實線（Amazon 橘 / Target 紅 / Walmart 藍）+ 虛線（Predicted 灰）
4. 用滑鼠 hover 數據點，確認 tooltip 顯示 retailer、價格、月份
5. **目視確認季節性**：夏天（Jun–Aug）線段偏高、冬天（Nov–Jan）偏低
6. 圖表下方應顯示 **Seasonal Patterns** 卡片區塊：
   - **Prime Day Ice Cream** (Amazon, Jul) 12.0% off — 2023: 8.5%, 2024: 13.1%, 2025: 14.4%
   - **Ice Cream Season End** (Walmart, Oct) 15.6% off — 2023: 12.3%, 2024: 16.8%, 2025: 17.7%
7. 換 **Sparkling Water** tab → 確認趨勢相反（夏天低、冬天高）

**SQL 驗證：**
```sql
-- Ice Cream 月均價（應有 12 個月 × 3 retailers = ~36 rows）
SELECT DATE_FORMAT(pr.scraped_at, '%Y-%m') AS month,
       r.name AS retailer,
       ROUND(AVG(pr.unit_price), 4) AS avg_unit_price
FROM price_records pr
INNER JOIN product_variants pv ON pr.variant_id = pv.variant_id
INNER JOIN retailers r ON pv.retailer_id = r.retailer_id
WHERE pv.product_id = 17
GROUP BY YEAR(pr.scraped_at), MONTH(pr.scraped_at), month, r.name
ORDER BY month, r.name;
-- ✅ Walmart 的 Jul 均價 (~0.12) > Nov 均價 (~0.10)

-- 季節性模式 + 年度證據
SELECT sp.event_name, sp.typical_month, sp.avg_discount_pct,
       r.name AS retailer, sp.confidence_score
FROM seasonal_patterns sp
INNER JOIN retailers r ON sp.retailer_id = r.retailer_id
WHERE sp.product_id = 17;
-- ✅ 應有 2 筆：Prime Day Ice Cream 和 Ice Cream Season End

SELECT spy.pattern_id, spy.year, spy.observed_discount
FROM seasonal_pattern_years spy
INNER JOIN seasonal_patterns sp ON spy.pattern_id = sp.pattern_id
WHERE sp.product_id = 17
ORDER BY spy.pattern_id, spy.year;
-- ✅ 每個 pattern 有 2023/2024/2025 三年的觀測折扣
```

---

### UC2 — 購物清單管理

**瀏覽器操作：**
1. 進入 /lists → 確認是空的（新帳號沒有清單）
2. 點「+ New List」→ 輸入 `E2E Test List` → 建立
3. 點「+ Add Item」→ 搜尋 `milk` → 點選 **Whole Milk**（自動加入 qty 1）
4. 再加一個：搜尋 `granola` → 點選 **Granola Bars**（qty 1）
5. 關閉搜尋 modal → 確認頁面顯示：
   - 2 個商品
   - Cheapest Store（應顯示 Walmart）
   - 各家店的總價比較
   - Savings 金額
6. 點 Granola Bars 旁的 **✕** 刪除 → 確認只剩 Whole Milk，總價更新
7. 勾選 Whole Milk 的 **checkbox**（標記已購買）
8. 點「Process Purchased Items」→ 確認清單正確 → 「Confirm & Save」
9. 成功畫面 →「Done — Clear purchased items」→ 確認清單項目被清空，但清單名還在

**SQL 驗證（每步驟後查一次）：**
```sql
-- Step 2: 確認新清單已建立
SELECT list_id, name, estimated_total, created_at
FROM shopping_lists
WHERE user_id = @test_uid;

-- Step 3-4: 確認項目已新增（設定 @test_list 變數）
SET @test_list = (SELECT list_id FROM shopping_lists WHERE user_id = @test_uid ORDER BY created_at DESC LIMIT 1);

SELECT li.list_item_id, pv.product_id, p.name, li.quantity, li.variant_id
FROM list_items li
INNER JOIN product_variants pv ON li.variant_id = pv.variant_id
INNER JOIN products p ON pv.product_id = p.product_id
WHERE li.list_id = @test_list;

-- Step 4: 確認 estimated_total 已更新（Transaction 驗證）
SELECT list_id, name, estimated_total
FROM shopping_lists
WHERE list_id = @test_list;

-- Step 6: 刪除後確認少了一筆，estimated_total 有扣掉
SELECT COUNT(*) AS item_count FROM list_items WHERE list_id = @test_list;
SELECT estimated_total FROM shopping_lists WHERE list_id = @test_list;

-- Step 7: 確認勾選後 is_purchased 和 purchased_at 已更新
SELECT list_item_id, is_purchased, purchased_at
FROM list_items
WHERE list_id = @test_list;

-- Step 8: Process 後確認寫入的表
-- 8a: price_records 新增了價格記錄（透過 scrape_jobs）
SELECT sj.job_id, sj.status, sj.items_scraped
FROM scrape_jobs sj
ORDER BY sj.job_id DESC LIMIT 1;

-- 8b: inventory_items 新增或更新了庫存
SELECT ii.inventory_id, p.name, ii.quantity, ii.depletion_date
FROM inventory_items ii
INNER JOIN products p ON ii.product_id = p.product_id
WHERE ii.user_id = @test_uid;

-- Step 9: Clear 後確認項目被清空，清單還在
SELECT COUNT(*) AS remaining_items FROM list_items WHERE list_id = @test_list;
SELECT list_id, name, estimated_total FROM shopping_lists WHERE list_id = @test_list;
```

**驗證重點：**
- 新增項目是 Transaction：`list_items` INSERT + `shopping_lists.estimated_total` UPDATE 同時成功
- 刪除項目：`list_items` DELETE + `estimated_total` 扣回（Transaction）
- Process：寫入 `price_records`（價格歷史）+ `inventory_items`（家庭庫存）
- Clear：已購買的 `list_items` 被刪除，`estimated_total` 歸零，`shopping_lists` row 保留
- 新帳號之前沒有清單，所以查到的一定是剛建的

---

### UC6 — 家庭庫存追蹤

**瀏覽器操作：**
1. 進入 /inventory → 確認是空的
2. 點「+ Add Item」→ 搜尋 `milk` → 選 **Whole Milk**
   - Quantity 填 `2`
   - Days per unit 應**自動帶入** `7`（來自 `default_consumption_days_per_unit`）
   - 點 Save
3. 確認列表出現 Whole Milk，顯示 qty=2、depletion date（14 天後）
4. 再新增一次 **Whole Milk**（qty=1）→ 確認仍然只有**一筆**，qty 變成 3、depletion 變成 21 天後（UPSERT 行為）
5. 點 **Dismiss** 按鈕 → 確認項目被標記為 dismissed

**SQL 驗證：**
```sql
-- Step 4 之後：確認只有一筆、quantity 累加、depletion 正確
SELECT ii.inventory_id, p.name, ii.quantity,
       ii.purchase_date, ii.depletion_date, ii.is_dismissed,
       DATEDIFF(ii.depletion_date, ii.purchase_date) AS total_days
FROM inventory_items ii
INNER JOIN products p ON ii.product_id = p.product_id
WHERE ii.user_id = @test_uid;
-- ✅ 預期：1 筆，quantity=3，total_days=21 (3 × 7)，is_dismissed=0

-- Step 4：確認沒有重複
SELECT COUNT(*) AS row_count
FROM inventory_items
WHERE user_id = @test_uid AND product_id = 1;
-- ✅ 預期：1（不是 2）

-- Step 5 之後：
SELECT inventory_id, is_dismissed
FROM inventory_items
WHERE user_id = @test_uid;
-- ✅ 預期：is_dismissed = 1
```

---

### UC3 — 價格警報

**瀏覽器操作：**
1. 進入 /alerts
2. 新增警報 #1：選 **Whole Milk**，目標價填 `0.08`（高於目前最低價 ~$0.059，所以會立即觸發）
3. 確認出現在「Triggered」區塊，顯示綠色 ✅
4. 新增警報 #2：選 **Ice Cream**，目標價填 `0.01`（遠低於目前價，不會觸發）
5. 確認出現在「Active」區塊，顯示進度條
6. 刪除 Ice Cream 的警報（點 ✕）→ 確認只剩 Whole Milk 的

**SQL 驗證：**
```sql
-- Step 4 之後：應有 2 筆 alert
SELECT pa.alert_id, p.name, pa.target_price, pa.is_active, pa.triggered_at
FROM price_alerts pa
INNER JOIN products p ON pa.product_id = p.product_id
WHERE pa.user_id = @test_uid;
-- ✅ Whole Milk target=0.08 → triggered（目前最低 ~0.059 <= 0.08）
-- ✅ Ice Cream target=0.01 → NOT triggered（目前 ~0.10 > 0.01）

-- 驗證 Whole Milk 目前最低價
SELECT MIN(pr.unit_price) AS current_lowest
FROM price_records pr
INNER JOIN (
    SELECT variant_id, MAX(record_id) AS latest
    FROM price_records GROUP BY variant_id
) l ON pr.record_id = l.latest
INNER JOIN product_variants pv ON pr.variant_id = pv.variant_id
WHERE pv.product_id = 1;
-- ✅ 預期 ~0.059，低於 0.08 → 正確觸發

-- Step 6 之後：只剩 1 筆
SELECT COUNT(*) FROM price_alerts WHERE user_id = @test_uid;
-- ✅ 預期：1
```

---

### 模擬爬蟲 — POST /api/admin/scrape

> **在 UC3 之後、UC4 之前觸發。**

**操作方式：** 打開瀏覽器 DevTools Console（F12），貼上：

```javascript
fetch('/api/admin/scrape', { method: 'POST' }).then(r => r.json()).then(console.log)
```

**確認 Console 輸出的 JSON：**
| 欄位 | 預期值 | 說明 |
|------|--------|------|
| `success` | `true` | |
| `prices_recorded` | ~50 | 3 家 × ~17 variants |
| `jobs_created` | `3` | Amazon / Target / Walmart |
| `forced_drops` | 6 筆 | 2 個隨機商品 × 3 家，降幅 25–35% |
| `alerts_triggered` | ≥ 1 | 至少 Whole Milk 的 alert 會被觸發 |
| `failures` | 0~3 | 5% 隨機失敗 |

**重要：記下 `forced_drops` 裡的 product_id，後面 UC4 會用到。**

**SQL 驗證：**
```sql
-- 3 筆新 scrape_jobs
SELECT job_id, retailer_id, status, items_scraped
FROM scrape_jobs ORDER BY job_id DESC LIMIT 3;
-- ✅ 全部 status='success', items_scraped ≈ 17

-- 新 price_records 數量
SELECT COUNT(*) AS new_prices
FROM price_records
WHERE scrape_job_id >= (SELECT MAX(job_id) - 2 FROM scrape_jobs);
-- ✅ ~50 筆

-- 爬蟲失敗記錄（F6 反饋要求的 scrape_failures 表）
SELECT failure_id, variant_id, error_message
FROM scrape_failures ORDER BY failure_id DESC LIMIT 5;
-- ✅ 如果 failures > 0，這裡會有記錄（HTTP 503, CAPTCHA 等）

-- Whole Milk alert 應被觸發
SELECT pa.alert_id, p.name, pa.target_price, pa.triggered_at
FROM price_alerts pa
INNER JOIN products p ON pa.product_id = p.product_id
WHERE pa.user_id = @test_uid;
-- ✅ Whole Milk 的 triggered_at 應有值（scrape 觸發了它）
```

---

### UC4 — 智慧警報（Smart Alerts，Scrape 後驗證）

**瀏覽器操作：**
1. 按 F5 重新整理 /alerts（scrape 後必須重整才會觸發偵測）
2. 確認 Whole Milk alert 顯示 **Triggered**（✅ 綠色）
3. 滾到下方 **Smart Alerts** 區塊（⚡ 圖示）：
   - 如果 scrape 的 forced_drops 商品**在你的 favorites 裡** → 這裡會有卡片
   - 如果不在 → Smart Alerts 區塊是空的，**這是正常的**
4. 如果有 Smart Alert 卡片，確認顯示：
   - 商品名、降幅 %、目前價格、零售商
   - 「Deal still valid」或「Price recovered」文字（T2 新功能）

> **原理：** 後端在 `GET /api/alerts` 時自動檢查 favorites 商品，如果目前最低價比歷史均價低 ≥ 20%，自動寫入 `todos` 表。Scrape 的 forced_drops 降 25-35%，所以只要被降價的商品在 favorites 裡就會觸發。

**SQL 驗證：**
```sql
-- 你的 favorites 裡哪些商品降價 ≥ 20%？
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
-- ✅ 如果有結果 → 前端 Smart Alerts 應顯示這些商品
-- ✅ 如果沒結果 → 前端 Smart Alerts 為空，正常

-- 確認 todos 表
SELECT t.todo_id, p.name, t.snapshot_price, t.compared_price
FROM todos t
INNER JOIN product_variants pv ON t.variant_id = pv.variant_id
INNER JOIN products p ON pv.product_id = p.product_id
WHERE t.user_id = @test_uid AND t.todo_type = 'buy_now';
-- ✅ 數量 = 前端 Smart Alerts 的卡片數
```

---

### UC8 — 價格趨勢（Scrape 後驗證）

**瀏覽器操作：**
1. 回到 /trends → 選 **Ice Cream**
2. 確認 Apr 的數據點有更新（scrape 新增了價格）

**SQL 驗證：**
```sql
SELECT r.name AS retailer,
       ROUND(AVG(pr.unit_price), 4) AS avg_unit_price,
       COUNT(*) AS data_points
FROM price_records pr
INNER JOIN product_variants pv ON pr.variant_id = pv.variant_id
INNER JOIN retailers r ON pv.retailer_id = r.retailer_id
WHERE pv.product_id = 17
  AND YEAR(pr.scraped_at) = 2026 AND MONTH(pr.scraped_at) = 4
GROUP BY r.name;
-- ✅ data_points 應比之前多 1（scrape 新增了一筆）
```

---

### UC5 — 消費分析

> **前提：** UC2 已經把 Whole Milk 標為「已購買」。

**瀏覽器操作：**
1. 進入 /insight
2. 確認月度消費圖表有一根柱子（本月）
3. 確認分類佔比顯示 **Dairy 100%**
4. 確認摘要文字提到 Dairy 是最大支出類別

**SQL 驗證：**
```sql
-- 月度消費（對應前端的月度圖表）
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

-- 分類消費（對應前端的分類佔比）
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
```

**驗證重點：**
- 新帳號只有 UC2 標為已購買的那一筆，數據應該很簡單好驗
- 前端月度金額 = SQL 月度加總

---

## 測試完清理

在 MySQL Workbench 跑：

```sql
-- 刪除測試帳號，CASCADE 自動清除所有關聯資料
DELETE FROM users WHERE user_id = @test_uid;

-- 驗證 6 張表全部歸零
SELECT 'users' AS tbl, COUNT(*) AS cnt FROM users WHERE user_id = @test_uid
UNION ALL SELECT 'favorites', COUNT(*) FROM user_favorites WHERE user_id = @test_uid
UNION ALL SELECT 'lists', COUNT(*) FROM shopping_lists WHERE user_id = @test_uid
UNION ALL SELECT 'alerts', COUNT(*) FROM price_alerts WHERE user_id = @test_uid
UNION ALL SELECT 'todos', COUNT(*) FROM todos WHERE user_id = @test_uid
UNION ALL SELECT 'inventory', COUNT(*) FROM inventory_items WHERE user_id = @test_uid;
-- ✅ 全部 cnt = 0
```

> **注意：** scrape 產生的 `scrape_jobs`、`price_records`、`scrape_failures` 不會被 CASCADE 刪除（它們不屬於任何 user）。這是正常的 — 價格資料是全域共享的。

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

---

## E2E 測試用 SQL（一次複製）

> **使用方式：** 把下面整段 SQL 複製到 MySQL Workbench，全部貼好。測試時不用來回找 SQL — 直接選取對應段落按 ⌘+Enter（或 Ctrl+Enter）執行即可。

```sql
-- ============================================================
-- SmartCart E2E 測試 SQL — 一次貼好，逐段執行
-- ============================================================
-- 使用方式：全部複製貼到 MySQL Workbench
-- 測試時選取對應段落 → ⌘+Enter 執行
-- ============================================================

-- ── UC7：註冊後設定變數 ──────────────────────────────────────
SELECT user_id, email, display_name, created_at
FROM users WHERE email = 'e2e.test@example.com';

SET @test_uid = (SELECT user_id FROM users WHERE email = 'e2e.test@example.com');
SELECT @test_uid;

-- ── UC9：Favorites（選完 4 個後跑）──────────────────────────
SELECT uf.product_id, p.name
FROM user_favorites uf
INNER JOIN products p ON uf.product_id = p.product_id
WHERE uf.user_id = @test_uid
ORDER BY uf.product_id;
-- ✅ 預期 4 筆：1 Whole Milk, 5 Sparkling Water, 6 Ground Coffee, 17 Ice Cream

-- ── UC9：Favorites（取消 Sparkling Water 後跑）──────────────
SELECT uf.product_id, p.name
FROM user_favorites uf
INNER JOIN products p ON uf.product_id = p.product_id
WHERE uf.user_id = @test_uid
ORDER BY uf.product_id;
-- ✅ 預期 3 筆：1, 6, 17

-- ── UC1：Compare Whole Milk ─────────────────────────────────
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
-- ✅ 順序：Amazon → Walmart → Target

-- ── UC8：Ice Cream 月均價 ───────────────────────────────────
SELECT DATE_FORMAT(pr.scraped_at, '%Y-%m') AS month,
       r.name AS retailer,
       ROUND(AVG(pr.unit_price), 4) AS avg_unit_price
FROM price_records pr
INNER JOIN product_variants pv ON pr.variant_id = pv.variant_id
INNER JOIN retailers r ON pv.retailer_id = r.retailer_id
WHERE pv.product_id = 17
GROUP BY YEAR(pr.scraped_at), MONTH(pr.scraped_at), month, r.name
ORDER BY month, r.name;
-- ✅ 12 個月，Walmart Jul (~0.12) > Nov (~0.10)

-- ── UC8：Seasonal patterns + 年度證據 ──────────────────────
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
-- ✅ 每個 pattern 有 2023/2024/2025

-- ── UC2：建立清單後 ─────────────────────────────────────────
SELECT list_id, name, estimated_total, created_at
FROM shopping_lists WHERE user_id = @test_uid;

SET @test_list = (SELECT list_id FROM shopping_lists
                  WHERE user_id = @test_uid ORDER BY created_at DESC LIMIT 1);

-- ── UC2：加商品後 ───────────────────────────────────────────
SELECT li.list_item_id, pv.product_id, p.name, li.quantity, li.variant_id
FROM list_items li
INNER JOIN product_variants pv ON li.variant_id = pv.variant_id
INNER JOIN products p ON pv.product_id = p.product_id
WHERE li.list_id = @test_list;

SELECT list_id, name, estimated_total
FROM shopping_lists WHERE list_id = @test_list;

-- ── UC2：刪除商品後 ─────────────────────────────────────────
SELECT COUNT(*) AS item_count FROM list_items WHERE list_id = @test_list;
SELECT estimated_total FROM shopping_lists WHERE list_id = @test_list;

-- ── UC2：標記已購買後 ───────────────────────────────────────
SELECT list_item_id, is_purchased, purchased_at
FROM list_items WHERE list_id = @test_list;

-- ── UC2：Process 後 ─────────────────────────────────────────
SELECT sj.job_id, sj.status, sj.items_scraped
FROM scrape_jobs sj ORDER BY sj.job_id DESC LIMIT 1;

SELECT ii.inventory_id, p.name, ii.quantity, ii.depletion_date
FROM inventory_items ii
INNER JOIN products p ON ii.product_id = p.product_id
WHERE ii.user_id = @test_uid;

-- ── UC2：Clear 後 ───────────────────────────────────────────
SELECT COUNT(*) AS remaining_items FROM list_items WHERE list_id = @test_list;
SELECT list_id, name, estimated_total FROM shopping_lists WHERE list_id = @test_list;

-- ── UC6：庫存 UPSERT 後 ────────────────────────────────────
SELECT ii.inventory_id, p.name, ii.quantity,
       ii.purchase_date, ii.depletion_date, ii.is_dismissed,
       DATEDIFF(ii.depletion_date, ii.purchase_date) AS total_days
FROM inventory_items ii
INNER JOIN products p ON ii.product_id = p.product_id
WHERE ii.user_id = @test_uid;
-- ✅ 1 筆，quantity 累加，total_days = quantity × 7

SELECT COUNT(*) AS row_count
FROM inventory_items
WHERE user_id = @test_uid AND product_id = 1;
-- ✅ 1（不是 2）

-- ── UC6：Dismiss 後 ────────────────────────────────────────
SELECT inventory_id, is_dismissed
FROM inventory_items WHERE user_id = @test_uid;
-- ✅ is_dismissed = 1

-- ── UC3：建立 2 個 alert 後 ────────────────────────────────
SELECT pa.alert_id, p.name, pa.target_price, pa.is_active, pa.triggered_at
FROM price_alerts pa
INNER JOIN products p ON pa.product_id = p.product_id
WHERE pa.user_id = @test_uid;
-- ✅ Whole Milk 0.08 → triggered, Ice Cream 0.01 → not triggered

SELECT MIN(pr.unit_price) AS current_lowest
FROM price_records pr
INNER JOIN (
    SELECT variant_id, MAX(record_id) AS latest
    FROM price_records GROUP BY variant_id
) l ON pr.record_id = l.latest
INNER JOIN product_variants pv ON pr.variant_id = pv.variant_id
WHERE pv.product_id = 1;
-- ✅ ~0.059 < 0.08 → 正確觸發

-- ── UC3：刪除 Ice Cream alert 後 ───────────────────────────
SELECT COUNT(*) FROM price_alerts WHERE user_id = @test_uid;
-- ✅ 1

-- ── Scrape：執行後 ─────────────────────────────────────────
SELECT job_id, retailer_id, status, items_scraped
FROM scrape_jobs ORDER BY job_id DESC LIMIT 3;
-- ✅ 3 筆 status='success'

SELECT COUNT(*) AS new_prices
FROM price_records
WHERE scrape_job_id >= (SELECT MAX(job_id) - 2 FROM scrape_jobs);
-- ✅ ~50

SELECT failure_id, variant_id, error_message
FROM scrape_failures ORDER BY failure_id DESC LIMIT 5;
-- ✅ 爬蟲失敗記錄（如有）

SELECT pa.alert_id, p.name, pa.target_price, pa.triggered_at
FROM price_alerts pa
INNER JOIN products p ON pa.product_id = p.product_id
WHERE pa.user_id = @test_uid;
-- ✅ Whole Milk triggered_at 有值

-- ── UC4：Smart Alerts 驗證 ─────────────────────────────────
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
-- ✅ 有結果 → 前端有 Smart Alert；沒結果 → 前端為空，正常

SELECT t.todo_id, p.name, t.snapshot_price, t.compared_price
FROM todos t
INNER JOIN product_variants pv ON t.variant_id = pv.variant_id
INNER JOIN products p ON pv.product_id = p.product_id
WHERE t.user_id = @test_uid AND t.todo_type = 'buy_now';
-- ✅ 數量 = 前端 Smart Alerts 卡片數

-- ── UC8：Scrape 後趨勢驗證 ─────────────────────────────────
SELECT r.name AS retailer,
       ROUND(AVG(pr.unit_price), 4) AS avg_unit_price,
       COUNT(*) AS data_points
FROM price_records pr
INNER JOIN product_variants pv ON pr.variant_id = pv.variant_id
INNER JOIN retailers r ON pv.retailer_id = r.retailer_id
WHERE pv.product_id = 17
  AND YEAR(pr.scraped_at) = 2026 AND MONTH(pr.scraped_at) = 4
GROUP BY r.name;
-- ✅ data_points 比 scrape 前多 1

-- ── UC5：月度消費 ──────────────────────────────────────────
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

-- ── UC5：分類消費 ──────────────────────────────────────────
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

-- ── 清理：刪除測試帳號 ────────────────────────────────────
DELETE FROM users WHERE user_id = @test_uid;

SELECT 'users' AS tbl, COUNT(*) AS cnt FROM users WHERE user_id = @test_uid
UNION ALL SELECT 'favorites', COUNT(*) FROM user_favorites WHERE user_id = @test_uid
UNION ALL SELECT 'lists', COUNT(*) FROM shopping_lists WHERE user_id = @test_uid
UNION ALL SELECT 'alerts', COUNT(*) FROM price_alerts WHERE user_id = @test_uid
UNION ALL SELECT 'todos', COUNT(*) FROM todos WHERE user_id = @test_uid
UNION ALL SELECT 'inventory', COUNT(*) FROM inventory_items WHERE user_id = @test_uid;
-- ✅ 全部 cnt = 0
```
