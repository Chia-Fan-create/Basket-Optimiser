# SmartCart — Frontend End-to-End Testing Guide

SmartCart is a price comparison shopping app that lets users compare product prices across Amazon, Target, and Walmart. The frontend is built with React 18, the backend uses Flask + PyMySQL (raw SQL), and the database is a remote MySQL instance.

---

## Environment Setup

### Prerequisites

- Python 3.10+
- Node.js 16+
- MySQL client (for querying the database directly to verify results)

### 1. Start the Backend

```bash
cd backend
source venv/bin/activate
python app.py
```

The backend port is controlled by `FLASK_PORT` in `backend/.env` (default: 5000). The frontend proxy currently points to `http://127.0.0.1:50123` (set in `front-end/package.json`) — make sure both sides match.

> **macOS note:** AirPlay Receiver occupies port 5000 by default. It's recommended to set `FLASK_PORT=50123` in `.env`, or disable AirPlay.

### 2. Start the Frontend

```bash
cd front-end
npm start    # http://localhost:3000
```

### 3. Confirm USE_MOCK = false

Open `front-end/src/api/index.js` at line 15 and confirm it reads:

```javascript
const USE_MOCK = false;
```

This ensures all frontend API calls are routed to the real backend, with data served from the MySQL database.

### 4. Connect to MySQL

```bash
Connect to MySQL via MySQL Workbench
```

The password is in `DB_PASSWORD` inside `backend/.env`. Keep this connection open throughout testing to verify data with SQL at any point.

### Test Accounts

All demo users share the password `password123`:

| Email | Display Name |
|-------|-------------|
| alex.lee@example.com | Alex Lee |
| maria.chen@example.com | Maria Chen |
| sam.patel@example.com | Sam Patel |
| jordan.kim@example.com | Jordan Kim |
| taylor.nguyen@example.com | Taylor Nguyen |

---

## E2E Test Flow

> **How to use:** Copy the entire SQL block below into MySQL Workbench. Comments contain the full browser steps and expected results. Read from top to bottom — when you see 👉, go perform the action in the browser, then select the SQL below it and press ⌘+Enter (or Ctrl+Enter) to verify the database.
>
> **Testing principles:**
> - **Create a brand new account** for each test run to ensure a clean starting state
> - All SQL queries use the `@test_uid` variable — no need to manually substitute user_id
> - Delete the account when done; all data is automatically CASCADE-deleted without affecting others

```sql
-- ============================================================
-- SmartCart E2E Test — Full Flow
-- ============================================================
-- Prerequisites: backend running on localhost:50123,
--                frontend running on localhost:3000,
--                USE_MOCK = false, MySQL Workbench connected
-- ============================================================


-- ══════════════════════════════════════════════════════════════
-- UC7 — Register a New Account
-- ══════════════════════════════════════════════════════════════
-- 👉 Browser steps:
--    1. Go to http://localhost:3000/login
--    2. Switch to Register
--    3. Email: e2e.test@example.com
--       Password: password123
--       Display Name: E2E Test
--    4. Click Register → auto-login, redirect to Dashboard
--    5. Press F5 to refresh → confirm you are not logged out (JWT session persists)
-- ──────────────────────────────────────────────────────────────

SELECT *
FROM users WHERE email = 'e2e.test@example.com';
-- ✅ 1 row, password_hash starts with $2b$ (bcrypt)

SET @test_uid = (SELECT user_id FROM users WHERE email = 'e2e.test@example.com');
SELECT @test_uid;
-- ✅ Has a value (note this number — all subsequent queries use @test_uid)


-- ══════════════════════════════════════════════════════════════
-- UC9 — Set Favorite Products
-- ══════════════════════════════════════════════════════════════
-- 👉 Browser steps:
--    1. On the Dashboard, click edit → go to /select
--    2. Select: Whole Milk, Sparkling Water, Ground Coffee, Ice Cream
--    3. Click "See my dashboard →" to save
--    4. Confirm the Dashboard shows 4 product cards
--    5. Press F5 to refresh → confirm all 4 remain
-- ──────────────────────────────────────────────────────────────

SELECT uf.product_id, p.name
FROM user_favorites uf
INNER JOIN products p ON uf.product_id = p.product_id
WHERE uf.user_id = @test_uid
ORDER BY uf.product_id;
-- ✅ 4 rows: 1 Whole Milk, 5 Sparkling Water, 6 Ground Coffee, 17 Ice Cream

-- 👉 Browser steps:
--    6. Go back to /select → deselect Sparkling Water → save
--    7. Press F5 → confirm only 3 remain
-- ──────────────────────────────────────────────────────────────

SELECT uf.product_id, p.name
FROM user_favorites uf
INNER JOIN products p ON uf.product_id = p.product_id
WHERE uf.user_id = @test_uid
ORDER BY uf.product_id;
-- ✅ 3 rows: 1, 6, 17 (Sparkling Water removed)

-- 👉 Browser steps:
--    8. Go back to /select → add Sparkling Water back → save
--       (UC8 will need Sparkling Water for the trends view)
-- ──────────────────────────────────────────────────────────────

SELECT uf.product_id, p.name
FROM user_favorites uf
INNER JOIN products p ON uf.product_id = p.product_id
WHERE uf.user_id = @test_uid
ORDER BY uf.product_id;
-- ✅ 4 rows: 1, 5, 6, 17 (back to 4)


-- ══════════════════════════════════════════════════════════════
-- UC1 — Product Price Comparison
-- ══════════════════════════════════════════════════════════════
-- 👉 Browser steps:
--    1. Go to /compare
--    2. Click the Whole Milk tab
--    3. Confirm 3 results, sorted by unit price ascending
--    4. Rank #1 is labeled BEST VALUE
--    5. Confirm there is no "+ List" button on the page (it has been removed)
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
-- ✅ Sorted ascending; frontend rank #1 = SQL row #1
-- ✅ Prices match exactly (which store is cheapest depends on the latest scrape data)


-- ══════════════════════════════════════════════════════════════
-- UC8 — Price Trends & Seasonal Predictions
-- ══════════════════════════════════════════════════════════════
-- 👉 Browser steps:
--    1. Go to /trends → click the Ice Cream tab
--    2. Confirm the chart x-axis shows 12 months from May through Apr
--    3. Confirm 3 solid lines (Amazon orange / Target red / Walmart blue) + dashed line (Predicted grey)
--    4. Hover over a data point → tooltip shows retailer, price, and month
--    5. Visual check: summer months (Jun–Aug) lines are higher, winter (Nov–Jan) lower
--    6. Seasonal Patterns cards below the chart:
--       - Prime Day Ice Cream (Amazon, Jul) 12.0% off — 2023: 8.5%, 2024: 13.1%, 2025: 14.4%
--       - Ice Cream Season End (Walmart, Oct) 15.6% off — 2023: 12.3%, 2024: 16.8%, 2025: 17.7%
--    7. Switch to the Sparkling Water tab → confirm the trend is reversed (lower in summer, higher in winter)
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
-- ✅ ~12 months of data
-- ✅ Walmart Jul (~0.12) > Nov (~0.10) = higher in summer, lower in winter

SELECT sp.event_name, sp.typical_month, sp.avg_discount_pct,
       r.name AS retailer, sp.confidence_score
FROM seasonal_patterns sp
INNER JOIN retailers r ON sp.retailer_id = r.retailer_id
WHERE sp.product_id = 17;
-- ✅ 2 patterns

SELECT spy.pattern_id, spy.year, spy.observed_discount
FROM seasonal_pattern_years spy
INNER JOIN seasonal_patterns sp ON spy.pattern_id = sp.pattern_id
WHERE sp.product_id = 17
ORDER BY spy.pattern_id, spy.year;
-- ✅ Each pattern has observed discounts for 2023, 2024, and 2025


-- ══════════════════════════════════════════════════════════════
-- UC2 — Shopping List Management
-- ══════════════════════════════════════════════════════════════
-- 👉 Browser steps:
--    1. Go to /lists → confirm it is empty (new account)
--    2. Click + New List → enter "E2E Test List" → create
-- ──────────────────────────────────────────────────────────────

SELECT list_id, name, estimated_total, created_at
FROM shopping_lists WHERE user_id = @test_uid;
-- ✅ 1 row

SET @test_list = (SELECT list_id FROM shopping_lists
                  WHERE user_id = @test_uid ORDER BY created_at DESC LIMIT 1);

-- 👉 Browser steps:
--    3. Click + Add Item → search "milk" → select Whole Milk (auto-added with qty 1)
--    4. Search "granola" → select Granola Bars (qty 1)
--    5. Close the search modal → confirm Cheapest Store, per-retailer totals, and Savings are displayed
-- ──────────────────────────────────────────────────────────────

SELECT li.list_item_id, pv.product_id, p.name, li.quantity, li.variant_id
FROM list_items li
INNER JOIN product_variants pv ON li.variant_id = pv.variant_id
INNER JOIN products p ON pv.product_id = p.product_id
WHERE li.list_id = @test_list;
-- ✅ 2 rows: Whole Milk + Granola Bars

SELECT list_id, name, estimated_total
FROM shopping_lists WHERE list_id = @test_list;
-- ✅ estimated_total > 0

-- 👉 Browser steps:
--    6. Click ✕ next to Granola Bars to remove it
-- ──────────────────────────────────────────────────────────────

SELECT COUNT(*) AS item_count FROM list_items WHERE list_id = @test_list;
-- ✅ 1 (Granola Bars removed)

SELECT estimated_total FROM shopping_lists WHERE list_id = @test_list;
-- ✅ Granola Bars price has been subtracted

-- 👉 Browser steps:
--    7. Check the checkbox next to Whole Milk (mark as purchased)
-- ──────────────────────────────────────────────────────────────

SELECT list_item_id, is_purchased, purchased_at
FROM list_items WHERE list_id = @test_list;
-- ✅ is_purchased = 1, purchased_at has a value

-- 👉 Browser steps:
--    8. Click Process Purchased Items → confirm items look correct → Confirm & Save
-- ──────────────────────────────────────────────────────────────

SELECT ii.inventory_id, p.name, ii.quantity, ii.depletion_date
FROM inventory_items ii
INNER JOIN products p ON ii.product_id = p.product_id
WHERE ii.user_id = @test_uid;
-- ✅ Whole Milk has been automatically added to inventory


-- ══════════════════════════════════════════════════════════════
-- UC2 (continued) — Clear Purchased Items
-- ══════════════════════════════════════════════════════════════
-- 👉 Browser steps:
--    9. Return to /lists → open E2E Test List
--       Success screen → Done — Clear purchased items → list items cleared, but list name remains
-- ──────────────────────────────────────────────────────────────

SELECT COUNT(*) AS remaining_items FROM list_items WHERE list_id = @test_list;
-- ✅ 0

SELECT list_id, name, estimated_total FROM shopping_lists WHERE list_id = @test_list;
-- ✅ List row still exists, estimated_total = 0


-- ══════════════════════════════════════════════════════════════
-- UC6 — Household Inventory Tracking
-- ══════════════════════════════════════════════════════════════
-- ⚠️ UC2's Process step already added Whole Milk to inventory, so it won't be empty
--
-- 👉 Browser steps:
--    1. Go to /inventory → confirm Whole Milk is already there (added during UC2)
--    2. Click + Add Item → search "coffee" → select Ground Coffee
--       Quantity: 2, Days per unit: auto-filled as 21 → Save
--    3. Confirm Ground Coffee appears in the list with qty=2
-- ──────────────────────────────────────────────────────────────

SELECT ii.inventory_id, p.name, ii.quantity,
       ii.purchase_date, ii.depletion_date, ii.is_dismissed,
       DATEDIFF(ii.depletion_date, ii.purchase_date) AS total_days
FROM inventory_items ii
INNER JOIN products p ON ii.product_id = p.product_id
WHERE ii.user_id = @test_uid
ORDER BY p.name;
-- ✅ Ground Coffee qty=2, total_days=42 + Whole Milk (from UC2)

-- 👉 Browser steps:
--    4. Add Ground Coffee again (qty=1) → confirm still only 1 row, qty becomes 3
-- ──────────────────────────────────────────────────────────────

SELECT COUNT(*) AS row_count
FROM inventory_items
WHERE user_id = @test_uid AND product_id = 6;
-- ✅ 1 (not 2 — UPSERT worked correctly)

SELECT ii.inventory_id, p.name, ii.quantity,
       DATEDIFF(ii.depletion_date, ii.purchase_date) AS total_days
FROM inventory_items ii
INNER JOIN products p ON ii.product_id = p.product_id
WHERE ii.user_id = @test_uid AND ii.product_id = 6;
-- ✅ quantity=3, total_days=63 (3 × 21)

-- 👉 Browser steps:
--    5. Test Dismiss → add an item that is almost expired:
--       Search "pasta" → select Pasta → Quantity: 1, Days per unit: change to 1 → Save
--    6. Pasta appears in the Running Low section (expires tomorrow)
--       Dismiss and + Add to List buttons are visible
--    7. Click Dismiss → Pasta disappears from Running Low
--    8. (+ Add to List only navigates to /lists and does not auto-add items — this is by design)
-- ──────────────────────────────────────────────────────────────

SELECT ii.inventory_id, p.name, ii.is_dismissed
FROM inventory_items ii
INNER JOIN products p ON ii.product_id = p.product_id
WHERE ii.user_id = @test_uid
ORDER BY p.name;
-- ✅ Pasta: is_dismissed=1, Ground Coffee and Whole Milk: is_dismissed=0


-- ══════════════════════════════════════════════════════════════
-- UC3 — Price Alerts
-- ══════════════════════════════════════════════════════════════
-- 👉 Browser steps:
--    1. Go to /alerts
--    2. Add alert #1: select Whole Milk, set target price to 0.08
--       (above the current lowest price ~$0.059, so it will trigger immediately)
--    3. Confirm it appears in the Triggered section (✅ green)
--    4. Add alert #2: select Ice Cream, set target price to 0.01
--       (far below current price, will not trigger)
--    5. Confirm it appears in the Active section (with progress bar)
-- ──────────────────────────────────────────────────────────────

SELECT pa.alert_id, p.name, pa.target_price, pa.is_active, pa.triggered_at
FROM price_alerts pa
INNER JOIN products p ON pa.product_id = p.product_id
WHERE pa.user_id = @test_uid;
-- ✅ 2 rows, triggered_at is NULL for both — this is expected
-- ⚠️ triggered_at is only written when the scrape job runs
-- ⚠️ The frontend's "triggered" state is calculated in real time (current_price <= target_price), not from triggered_at

-- Verify the frontend trigger logic: compare current lowest price vs. target price
SELECT pa.alert_id, p.name, pa.target_price,
       (SELECT MIN(pr.unit_price)
        FROM price_records pr
        INNER JOIN (SELECT variant_id, MAX(record_id) AS latest FROM price_records GROUP BY variant_id) l
          ON pr.record_id = l.latest
        INNER JOIN product_variants pv ON pr.variant_id = pv.variant_id
        WHERE pv.product_id = pa.product_id) AS current_lowest
FROM price_alerts pa
INNER JOIN products p ON pa.product_id = p.product_id
WHERE pa.user_id = @test_uid;
-- ✅ Whole Milk: current_lowest (~0.059) <= target (0.08) → frontend shows triggered
-- ✅ Ice Cream: current_lowest (~0.10) > target (0.01) → frontend shows active

-- 👉 Browser steps:
--    6. Delete the Ice Cream alert (click ✕)
-- ──────────────────────────────────────────────────────────────

SELECT COUNT(*) FROM price_alerts WHERE user_id = @test_uid;
-- ✅ 1 (only Whole Milk remains)


-- ══════════════════════════════════════════════════════════════
-- UC8 Pre-check — Record data_points Before Scrape
-- ══════════════════════════════════════════════════════════════

SELECT r.name AS retailer, COUNT(*) AS data_points_before
FROM price_records pr
INNER JOIN product_variants pv ON pr.variant_id = pv.variant_id
INNER JOIN retailers r ON pv.retailer_id = r.retailer_id
WHERE pv.product_id = 17
  AND YEAR(pr.scraped_at) = 2026 AND MONTH(pr.scraped_at) = 4
GROUP BY r.name;
-- 📝 Note down the data_points_before number for each retailer


-- ══════════════════════════════════════════════════════════════
-- Simulate Scrape — POST /api/admin/scrape
-- ══════════════════════════════════════════════════════════════
-- 👉 Browser steps:
--    1. Go to /select → select all 17 products → save
--       (ensures forced_drops from the scrape will always hit favorites, guaranteeing Smart Alert triggers)
--
-- 👉 Terminal steps:
--    2. Run: curl -X POST http://localhost:50123/api/admin/scrape
--    3. Confirm the returned JSON contains:
--       - success: true
--       - prices_recorded: ~50
--       - jobs_created: 3
--       - forced_drops: 6 entries (2 products × 3 retailers, 25–35% price drop)
--       - alerts_triggered: >= 1
--    4. ⚠️ Note down the product_id values in forced_drops — you'll need them for UC4
-- ──────────────────────────────────────────────────────────────

SELECT job_id, retailer_id, status, items_scraped
FROM scrape_jobs ORDER BY job_id DESC LIMIT 3;
-- ✅ 3 rows with status='success', items_scraped ≈ 17

SELECT COUNT(*) AS new_prices
FROM price_records
WHERE scrape_job_id >= (SELECT MAX(job_id) - 2 FROM scrape_jobs);
-- ✅ ~50 rows

-- Scrape failure log (feedback F6: scrape_failures table)
SELECT failure_id, variant_id, error_message
FROM scrape_failures ORDER BY failure_id DESC LIMIT 5;
-- ✅ If failures > 0, entries with errors like HTTP 503, CAPTCHA, etc. appear here

SELECT pa.alert_id, p.name, pa.target_price, pa.triggered_at
FROM price_alerts pa
INNER JOIN products p ON pa.product_id = p.product_id
WHERE pa.user_id = @test_uid;
-- ✅ Whole Milk triggered_at now has a value (scrape triggered it)


-- ══════════════════════════════════════════════════════════════
-- UC4 — Smart Alerts
-- ══════════════════════════════════════════════════════════════
-- 👉 Browser steps:
--    1. Press F5 to refresh /alerts (detection only triggers on refresh)
--    2. Confirm Whole Milk alert shows Triggered (✅ green)
--    3. Scroll down to the Smart Alerts section (⚡ icon)
--       → Because all products are in favorites, forced_drops are guaranteed to appear here
--       → You should see Smart Alert cards
--    4. Verify each card shows: product name, drop %, current price, retailer
--       + "Deal still valid" or "Price recovered" text
--    5. Cross-reference forced_drops product_id from the terminal → product names should match
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
-- ⚠️ This SQL is an approximate check — may return more rows than the frontend
--    (SQL uses ROUND to 1 decimal place; backend uses Python integer rounding)
-- ⚠️ Use the todos table below as the authoritative source

-- 👇 This is the correct verification baseline: todos count = frontend Smart Alert card count
SELECT t.todo_id, p.name, t.snapshot_price, t.compared_price
FROM todos t
INNER JOIN product_variants pv ON t.variant_id = pv.variant_id
INNER JOIN products p ON pv.product_id = p.product_id
WHERE t.user_id = @test_uid AND t.todo_type = 'buy_now';
-- ✅ Count matches the number of Smart Alert cards in the frontend

-- 👉 Browser steps:
--    6. Go to /select → restore original 4 products: Whole Milk, Sparkling Water, Ground Coffee, Ice Cream → save


-- ══════════════════════════════════════════════════════════════
-- UC8 — Price Trends (Post-Scrape Verification)
-- ══════════════════════════════════════════════════════════════
-- 👉 Browser steps:
--    1. Go back to /trends → select Ice Cream
--    2. Confirm the April data point has been updated (scrape added new prices)
-- ──────────────────────────────────────────────────────────────

SELECT r.name AS retailer,
       ROUND(AVG(pr.unit_price), 4) AS avg_unit_price,
       COUNT(*) AS data_points_after
FROM price_records pr
INNER JOIN product_variants pv ON pr.variant_id = pv.variant_id
INNER JOIN retailers r ON pv.retailer_id = r.retailer_id
WHERE pv.product_id = 17
  AND YEAR(pr.scraped_at) = 2026 AND MONTH(pr.scraped_at) = 4
GROUP BY r.name;
-- ✅ data_points_after = data_points_before + 1 (one new record per retailer)
-- ✅ Compare against the numbers you noted earlier


-- ══════════════════════════════════════════════════════════════
-- UC5 — Spending Analytics
-- ══════════════════════════════════════════════════════════════
-- ⚠️ Data comes from purchases + purchase_items (snapshot written during Process)
-- ⚠️ Clearing the shopping list does not affect this data
--
-- 👉 Browser steps:
--    1. Go to /insight
--    2. Confirm the monthly spending chart has one bar (current month)
--    3. Confirm category breakdown: Dairy 100%
--    4. Confirm the summary text mentions Dairy as the largest spending category
-- ──────────────────────────────────────────────────────────────

SELECT DATE_FORMAT(p.purchased_at, '%Y-%m') AS month,
       ROUND(SUM(pi.price * pi.quantity), 2) AS total
FROM purchase_items pi
INNER JOIN purchases p ON pi.purchase_id = p.purchase_id
WHERE p.user_id = @test_uid
GROUP BY month
ORDER BY month;
-- ✅ Amount matches the monthly chart in the frontend

SELECT c.name AS category,
       ROUND(SUM(pi.price * pi.quantity), 2) AS total
FROM purchase_items pi
INNER JOIN purchases p ON pi.purchase_id = p.purchase_id
INNER JOIN products prod ON pi.product_id = prod.product_id
LEFT JOIN categories c ON prod.category_id = c.category_id
WHERE p.user_id = @test_uid
GROUP BY c.name
ORDER BY total DESC;
-- ✅ Dairy 100%


-- ══════════════════════════════════════════════════════════════
-- UC10 — Purchase History
-- ══════════════════════════════════════════════════════════════
-- 👉 Browser steps:
--    1. On /insight, scroll to the bottom "Purchase History" section
--    2. Confirm one purchase record exists (created during UC2 Process)
--    3. Click to expand → confirm details show Whole Milk x1 and the price
-- ──────────────────────────────────────────────────────────────

SELECT p.purchase_id, p.purchased_at, p.total_amount, p.store,
       (SELECT COUNT(*) FROM purchase_items pi WHERE pi.purchase_id = p.purchase_id) AS item_count
FROM purchases p
WHERE p.user_id = @test_uid
ORDER BY p.purchased_at DESC;
-- ✅ 1 purchase record

SELECT pi.product_id, prod.name, pi.quantity, pi.price, pi.unit_price
FROM purchase_items pi
INNER JOIN products prod ON pi.product_id = prod.product_id
WHERE pi.purchase_id = (SELECT MAX(purchase_id) FROM purchases WHERE user_id = @test_uid);
-- ✅ Whole Milk x1, price = snapshot price at the time of Process


-- ══════════════════════════════════════════════════════════════
-- Cleanup — Delete Test Account
-- ══════════════════════════════════════════════════════════════
-- 👉 Run this after all UCs are complete:

DELETE FROM users WHERE user_id = @test_uid;

SELECT 'users' AS tbl, COUNT(*) AS cnt FROM users WHERE user_id = @test_uid
UNION ALL SELECT 'favorites', COUNT(*) FROM user_favorites WHERE user_id = @test_uid
UNION ALL SELECT 'lists', COUNT(*) FROM shopping_lists WHERE user_id = @test_uid
UNION ALL SELECT 'alerts', COUNT(*) FROM price_alerts WHERE user_id = @test_uid
UNION ALL SELECT 'todos', COUNT(*) FROM todos WHERE user_id = @test_uid
UNION ALL SELECT 'inventory', COUNT(*) FROM inventory_items WHERE user_id = @test_uid;
-- ✅ All cnt = 0
-- ⚠️ scrape_jobs / price_records / scrape_failures are unaffected (global data, not user-owned)
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Frontend API returns 404 or CORS error | Confirm the backend is running and its port matches the proxy in `package.json` |
| Refreshing the page logs you out | Confirm `localStorage` contains a token; JWT expires in 3 hours |
| No data on the Insight page | You must first mark list items as purchased in UC2 |
| Smart Alerts section is empty | This is normal — it only triggers when a tracked product drops ≥ 20% |
| SQL results don't match the frontend | Confirm `USE_MOCK = false` — the frontend may be using mock data |
| Cannot connect to MySQL | Verify IP `167.71.90.83`, username `joj161`, and correct password |

---

## Project Structure

```
Basket-Optimiser/
├── front-end/                  # React 18 frontend
│   ├── src/
│   │   ├── pages/              # 10 page components
│   │   ├── components/         # Nav, Icons
│   │   ├── api/index.js        # API layer (USE_MOCK toggle)
│   │   └── data/mockData.js    # Mock data (not used during testing)
│   └── package.json            # proxy → http://127.0.0.1:50123
│
├── backend/                    # Flask backend
│   ├── app.py                  # Entry point, registers 11 blueprints
│   ├── routes/                 # 11 route files
│   ├── auth.py                 # bcrypt + JWT + @require_auth
│   ├── sql_loader.py           # Loads db/queries/*.sql files
│   ├── config.py               # Reads .env
│   ├── .env                    # Secrets (not committed to git)
│   └── tests/                  # pytest tests
│
├── db/                         # Database
│   ├── schema.sql              # 18 tables (v3 DDL)
│   └── queries/                # 12 SQL files, loaded by sql_loader
│
└── docs/                       # API spec, use cases, table attributes
    ├── API_SPEC_v2.md          # Full documentation for 24 endpoints
    ├── Basket_Optimiser_Use_Cases.md
    └── SmartCart_Table_Attributes_v3.md
```

## TODO

> Based on instructor feedback from Deliverable II (see `docs/SmartCart_Feedback_Response_v3.md`) and the current implementation status.

### Completed Feedback Changes (Schema v3)

| # | Feedback | Change | Status |
|---|----------|--------|--------|
| F1 | No way to trace which alert triggered a todo | Added `alert_id INT NULL` FK on `todos` → `price_alerts`, ON DELETE SET NULL | ✅ Schema + backend |
| F2 | `consumption_days` ignored `quantity`, making `depletion_date` inaccurate | Renamed to `consumption_days_per_unit`; formula updated to `purchase_date + (per_unit × qty)` | ✅ Schema + backend + mock data |
| F3 | No shared consumption defaults; every user had to enter values manually | Added `default_consumption_days_per_unit INT NULL` to `products`; defaults filled for all 17 products | ✅ Schema + mock data |
| F4 | No UNIQUE constraint on `inventory_items`; same user + same product could create duplicate rows | Added `UNIQUE(user_id, product_id)` | ✅ Schema |
| F5 | `todos.message` embedded hard-coded prices that would become stale | Added `snapshot_price` and `compared_price` (DECIMAL); UI can compare against current price to check if deal is still valid | ✅ Schema + backend |
| F6 | Only `scrape_jobs.items_scraped` count; no way to track which variants consistently fail | Added `scrape_failures` table (5 mock rows) | ✅ Schema |
| F7 | `confidence_score` was a magic number with no year-by-year evidence | Added `seasonal_pattern_years` table (21 mock rows); score can be derived from annual observed values | ✅ Schema |
| UC4 | Team decision: remove `return_rebuy` — encouraging return-and-rebuy is unfair to retailers | `todo_type` ENUM changed to `'buy_now'` only | ✅ Schema |

### Remaining Items

| # | Item | Notes | Related File |
|---|------|-------|--------------|
| ~~T1~~ | ~~**Frontend: Pre-fill inventory form with consumption defaults**~~ | Auto-populate `default_consumption_days_per_unit` when selecting a product; show `Xd/unit` hint next to the search list | ✅ `front-end/src/pages/Inventory.js` |
| ~~T2~~ | ~~**Frontend: Show whether Smart Alert deal is still valid**~~ | API returns `snapshot_price` + `deal_still_valid`; frontend displays "Deal still valid" or "Price recovered" | ✅ `alerts.py`, `alerts.sql`, `Alerts.js` |
| ~~T3~~ | ~~**Automated scrape pipeline**~~ | `POST /api/admin/scrape` implemented: creates a scrape job → writes price_records (±5% variance + 2 random products force-dropped 25–35%) → updates scrape_jobs → checks for triggered price_alerts | ✅ `backend/routes/scrape.py`, `db/queries/scrape.sql` |
| ~~T4~~ | ~~**Scrape failure tracking**~~ | 5% chance of simulated failure during scrape; written to `scrape_failures` with a random error message | ✅ Same as T3 |
| ~~T5~~ | ~~**Receipt OCR**~~ | Out of scope. Shopping list "Process Purchased Items" already writes purchased items to inventory; OCR is a future extension | Removed |
| ~~T6~~ | ~~**`GET /api/auth/me` endpoint**~~ | Implemented in backend; frontend `App.js` calls `getMe()` on mount to restore session | ✅ `auth_routes.py`, `App.js` |

---

## Endpoint × DB Table Reference

### Public Endpoints (no login required)

| Endpoint | SQL Query | Tables Read |
|----------|-----------|-------------|
| `GET /api/retailers` | `retailers.get_all` | retailers |
| `GET /api/products` | `products.get_all_with_category` | products, categories |
| `GET /api/compare/{id}` | `compare.get_top5_cheapest` | price_records, product_variants, products, retailers, units, brands |
| `POST /api/compare/summary` | `compare.get_top5_cheapest` ×N | same as above |
| `GET /api/trends/{id}` | `trends.get_monthly_avg_by_retailer`, `trends.get_seasonal_patterns`, `trends.get_pattern_years` | price_records, product_variants, retailers, seasonal_patterns, seasonal_pattern_years |
| `POST /api/admin/scrape` | `scrape.*` (10 queries) | scrape_jobs, price_records, scrape_failures, price_alerts |
| `POST /api/auth/register` | `auth.check_email_exists`, `auth.insert_user` | users |
| `POST /api/auth/login` | `auth.get_user_by_email` | users |

### Authenticated Endpoints (login required)

| Endpoint | SQL Query | Tables Written | Transaction |
|----------|-----------|----------------|-------------|
| `GET /api/user/favorites` | `favorites.get_by_user` | — | — |
| `PUT /api/user/favorites` | `favorites.delete_all_by_user`, `favorites.insert_one` ×N | user_favorites | — |
| `GET /api/lists` | `lists.get_user_lists` | — | — |
| `GET /api/lists/{id}` | `lists.verify_ownership` + 3 queries | — | — |
| `POST /api/lists` | `lists.insert_list` | shopping_lists | — |
| `POST /api/lists/{id}/items` | `lists.insert_item`, `lists.update_estimated_total` | list_items, shopping_lists | **YES** |
| `PATCH /api/lists/{id}/items/{id}` | Dynamic UPDATE | list_items | — |
| `GET /api/inventory` | `inventory.get_user_inventory` | — | — |
| `POST /api/inventory` | `inventory.check_existing`, INSERT or UPDATE | inventory_items | — |
| `PATCH /api/inventory/{id}/dismiss` | `inventory.dismiss` | inventory_items | — |
| `GET /api/alerts` | Multiple queries + smart alert detection | todos | **YES** |
| `POST /api/alerts` | `alerts.insert_alert` | price_alerts | — |
| `DELETE /api/alerts/{id}` | `alerts.delete_alert` | price_alerts | — |
| `GET /api/insight/monthly` | `insight.spending_cte` + `insight.get_monthly` | — | — |
| `GET /api/insight/categories` | `insight.spending_cte` + `insight.get_by_category` | — | — |
| `GET /api/insight/summary` | `insight.spending_cte` + 2 queries | — | — |
