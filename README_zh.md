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

### Step 0 — 設定 MySQL 變數

測試開始前，先在 MySQL Workbench 跑這行，後面所有 SQL 都會用到：

```sql
-- ⚠️ 先不要跑，等 UC7 註冊完再回來跑這行
SET @test_uid = (SELECT user_id FROM users WHERE email = '你註冊的 email');
```

---

### UC7 — 註冊新帳號

**瀏覽器操作：**
1. 進入 http://localhost:3000/login
2. 切換到 Register，用一個獨一無二的 email 註冊，例如 `test.你的名字@example.com`
3. 密碼用 `password123`，Display Name 填你的名字
4. 註冊成功後應自動登入，跳轉到 Dashboard
5. 重新整理頁面（F5），確認仍然是登入狀態（JWT 3 小時 session）

**SQL 驗證：**
```sql
-- 確認帳號已寫入，記下 user_id
SELECT user_id, email, display_name, created_at
FROM users
WHERE email = '你註冊的 email';

-- ✅ 現在設定變數，後面所有 SQL 都用 @test_uid
SET @test_uid = (SELECT user_id FROM users WHERE email = '你註冊的 email');
SELECT @test_uid;  -- 確認有值
```

**驗證重點：**
- `users` 表有新 row，`password_hash` 是 bcrypt 雜湊（不是明文）
- 重新整理後不會被登出

---

### UC9 — 設定喜好商品（Favorites）

**瀏覽器操作：**
1. 按 Dashboard 上的 edit 進入 Select 頁面（/select）
2. 勾選至少 3 個商品（例如 Whole Milk、Greek Yogurt、Orange Juice）
3. 點「See my dashboard →」儲存
4. 確認 Dashboard 上顯示你選的商品
5. **重新整理頁面（F5）**，確認喜好商品仍在，沒有消失
6. 回到 /select，取消一個商品，儲存
7. 重新整理，確認變更有保留

**SQL 驗證：**
```sql
-- Step 3: 確認 favorites 已存入 DB
SELECT uf.product_id, p.name
FROM user_favorites uf
INNER JOIN products p ON uf.product_id = p.product_id
WHERE uf.user_id = @test_uid
ORDER BY uf.product_id;

-- Step 6: 取消後重新查，確認少了一筆
SELECT uf.product_id, p.name
FROM user_favorites uf
INNER JOIN products p ON uf.product_id = p.product_id
WHERE uf.user_id = @test_uid
ORDER BY uf.product_id;
```

**驗證重點：**
- 前端顯示的數量 = SQL row 數
- PUT 是全量覆蓋：先 DELETE all 再逐筆 INSERT

---

### UC1 — 商品比價

**瀏覽器操作：**
1. 進入 Compare 頁面（/compare）
2. 選擇一個商品，例如 Whole Milk（product_id = 1）
3. 確認顯示最多 5 筆結果，按單位價格由低到高排序
4. 每筆顯示：商品名稱、品牌、零售商、包裝大小、總價、單位價格

**SQL 驗證：**
```sql
-- 查 product_id = 1 的比價結果，應該跟前端完全一致
SELECT r.name AS store, b.name AS brand,
       CONCAT(pv.pack_size, ' ', u.abbreviation) AS size,
       pr.price, pr.unit_price,
       CONCAT('$', FORMAT(pr.unit_price, 3), '/', u.abbreviation) AS unit_display
FROM price_records pr
INNER JOIN (
    SELECT variant_id, MAX(record_id) AS latest
    FROM price_records GROUP BY variant_id
) l ON pr.record_id = l.latest
INNER JOIN product_variants pv ON pr.variant_id = pv.variant_id
INNER JOIN retailers r ON pv.retailer_id = r.retailer_id
INNER JOIN products p ON pv.product_id = p.product_id
LEFT JOIN brands b ON p.brand_id = b.brand_id
LEFT JOIN units u ON pv.unit_id = u.unit_id
WHERE pv.product_id = 1
ORDER BY pr.unit_price ASC
LIMIT 5;
```

**驗證重點：**
- 前端第 1 名 = SQL 第 1 筆（最便宜）
- 價格、零售商、品牌完全一致
- 這個查詢跟帳號無關（公開資料），所有人結果相同

---

### UC8 — 價格趨勢與季節性預測

**瀏覽器操作：**
1. 進入 Trends 頁面（/trends）
2. 選擇一個商品
3. 確認圖表顯示各零售商的歷史月均價（實線）
4. 如果有季節性資料，確認未來月份有預測價格（虛線）

**SQL 驗證：**
```sql
-- 歷史月均價（對應圖表實線）
SELECT r.name AS retailer,
       DATE_FORMAT(pr.scraped_at, '%Y-%m') AS month,
       ROUND(AVG(pr.unit_price), 4) AS avg_unit_price
FROM price_records pr
INNER JOIN product_variants pv ON pr.variant_id = pv.variant_id
INNER JOIN retailers r ON pv.retailer_id = r.retailer_id
WHERE pv.product_id = 1
GROUP BY r.name, DATE_FORMAT(pr.scraped_at, '%Y-%m')
ORDER BY month, r.name;

-- 季節性模式（對應圖表虛線）
SELECT sp.event_name, sp.typical_month, sp.avg_discount_pct, r.name AS retailer
FROM seasonal_patterns sp
INNER JOIN retailers r ON sp.retailer_id = r.retailer_id
WHERE sp.product_id = 1;
```

**驗證重點：**
- 圖表每個月的數據點 = SQL 對應月份的 avg_unit_price
- 這個查詢跟帳號無關（公開資料）

---

### UC2 — 購物清單管理

**瀏覽器操作：**
1. 進入 Shopping Lists 頁面（/lists），確認目前清單是空的（新帳號）
2. 點「+ New List」，輸入名稱「E2E Test」
3. 點「+ Add Item」，搜尋商品（例如輸入 "milk"），點選 Whole Milk → 自動加入最便宜的 variant（qty 1）
4. 繼續加 2～3 個商品（例如 Granola Bars、Pasta），加完關閉 modal
5. 確認頁面顯示 Cheapest Store、各家店的總價、以及 savings
6. 點商品旁的 ✕ 刪除一個商品，確認清單更新
7. 勾選剩餘商品的 checkbox（標記為已購買）
8. 點底部「Process Purchased Items」→ 確認已購買的商品出現在列表中 → 點「Confirm & Save」
9. 成功畫面點「Done — Clear purchased items」→ 確認清單項目被清空，但清單本身還在

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
1. 進入 Inventory 頁面（/inventory），確認是空的（新帳號）
2. 新增庫存項目：選商品、輸入數量、輸入預計幾天用完（例如 7 天）
3. 確認項目出現在庫存列表中
4. 再新增同一個商品 → 確認是更新而非新增（UNIQUE 約束）
5. 點 Dismiss 關閉提醒

**SQL 驗證：**
```sql
-- Step 2: 查看庫存
SELECT ii.inventory_id, p.name, ii.quantity,
       ii.purchase_date, ii.depletion_date, ii.is_dismissed,
       DATEDIFF(ii.depletion_date, CURDATE()) AS days_left
FROM inventory_items ii
INNER JOIN products p ON ii.product_id = p.product_id
WHERE ii.user_id = @test_uid
ORDER BY ii.depletion_date ASC;

-- Step 4: 再查一次，確認仍然只有一筆（不是兩筆）
SELECT COUNT(*) AS row_count
FROM inventory_items
WHERE ii.user_id = @test_uid AND product_id = <你選的 product_id>;

-- Step 5: 驗證 dismiss
SELECT inventory_id, is_dismissed
FROM inventory_items
WHERE user_id = @test_uid AND is_dismissed = TRUE;
```

**驗證重點：**
- `depletion_date` = `purchase_date` + 你輸入的天數
- 同使用者 + 同商品 = UPDATE（UNIQUE 約束，不會重複）
- Dismiss 後 `is_dismissed = TRUE`，但 row 仍在

---

### UC3 — 價格警報

**瀏覽器操作：**
1. 進入 Alerts 頁面（/alerts）
2. 點「新增警報」，選一個商品，設定目標價（例如 Whole Milk，目標 $3.00）
3. 確認警報出現在列表中
4. 如果目前最低價 ≤ 目標價，確認顯示 triggered 狀態
5. 刪除剛剛建立的警報

**SQL 驗證：**
```sql
-- Step 2: 確認警報已寫入
SELECT pa.alert_id, p.name, pa.target_price, pa.created_at
FROM price_alerts pa
INNER JOIN products p ON pa.product_id = p.product_id
WHERE pa.user_id = @test_uid
ORDER BY pa.created_at DESC;

-- 比對：該商品目前最低價（判斷是否應該 triggered）
SELECT MIN(pr.unit_price) AS current_lowest
FROM price_records pr
INNER JOIN (
    SELECT variant_id, MAX(record_id) AS latest
    FROM price_records GROUP BY variant_id
) l ON pr.record_id = l.latest
INNER JOIN product_variants pv ON pr.variant_id = pv.variant_id
WHERE pv.product_id = <你選的 product_id>;

-- Step 5: 刪除後確認已不存在
SELECT * FROM price_alerts WHERE user_id = @test_uid;
```

---

### UC4 — 智慧警報（Smart Alerts）

**瀏覽器操作：**
1. 在 Alerts 頁面，滾到下方的 Smart Alerts 區塊
2. 如果有觸發的智慧警報，會顯示：商品名稱、目前價格、歷史均價、降價百分比、在哪家店

> 智慧警報是自動產生的：當你進入 Alerts 頁面時（`GET /api/alerts`），後端會檢查你的 favorites 裡的商品，如果目前最低價比歷史均價低 20% 以上，自動寫入 `todos` 表。

**SQL 驗證：**
```sql
-- 查看系統幫你產生的 smart alert
SELECT t.todo_id, p.name, t.todo_type, t.message, t.snapshot_price, t.compared_price
FROM todos t
INNER JOIN product_variants pv ON t.variant_id = pv.variant_id
INNER JOIN products p ON pv.product_id = p.product_id
WHERE t.user_id = @test_uid AND t.todo_type = 'buy_now'
ORDER BY t.created_at DESC;

-- 手動驗算：你的 favorites 裡哪些商品降價 ≥ 20%？
SELECT pv.product_id, p.name,
       MIN(pr_now.unit_price) AS current_lowest,
       AVG(pr_all.unit_price) AS historical_avg,
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
WHERE pv.product_id IN (
    SELECT product_id FROM user_favorites WHERE user_id = @test_uid
)
GROUP BY pv.product_id, p.name
HAVING drop_pct >= 20;
```

**驗證重點：**
- 前端 Smart Alerts 的商品 = SQL `HAVING drop_pct >= 20` 查出的商品
- `todos` 表裡同一商品不會重複（Transaction 去重）
- 如果 UC9 沒選到降價商品，Smart Alerts 可能是空的 — 這是正常的

---

### UC5 — 消費分析

> **前提：** 必須先在 UC2 把至少一個項目標為「已購買」，Insight 才有資料。

**瀏覽器操作：**
1. 進入 Insight 頁面（/insight）
2. 確認月度消費圖表有資料
3. 確認分類佔比有資料
4. 注意摘要文字

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

```sql
-- 一行搞定：刪除帳號，所有關聯資料自動 CASCADE 刪除
-- （user_favorites, shopping_lists → list_items, price_alerts, todos, inventory_items）
DELETE FROM users WHERE user_id = @test_uid;

-- 驗證已清理乾淨
SELECT 'users' AS tbl, COUNT(*) AS cnt FROM users WHERE user_id = @test_uid
UNION ALL
SELECT 'favorites', COUNT(*) FROM user_favorites WHERE user_id = @test_uid
UNION ALL
SELECT 'lists', COUNT(*) FROM shopping_lists WHERE user_id = @test_uid
UNION ALL
SELECT 'alerts', COUNT(*) FROM price_alerts WHERE user_id = @test_uid
UNION ALL
SELECT 'todos', COUNT(*) FROM todos WHERE user_id = @test_uid
UNION ALL
SELECT 'inventory', COUNT(*) FROM inventory_items WHERE user_id = @test_uid;
-- 全部應該是 0
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
│   ├── migration.sql           # ALTER TABLE 補欄位
│   ├── seed_data.sql           # 測試資料
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
| T1 | **前端：Inventory 表單預填 consumption 預設值** | F3 的 `default_consumption_days_per_unit` 已在 `products` 表中，後端 receipts.py 有使用，但 Inventory 頁面手動新增庫存時沒有從商品預設值自動帶入，使用者每次都要手打天數 | `front-end/src/pages/Inventory.js` |
| T2 | **前端：Smart Alerts 顯示優惠是否仍有效** | F5 的 `snapshot_price`/`compared_price` 後端已寫入 `todos` 表，但前端 Alerts 頁面沒有使用這兩個欄位。應比較 `snapshot_price` vs 目前最新價格，顯示「優惠仍有效」或「價格已回升」 | `front-end/src/pages/Alerts.js` |
| T3 | **自動爬蟲流程** | `db/queries/scrape.sql` 的 6 個 query 全部是註解 TODO。目前沒有主動抓取新價格的機制，所有價格資料來自 seed data。需實作：建立 scrape job → 寫入 price_records → 更新 scrape_jobs 狀態 → 檢查觸發的 price_alerts | `db/queries/scrape.sql`, 需新增 scrape runner |
| T4 | **爬蟲失敗追蹤** | F6 的 `scrape_failures` 表已建好，但沒有任何程式碼往裡面寫入。需在 T3 的爬蟲流程中，當單一 variant 抓取失敗時記錄到此表 | `scrape_failures` 表 |
| T5 | **Receipt OCR 使用 hardcoded 假資料** | Shopping Lists 頁面的 Receipt Scanner UI 已完成，後端 `POST /api/receipts` 也已實作（含 Transaction），但前端 `handleScan` 目前回傳寫死的假掃描結果，沒有接真正的 OCR 服務 | `front-end/src/pages/ShoppingLists.js:100` |
| T6 | **`GET /api/auth/me` endpoint** | API spec 定義了 `GET /api/auth/me`（回傳目前登入使用者資訊），但前端目前用 login response 裡的資料，沒有呼叫此 endpoint | `backend/routes/auth_routes.py` |

---

## Endpoint × DB 表 對照表

### 公開 Endpoint（不需登入）

| Endpoint | SQL query | 讀取的表 |
|----------|-----------|---------|
| `GET /api/retailers` | `retailers.get_all` | retailers |
| `GET /api/products` | `products.get_all_with_category` | products, categories |
| `GET /api/compare/{id}` | `compare.get_top5_cheapest` | price_records, product_variants, products, retailers, units, brands |
| `POST /api/compare/summary` | `compare.get_top5_cheapest` ×N | 同上 |
| `GET /api/trends/{id}` | `trends.get_monthly_avg_by_retailer`, `trends.get_seasonal_patterns` | price_records, product_variants, retailers, seasonal_patterns |
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
