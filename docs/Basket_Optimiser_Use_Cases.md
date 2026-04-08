# Basket Optimiser — Use Cases (Team Reference)

> Internal document for team discussion. Not a deliverable.
> Last updated: 2026-03-20

---

## UC1 — Price Search & Comparison (Core)

**Actor:** User (consumer)
**Goal:** Find the cheapest option for an everyday item across retailers.

**Flow:**
1. User searches for a product (e.g., "whole milk") or browses by category (dairy, toiletries, snacks, etc.).
2. System displays matching products from Amazon, Target, and Walmart.
3. Each result shows: product name, brand, retailer, pack size, total price, and **normalized unit price** (e.g., $0.05/oz).
4. User can sort/filter by unit price, retailer, brand, or category.
5. User can view price history (weekly trend chart) for any product.

**Tables involved:** `products`, `retailers`, `categories`, `brands`, `units`, `product_variants`, `price_records`

---

## UC2 — Shopping List Management

**Actor:** Authenticated user
**Goal:** Build a shopping list and find the cheapest store to buy everything.

**Flow:**
1. User creates a named shopping list (e.g., "Weekly Groceries").
2. User adds products to the list, specifying desired quantity.
3. System calculates estimated total cost **per retailer** (Amazon total vs. Target total vs. Walmart total).
4. User can see which store is cheapest overall, or a mixed-store optimized split.
5. User can mark items as purchased, which triggers inventory update (see UC6).

**Transaction scenario:** Adding an item to a shopping list + updating the estimated total must be atomic. If either step fails, ROLLBACK.

**Tables involved:** `shopping_lists`, `list_items`, `products`, `price_records`, `users`

---

## UC3 — Price Alerts & Drop Notifications

**Actor:** Authenticated user
**Goal:** Get notified when a product drops below a target price.

**Flow:**
1. User sets a price alert on a product: "Notify me when Charmin 24-pack drops below $20."
2. System stores the alert with target price and product reference.
3. When new price data is scraped, system checks all active alerts.
4. If current price ≤ target price, system creates a notification (and optionally a todo — see UC4).
5. User can view, edit, or delete their active alerts.

**Tables involved:** `price_alerts`, `products`, `price_records`, `users`

---

## UC4 — Deal Action Todos

**Actor:** Authenticated user
**Goal:** Act on significant price drops — either buy now or return-and-rebuy.

**Flow:**
1. System detects a significant price drop (e.g., >20% below recent average).
2. System checks if the user recently purchased this item (from shopping list purchase history).
3. If recently purchased at higher price → generate todo: "Consider returning and rebuying [product] at [retailer] — save $X."
4. If not recently purchased → generate todo: "Great deal on [product] at [retailer] — $X (was $Y)."
5. User views their todo list, can mark items as done or dismiss.

**Tables involved:** `todos`, `products`, `price_records`, `list_items` (purchase history), `users`

---

## UC5 — Spending Analytics & Reports

**Actor:** Authenticated user
**Goal:** Understand personal grocery spending patterns over time.

**Flow:**
1. User navigates to the analytics dashboard.
2. System displays: monthly total spending, spending by category (pie/bar chart), month-over-month trend.
3. User can filter by date range, category, or retailer.
4. System shows insights: "You spent 15% more on dairy this month" or "Your average weekly grocery bill is $62."

**Database view candidates:**
- `v_monthly_spending_by_category` — aggregates purchase data by user, month, and category.
- `v_cheapest_unit_price_by_category` — shows the best current deal per category across all retailers.

**Tables involved:** `users`, `list_items`, `products`, `categories`, `price_records`

---

## UC6 — Household Inventory Tracking

**Actor:** Authenticated user
**Goal:** Track what's at home and get reminded when something is running low.

**Flow:**
1. User adds items to their household inventory (e.g., "Whole milk, bought 2026-03-15, lasts ~7 days").
2. System tracks each item's estimated depletion date based on the consumption cycle.
3. When an item is near depletion (e.g., 1-2 days left), system suggests adding it to the active shopping list.
4. When user marks a shopping list item as purchased, inventory is auto-updated.

**Tables involved:** `inventory_items`, `products`, `users`, `shopping_lists`

---

## UC7 — User Account Management

**Actor:** User
**Goal:** Register, log in, and manage personal profile.

**Flow:**
1. User registers with email and password.
2. User logs in to access personalized features (lists, alerts, todos, inventory, analytics).
3. User can update profile info or delete account.

**Tables involved:** `users`

---

## UC8 — Seasonal Deal Prediction

**Actor:** Authenticated user
**Goal:** Know the best time of year to buy a product based on historical pricing patterns.

**Flow:**
1. System analyzes 1–2 years of historical `price_records` for each product.
2. System identifies recurring discount patterns tied to major shopping events (e.g., Black Friday, Labor Day, Prime Day, back-to-school season).
3. On the product detail page, the system displays a seasonal price indicator — e.g., "This item typically drops ~25% around Black Friday" or "Lowest prices historically seen in late November."
4. If the next predicted deal window is approaching (within ~30 days), the system highlights it as a suggestion: "Consider waiting — Black Friday is 3 weeks away and this item has dropped every year."
5. User can decide whether to buy now or wait based on the prediction.

**Key distinction from UC3:** UC3 is *reactive* — the user sets a threshold and waits for it to be met. UC8 is *proactive* — the system analyzes historical trends and advises the user on **when** to buy, even before they set an alert.

**Tables involved:** `seasonal_patterns`, `products`, `price_records`, `retailers`

---

## Proposed Table Summary

| #  | Table              | Source          | Needed by UC        |
|----|--------------------|-----------------|---------------------|
| 1  | `users`            | User-generated  | UC2-UC8             |
| 2  | `retailers`        | Seed data       | UC1, UC2, UC5       |
| 3  | `categories`       | Seed data       | UC1, UC5            |
| 4  | `brands`           | Scraped         | UC1                 |
| 5  | `units`            | Seed data       | UC1                 |
| 6  | `products`         | Scraped         | UC1-UC6             |
| 7  | `product_variants` | Scraped         | UC1, UC2            |
| 8  | `price_records`    | Scraped         | UC1, UC2, UC3, UC4, UC8 |
| 9  | `shopping_lists`   | User-generated  | UC2, UC6            |
| 10 | `list_items`       | User-generated  | UC2, UC4, UC5       |
| 11 | `price_alerts`     | User-generated  | UC3                 |
| 12 | `todos`            | System-generated| UC4                 |
| 13 | `inventory_items`  | User-generated  | UC6                 |
| 14 | `scrape_jobs`      | System log      | (admin/debug)       |
| 15 | `seasonal_patterns`| System-generated| UC8                 |

**Count:** 15 tables (13 core + `list_items` junction + `scrape_jobs` log), well above the 10-table minimum.

---

## Next Steps

- [ ] Finalize table columns and data types
- [ ] Design ER diagram with cardinality
- [ ] Write 3NF normalization justification
- [ ] Define indexes, views, and transaction scenarios
- [ ] Plan MySQL DDL migration
- [ ] Decide application framework (Streamlit + CRUD forms? or switch?)
