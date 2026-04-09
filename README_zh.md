# SmartCart — 專案快速上手指南

SmartCart 是一個比價購物網站，讓使用者比較 Amazon、Target、Walmart 三家零售商的商品價格。前端用 React，後端用 Flask + PyMySQL（raw SQL），資料庫是遠端 MySQL。

## 啟動 Demo（三步驟）

### 1. 啟動後端

```bash
cd backend
source venv/bin/activate
python app.py            # 預設 port 5000
```

**自訂 port（三種方式，擇一即可）：**

```bash
# 方法一：指令參數
python app.py 5001

# 方法二：環境變數（一次性）
FLASK_PORT=5001 python app.py

# 方法三：寫進 .env（永久生效）
# 在 backend/.env 加上 FLASK_PORT=5001
```

> **macOS 注意：** AirPlay Receiver 預設佔用 port 5000，建議用上面任一方法改 port，
> 或到「系統設定 → 一般 → AirDrop 與接力」關掉 AirPlay 接收器。

### 2. 啟動前端

```bash
cd front-end
npm install    # 第一次才需要
npm start      # 開發伺服器跑在 http://localhost:3000
```

如果後端不是跑在 5000，需要同步改 `front-end/package.json`：

```json
"proxy": "http://localhost:5001"
```

### 3. 切換到真實 API

打開 `front-end/src/api/index.js`，把第 15 行改成：

```javascript
const USE_MOCK = false;
```

改完後前端會從 mock data 切換成呼叫後端 API，資料來自真實資料庫。

## 測試帳號

所有 demo 使用者的密碼都是 `password123`：

| 帳號 | 姓名 |
|------|------|
| alex.lee@example.com | Alex Lee |
| maria.chen@example.com | Maria Chen |
| sam.patel@example.com | Sam Patel |
| jordan.kim@example.com | Jordan Kim |
| taylor.nguyen@example.com | Taylor Nguyen |

## 跑測試

```bash
cd backend
venv/bin/python -m pytest tests/ -v
```

- `tests/test_unit_*.py` — Unit test（驗證密碼雜湊、JWT、Flask app 設定、401 保護）
- `tests/test_integration.py` — Integration test（透過 Flask test client 打真實 DB，涵蓋全部 23 個 endpoint）

只跑 unit test：

```bash
venv/bin/python -m pytest tests/test_unit_auth.py tests/test_unit_config.py tests/test_unit_app.py -v
```

只跑 integration test：

```bash
venv/bin/python -m pytest tests/test_integration.py -v
```

## 手動測試 API

```bash
# 不需登入的 endpoint
curl http://localhost:5001/api/retailers
curl http://localhost:5001/api/products
curl http://localhost:5001/api/compare/1

# 登入取得 token
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alex.lee@example.com","password":"password123"}'

# 用 token 呼叫需要登入的 endpoint
curl http://localhost:5001/api/user/favorites \
  -H "Authorization: Bearer <貼上拿到的 token>"
```

## 專案結構

```
Basket-Optimiser/
├── front-end/              # React 前端
│   ├── src/
│   │   ├── pages/          # 10 個頁面元件
│   │   ├── components/     # 共用元件（Nav, Icons）
│   │   ├── api/index.js    # API 層（USE_MOCK 開關在這裡）
│   │   └── data/           # Mock 資料
│   └── package.json
│
├── backend/                # Flask 後端
│   ├── app.py              # 進入點，註冊 10 個 blueprint
│   ├── config.py           # 讀 .env（DB 連線、JWT、port）
│   ├── db.py               # PyMySQL 連線
│   ├── auth.py             # bcrypt + JWT + @require_auth
│   ├── .env                # 機密設定（不進 git）
│   ├── routes/             # 10 個路由檔，對應 23 個 endpoint
│   └── tests/              # Unit + Integration 測試（52 個）
│
├── db/                     # 資料庫 schema（原始 DDL）
└── docs/                   # API 規格、Use Cases、Table 屬性
```

## 資料庫

- Host: `167.71.90.83` / Database: `smartcart` / User: `joj161`
- 密碼在 `backend/.env`，不要 commit 到 git
- Schema: 15 張表，定義在 `backend/docs/schema.sql`
- Migration: `backend/docs/migration.sql`（新增 color、icon、user_favorites、dismissed）

## 功能介紹與使用指南

以下說明 SmartCart 的每個功能、操作方式、預期結果，以及背後會影響哪些資料庫表。

---

### UC1 — 商品比價

**怎麼用：**
1. 進入 Compare 頁面，選擇想比較的商品（例如 Whole Milk）
2. 系統會列出 Amazon、Target、Walmart 三家零售商的價格，依照「每單位價格」由低到高排序，最多顯示前 5 筆

**預期結果：**
- 每筆結果顯示：商品名稱、品牌、零售商、包裝大小、總價、單位價格（例如 $0.059/fl oz）
- 第 1 名就是最便宜的選項

**呼叫的 API：**
- `GET /api/compare/{product_id}` — 取得單一商品的前 5 便宜選項

**影響的 DB 表（唯讀）：**

| 表名 | 用途 |
|------|------|
| `products` | 商品名稱、分類 |
| `product_variants` | 各零售商的包裝規格（pack_size, unit_quantity） |
| `price_records` | 取最新一筆價格來計算 unit_price |
| `retailers` | 零售商名稱、顏色 |
| `units` | 單位標籤（per oz, per lb 等） |

**觀察方式：**
```sql
-- 查看某商品最新的比價結果
SELECT pv.variant_id, r.name AS store, pr.price, pr.unit_price
FROM price_records pr
INNER JOIN (SELECT variant_id, MAX(record_id) AS latest FROM price_records GROUP BY variant_id) l
  ON pr.record_id = l.latest
INNER JOIN product_variants pv ON pr.variant_id = pv.variant_id
INNER JOIN retailers r ON pv.retailer_id = r.retailer_id
WHERE pv.product_id = 1
ORDER BY pr.unit_price ASC;
```

---

### UC2 — 購物清單管理

**怎麼用：**
1. 登入後進入 Shopping Lists 頁面
2. 點「新增清單」，輸入名稱（例如「每週採購」）
3. 在清單中新增商品，選擇規格和數量
4. 系統自動計算：如果整張清單全在 Walmart 買要多少錢、全在 Target 買要多少錢……
5. 買完後可以勾選「已購買」

**預期結果：**
- 清單詳細頁顯示 `store_totals`（每家店的總價）
- `cheapest_store` 標出最便宜的店
- `savings_vs_expensive` 顯示最貴和最便宜之間的差額

**呼叫的 API：**
- `POST /api/lists` — 建立新清單
- `POST /api/lists/{list_id}/items` — 新增項目（**含 Transaction**）
- `GET /api/lists/{list_id}` — 查看清單詳情與各店總價
- `PATCH /api/lists/{list_id}/items/{item_id}` — 勾選已購買

**影響的 DB 表：**

| 操作 | 寫入的表 | 說明 |
|------|----------|------|
| 建立清單 | `shopping_lists` | 新增一筆 row |
| 新增項目 | `list_items` + `shopping_lists` | **Transaction**：插入項目 + 更新 estimated_total，失敗則 ROLLBACK |
| 勾選已購買 | `list_items` | 更新 is_purchased = TRUE, purchased_at = NOW() |

**觀察方式：**
```sql
-- 查看某使用者的購物清單
SELECT * FROM shopping_lists WHERE user_id = 1;

-- 查看清單內的項目
SELECT li.*, pv.product_id, p.name
FROM list_items li
INNER JOIN product_variants pv ON li.variant_id = pv.variant_id
INNER JOIN products p ON pv.product_id = p.product_id
WHERE li.list_id = 1;

-- 驗證 Transaction：新增項目後 estimated_total 是否正確更新
SELECT list_id, name, estimated_total FROM shopping_lists WHERE list_id = 1;
```

---

### UC3 — 價格警報

**怎麼用：**
1. 登入後進入 Alerts 頁面
2. 點「新增警報」，選擇商品和目標價格（例如：Milk 低於 $3.00 時通知我）
3. 系統會自動比對目前最低價格與你設定的目標價

**預期結果：**
- 如果目前最低價 ≤ 目標價 → `is_triggered: true`，顯示在哪家店觸發的
- 如果還沒到目標價 → `is_triggered: false`

**呼叫的 API：**
- `POST /api/alerts` — 建立警報
- `GET /api/alerts` — 查看所有警報（含智慧警報）
- `DELETE /api/alerts/{alert_id}` — 刪除警報

**影響的 DB 表：**

| 操作 | 寫入的表 | 說明 |
|------|----------|------|
| 建立警報 | `price_alerts` | 新增 row：user_id, product_id, target_price |
| 刪除警報 | `price_alerts` | 刪除該 row |

**觀察方式：**
```sql
-- 查看某使用者的警報
SELECT pa.*, p.name FROM price_alerts pa
INNER JOIN products p ON pa.product_id = p.product_id
WHERE pa.user_id = 1;
```

---

### UC4 — 智慧警報（Smart Alerts）

**怎麼用：**
- 不需要手動操作，系統自動偵測
- 當你呼叫 `GET /api/alerts` 時，後端會自動檢查你追蹤的商品（favorites + alerts 裡的商品）
- 如果某商品目前最低價比歷史平均低 20% 以上，自動產生一筆 smart alert

**預期結果：**
- Smart Alerts 區塊顯示：商品名稱、目前價格、歷史平均價、下跌百分比、在哪家店
- 例如：「Protein Bar 在 Amazon 降價 33%（目前 $1.10，平均 $1.65）」

**影響的 DB 表：**

| 操作 | 寫入的表 | 說明 |
|------|----------|------|
| 偵測到降價 | `todos` | **Transaction**：先檢查是否已存在同商品的 todo，沒有才 INSERT，避免重複 |

**觀察方式：**
```sql
-- 查看系統自動產生的 smart alert todos
SELECT t.*, p.name
FROM todos t
INNER JOIN product_variants pv ON t.variant_id = pv.variant_id
INNER JOIN products p ON pv.product_id = p.product_id
WHERE t.user_id = 1 AND t.todo_type = 'buy_now';
```

---

### UC5 — 消費分析

**怎麼用：**
1. 登入後進入 Insight 頁面
2. 系統自動顯示：月度消費趨勢圖、分類消費佔比、消費摘要與洞察

**預期結果：**
- **月度圖表**：過去 6 個月每月花了多少錢
- **分類佔比**：Dairy 34%、Meat 26%……
- **摘要**：6 個月總消費、月平均、本月 vs 上月的變化百分比
- **洞察文字**：「本月消費下降了 15%」、「Dairy 是你花最多的分類」

**呼叫的 API：**
- `GET /api/insight/monthly` — 月度消費
- `GET /api/insight/categories` — 分類消費
- `GET /api/insight/summary` — 摘要 + 洞察

**影響的 DB 表（唯讀）：**
- `list_items`（is_purchased = TRUE 的資料）
- `shopping_lists`（篩選 user_id）
- `price_records`（價格）
- `products` + `categories`（分類名稱）

**觀察方式：**
```sql
-- 查看某使用者的購買紀錄（insight 的資料來源）
SELECT li.purchased_at, p.name, c.name AS category, pr.price, li.quantity
FROM list_items li
INNER JOIN shopping_lists sl ON li.list_id = sl.list_id
INNER JOIN product_variants pv ON li.variant_id = pv.variant_id
INNER JOIN products p ON pv.product_id = p.product_id
LEFT JOIN categories c ON p.category_id = c.category_id
INNER JOIN (SELECT variant_id, MAX(record_id) AS latest FROM price_records GROUP BY variant_id) l
  ON pv.variant_id = l.variant_id
INNER JOIN price_records pr ON pr.record_id = l.latest
WHERE sl.user_id = 1 AND li.is_purchased = TRUE
ORDER BY li.purchased_at DESC;
```

---

### UC6 — 家庭庫存追蹤

**怎麼用：**
1. 登入後進入 Inventory 頁面
2. 新增庫存項目：選商品、輸入數量、輸入預計幾天用完（例如：牛奶 1 加侖、7 天用完）
3. 系統自動計算預計用完日期（purchase_date + consumption_days）
4. 快用完的項目（≤ 2 天）會標示為 `status: "low"`
5. 如果不想看到提醒，可以點 dismiss

**預期結果：**
- 「快用完」區塊：顯示 days_left ≤ 2 的項目，建議加入購物清單
- 「庫存正常」區塊：顯示還有存貨的項目
- Dismiss 後項目不會再出現在「快用完」，但仍在庫存列表中

**呼叫的 API：**
- `GET /api/inventory` — 查看庫存（含 depletion 狀態）
- `POST /api/inventory` — 新增/更新庫存
- `PATCH /api/inventory/{id}/dismiss` — 關閉提醒

**影響的 DB 表：**

| 操作 | 寫入的表 | 說明 |
|------|----------|------|
| 新增庫存 | `inventory_items` | INSERT 或 UPDATE（同使用者+同商品會覆蓋） |
| Dismiss | `inventory_items` | 設定 dismissed = TRUE |

**觀察方式：**
```sql
-- 查看某使用者的庫存，依照到期日排序
SELECT ii.*, p.name, DATEDIFF(ii.depletion_date, CURDATE()) AS days_left
FROM inventory_items ii
INNER JOIN products p ON ii.product_id = p.product_id
WHERE ii.user_id = 1
ORDER BY ii.depletion_date ASC;
```

---

### UC7 — 使用者帳號

**怎麼用：**
1. 在 Sign In 頁面註冊新帳號（email + 密碼 + 顯示名稱）
2. 或用現有帳號登入
3. 登入後可以使用所有需要認證的功能（清單、庫存、警報、分析）

**預期結果：**
- 註冊/登入成功後回傳 JWT token
- 前端將 token 存起來，後續 API 請求帶在 `Authorization: Bearer <token>` header
- 沒有 token 或 token 過期 → 所有 protected endpoint 回傳 401

**呼叫的 API：**
- `POST /api/auth/register` — 註冊
- `POST /api/auth/login` — 登入

**影響的 DB 表：**

| 操作 | 寫入的表 | 說明 |
|------|----------|------|
| 註冊 | `users` | INSERT：email, password_hash (bcrypt), display_name |

**觀察方式：**
```sql
-- 查看所有使用者（不要 SELECT password_hash）
SELECT user_id, email, display_name, created_at FROM users;
```

---

### UC8 — 季節性降價預測

**怎麼用：**
1. 進入 Trends 頁面，選擇一個商品
2. 系統顯示過去幾個月各零售商的價格走勢圖
3. 如果資料庫中有該商品的季節性模式（例如 Black Friday 通常降價 25%），會在未來月份顯示預測價格（虛線）

**預期結果：**
- 歷史月份：顯示各零售商的平均單位價格
- 未來月份：顯示 `predicted` 預測價格（根據 seasonal_patterns 計算）
- 前端畫實線（歷史）+ 虛線（預測）

**呼叫的 API：**
- `GET /api/trends/{product_id}`

**影響的 DB 表（唯讀）：**

| 表名 | 用途 |
|------|------|
| `price_records` | 歷史價格，按月分組取平均 |
| `product_variants` | 連結商品和零售商 |
| `seasonal_patterns` | 季節性折扣模式（event_name, typical_month, avg_discount_pct） |
| `retailers` | 零售商名稱 |

**觀察方式：**
```sql
-- 查看某商品的季節性模式
SELECT sp.*, r.name AS retailer
FROM seasonal_patterns sp
INNER JOIN retailers r ON sp.retailer_id = r.retailer_id
WHERE sp.product_id = 1;
```

---

### 功能 vs DB 表 對照總表

| 功能 | 讀取的表 | 寫入的表 | Transaction |
|------|---------|---------|-------------|
| UC1 比價 | products, product_variants, price_records, retailers, units | — | — |
| UC2 購物清單 | shopping_lists, list_items, products, price_records | shopping_lists, list_items | 新增項目時 INSERT + UPDATE 原子操作 |
| UC3 價格警報 | price_alerts, products, price_records | price_alerts | — |
| UC4 智慧警報 | price_records, todos, products, user_favorites | todos | 偵測 + 去重 + INSERT 原子操作 |
| UC5 消費分析 | list_items, shopping_lists, price_records, categories | — | — |
| UC6 庫存追蹤 | inventory_items, products | inventory_items | — |
| UC7 帳號 | users | users | — |
| UC8 趨勢預測 | price_records, seasonal_patterns, retailers | — | — |

---

## 重要設計筆記

- **product_id 是整數**，不是字串（API spec 裡寫的 `"milk"` 是舊版，忽略）
- **兩個 Transaction**（課程要求）：
  1. `POST /api/lists/{id}/items` — 新增項目 + 更新預估總額，失敗 ROLLBACK
  2. `GET /api/alerts` — 偵測價格下跌 > 20% 自動產生 smart alert 寫入 todos 表
- **Endpoint #21（Receipt OCR）** 沒有實作
- 總共 23 個 endpoint：7 個公開 + 16 個需要 JWT 認證
- 所有 SQL 手寫（PyMySQL raw SQL），沒用 SQLAlchemy（課程評分要看 SQL）

## 待修 / 注意事項

- **`front-end/node_modules/`** — 之前被 commit 進雲端 git，需到 GitHub 上刪除
- **前端 product_id 型別已更新** — mock data 的字串 ID 已改為整數，切換到真實 API 時由 `GET /api/products` 動態取得商品列表
- **自動爬蟲流程尚未實作** — 目前後端只有回應前端請求的 API，沒有主動抓取新價格資料的機制。預計實作方式：
  1. 新增一個 scrape endpoint 或 CLI 指令（例如 `python scrape.py`）
  2. 執行時在 `scrape_jobs` 表建立一筆新 job（status = running）
  3. 呼叫 DB 同學的 mock data script 產生新的價格資料
  4. Script 產生的資料寫入 `price_records`（及可能的新 `product_variants`）
  5. 更新 `scrape_jobs` 狀態為 success/failed
  6. 檢查 `price_alerts`，如果有商品降到使用者設定的目標價以下則更新 triggered_at
  7. DB 相關表：`scrape_jobs`（寫入）、`price_records`（寫入）、`product_variants`（可能寫入）、`price_alerts`（可能更新）
