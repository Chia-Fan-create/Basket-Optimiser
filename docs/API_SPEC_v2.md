# SmartCart API Specification (v2)

> **For the backend team** — This document defines every API endpoint the frontend expects.
> Build these endpoints in Flask and the frontend will work out of the box.
> 
> **Updated:** Added endpoints for Retailers, User Favorites, Shopping Lists, Inventory, Alerts (+ Smart Alerts), Insight, and Receipt OCR.

---

## Base URL

During development: `http://localhost:5000/api`

The React frontend has `"proxy": "http://localhost:5000"` in `package.json`, so all `/api/*` requests are automatically forwarded to Flask.

---

## Authentication

Endpoints marked with 🔒 require authentication. The frontend sends a session token via cookie or `Authorization: Bearer <token>` header. Unauthenticated requests to 🔒 endpoints should return `401`.

---

## 1. GET /api/retailers

Returns the list of all retailers in the system. Used by the frontend to dynamically render store names, colors, and logos throughout the app.

### Response

```json
[
  {
    "id": 1,
    "name": "Amazon",
    "color": "#FF9900",
    "logo_url": "/images/amazon.png",
    "base_url": "https://www.amazon.com"
  },
  {
    "id": 2,
    "name": "Target",
    "color": "#CC0000",
    "logo_url": "/images/target.png",
    "base_url": "https://www.target.com"
  },
  {
    "id": 3,
    "name": "Walmart",
    "color": "#0071DC",
    "logo_url": "/images/walmart.png",
    "base_url": "https://www.walmart.com"
  }
]
```

### Field Definitions

| Field      | Type   | Required | Description                                  |
|------------|--------|----------|----------------------------------------------|
| `id`       | int    | Yes      | Unique retailer ID (from `retailers` table)  |
| `name`     | string | Yes      | Display name                                 |
| `color`    | string | Yes      | Hex color code for UI indicators             |
| `logo_url` | string | No       | Path to retailer logo image                  |
| `base_url` | string | No       | Retailer's main website URL                  |

### Notes

- The frontend uses `color` for all store-related visual indicators (dots, bars, chart lines).
- **Store names and colors are no longer hardcoded in the frontend.** All retailer data comes from this endpoint.
- This endpoint is called once on app load and cached.

---

## 2. GET /api/products

Returns the list of products available for comparison.

### Response

```json
[
  {
    "id": "milk",
    "name": "Milk",
    "icon": "🥛",
    "category": "Dairy"
  }
]
```

### Field Definitions

| Field      | Type   | Required | Description                                   |
|------------|--------|----------|-----------------------------------------------|
| `id`       | string | Yes      | Unique identifier, used in all other endpoints |
| `name`     | string | Yes      | Display name shown in the UI                   |
| `icon`     | string | Yes      | Emoji icon for the product                     |
| `category` | string | Yes      | Product category (e.g., Dairy, Household)      |

---

## 3. GET /api/compare/{product_id}

Returns the top 5 cheapest options for a single product, sorted by normalized unit price (ascending).

### Example

`GET /api/compare/milk`

### Response

```json
[
  {
    "rank": 1,
    "product": "Great Value Whole Milk 1 Gal",
    "store": "Walmart",
    "storeColor": "#0071DC",
    "unitPrice": 3.42,
    "unit": "per gallon",
    "totalPrice": 3.42,
    "originalPack": "1 gal",
    "url": "https://www.walmart.com/ip/..."
  }
]
```

### Field Definitions

| Field          | Type   | Required | Description                                                     |
|----------------|--------|----------|-----------------------------------------------------------------|
| `rank`         | int    | Yes      | 1-based ranking by unit price (1 = cheapest)                    |
| `product`      | string | Yes      | Full product name as displayed on the retailer's site           |
| `store`        | string | Yes      | Retailer name (from `retailers` table)                          |
| `storeColor`   | string | Yes      | Hex color code (from `retailers` table)                         |
| `unitPrice`    | float  | Yes      | **Normalized price per unit** (the core value of SmartCart)      |
| `unit`         | string | Yes      | Human-readable unit label (e.g., `"per gallon"`, `"per lb"`)    |
| `totalPrice`   | float  | Yes      | Listed total price on the retailer's site                       |
| `originalPack` | string | Yes      | Original package description                                    |
| `url`          | string | Yes      | Direct link to the product page on the retailer's site          |

### Notes

- Array MUST be sorted by `unitPrice` ascending. Maximum 5 items.

---

## 4. POST /api/compare/summary

Returns comparison data for multiple products at once (used for the "All" overview tab).

### Request Body

```json
{
  "product_ids": ["milk", "chicken", "paper_towel"]
}
```

### Response

```json
{
  "milk": [
    { "rank": 1, "product": "...", "store": "Walmart", "storeColor": "#0071DC", "unitPrice": 3.42, "unit": "per gallon", "totalPrice": 3.42, "originalPack": "1 gal", "url": "..." }
  ],
  "chicken": [ ... ],
  "paper_towel": [ ... ]
}
```

Each value follows the exact same format as `/api/compare/{product_id}`.

---

## 5. GET /api/trends/{product_id}

Returns historical price trend data and predictions for a specific product.

### Example

`GET /api/trends/milk`

### Response

```json
[
  {
    "month": "Oct",
    "retailers": {
      "Amazon": 5.49,
      "Target": 4.12,
      "Walmart": 3.65
    },
    "predicted": null
  },
  {
    "month": "Mar",
    "retailers": {},
    "predicted": 3.18
  }
]
```

### Field Definitions

| Field       | Type        | Required | Description                                          |
|-------------|-------------|----------|------------------------------------------------------|
| `month`     | string      | Yes      | Month label (e.g., `"Oct"`, `"Nov"`)                 |
| `retailers` | object      | Yes      | Key-value map: retailer name → unit price (or omitted if no data) |
| `predicted` | float/null  | Yes      | Predicted future price, or `null` for historical months |

### Notes

- Return data in chronological order.
- The `retailers` object uses dynamic keys from the `retailers` table (not hardcoded).
- The frontend draws a chart line for each retailer key + a dashed line for predictions.
- Include at least 4-6 months of data.

---

## 6. POST /api/auth/register

Creates a new user account.

### Request Body

```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "display_name": "John"
}
```

### Response

```json
{
  "success": true,
  "user": {
    "user_id": 1,
    "email": "user@example.com",
    "display_name": "John"
  },
  "token": "jwt_token_here"
}
```

---

## 7. POST /api/auth/login

Authenticates a user.

### Request Body

```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

### Response

```json
{
  "success": true,
  "user": {
    "user_id": 1,
    "email": "user@example.com",
    "display_name": "John"
  },
  "token": "jwt_token_here"
}
```

---

## 8. GET /api/user/favorites 🔒

Returns the authenticated user's favorite product IDs.

### Response

```json
{
  "product_ids": ["milk", "chicken", "eggs", "toilet_paper"]
}
```

---

## 9. PUT /api/user/favorites 🔒

Updates the authenticated user's favorite products.

### Request Body

```json
{
  "product_ids": ["milk", "chicken", "eggs", "toilet_paper", "detergent"]
}
```

### Response

```json
{
  "success": true,
  "product_ids": ["milk", "chicken", "eggs", "toilet_paper", "detergent"]
}
```

---

## 10. GET /api/lists 🔒

Returns all shopping lists for the authenticated user.

### Response

```json
[
  {
    "list_id": 1,
    "name": "Weekly Groceries",
    "estimated_total": 16.66,
    "items_count": 3,
    "created_at": "2026-03-20T10:00:00Z",
    "updated_at": "2026-03-28T14:30:00Z"
  }
]
```

---

## 11. GET /api/lists/{list_id} 🔒

Returns a single shopping list with all its items and per-store cost breakdown.

### Response

```json
{
  "list_id": 1,
  "name": "Weekly Groceries",
  "items": [
    {
      "list_item_id": 1,
      "product_id": "milk",
      "product_name": "Milk",
      "icon": "🥛",
      "variant_id": 10,
      "quantity": 2,
      "is_purchased": false,
      "purchased_at": null,
      "best_store": "Walmart",
      "best_store_color": "#0071DC",
      "best_price": 3.42,
      "unit": "per gallon"
    }
  ],
  "store_totals": {
    "Walmart": 16.66,
    "Target": 18.33,
    "Amazon": 20.83
  },
  "cheapest_store": "Walmart",
  "savings_vs_expensive": 4.17
}
```

### Notes

- `store_totals` calculates the total cost of buying ALL items in the list at each store.
- `cheapest_store` is the store with the lowest total.
- `savings_vs_expensive` = most expensive store total − cheapest store total.

---

## 12. POST /api/lists 🔒

Creates a new shopping list.

### Request Body

```json
{
  "name": "Weekly Groceries"
}
```

### Response

```json
{
  "success": true,
  "list_id": 1,
  "name": "Weekly Groceries"
}
```

---

## 13. POST /api/lists/{list_id}/items 🔒

Adds an item to a shopping list. This should be wrapped in a **transaction** (add item + update `estimated_total` atomically).

### Request Body

```json
{
  "variant_id": 10,
  "quantity": 2
}
```

### Response

```json
{
  "success": true,
  "list_item_id": 5,
  "estimated_total": 23.50
}
```

---

## 14. PATCH /api/lists/{list_id}/items/{list_item_id} 🔒

Updates a list item (mark as purchased, change quantity, etc.).

### Request Body

```json
{
  "is_purchased": true,
  "quantity": 2
}
```

### Response

```json
{
  "success": true,
  "list_item_id": 5,
  "is_purchased": true,
  "purchased_at": "2026-04-01T15:30:00Z"
}
```

---

## 15. GET /api/inventory 🔒

Returns the user's household inventory with depletion status.

### Response

```json
[
  {
    "inventory_id": 1,
    "product_id": "milk",
    "product_name": "Milk",
    "icon": "🥛",
    "quantity": "0.5 gal",
    "purchase_date": "2026-03-28",
    "consumption_days": 7,
    "depletion_date": "2026-04-04",
    "days_left": 2,
    "status": "low"
  },
  {
    "inventory_id": 2,
    "product_id": "eggs",
    "product_name": "Eggs",
    "icon": "🥚",
    "quantity": "6 eggs",
    "purchase_date": "2026-03-30",
    "consumption_days": 10,
    "depletion_date": "2026-04-09",
    "days_left": 5,
    "status": "ok"
  }
]
```

### Field Definitions

| Field              | Type   | Required | Description                                      |
|--------------------|--------|----------|--------------------------------------------------|
| `inventory_id`     | int    | Yes      | Unique inventory entry ID                        |
| `product_id`       | string | Yes      | Product identifier                               |
| `product_name`     | string | Yes      | Display name                                     |
| `icon`             | string | Yes      | Emoji icon                                       |
| `quantity`         | string | Yes      | Human-readable remaining quantity                |
| `purchase_date`    | string | Yes      | Date of last purchase (ISO format)               |
| `consumption_days` | int    | Yes      | Estimated total days to consume                  |
| `depletion_date`   | string | Yes      | Estimated date when item runs out                |
| `days_left`        | int    | Yes      | Days remaining until depletion                   |
| `status`           | string | Yes      | `"low"` (≤2 days left) or `"ok"`                 |

---

## 16. POST /api/inventory 🔒

Adds or updates an inventory item.

### Request Body

```json
{
  "product_id": "milk",
  "quantity": 1.0,
  "consumption_days": 7
}
```

### Response

```json
{
  "success": true,
  "inventory_id": 1,
  "depletion_date": "2026-04-11"
}
```

---

## 17. PATCH /api/inventory/{inventory_id}/dismiss 🔒

Dismisses a "running low" alert for an inventory item. The item remains in inventory but stops showing as a warning.

### Response

```json
{
  "success": true,
  "inventory_id": 1,
  "dismissed": true
}
```

### Notes

- Dismissed items should not appear in the "Running Low" section.
- They remain visible in the "In Stock" section.

---

## 18. GET /api/alerts 🔒

Returns all price alerts for the authenticated user, including both user-created alerts and system-generated smart alerts.

### Response

```json
{
  "user_alerts": [
    {
      "alert_id": 1,
      "product_id": "milk",
      "product_name": "Milk",
      "icon": "🥛",
      "target_price": 3.00,
      "current_price": 3.42,
      "is_triggered": false,
      "triggered_at": null,
      "triggered_store": null
    },
    {
      "alert_id": 2,
      "product_id": "chicken",
      "product_name": "Chicken Breast",
      "icon": "🍗",
      "target_price": 3.50,
      "current_price": 3.22,
      "is_triggered": true,
      "triggered_at": "2026-03-28T10:00:00Z",
      "triggered_store": "Walmart",
      "triggered_store_color": "#0071DC"
    }
  ],
  "smart_alerts": [
    {
      "alert_id": 101,
      "product_id": "protein_bar",
      "product_name": "Protein Bar",
      "icon": "💪",
      "current_price": 1.10,
      "previous_avg": 1.65,
      "drop_pct": 33,
      "store": "Amazon",
      "store_color": "#FF9900",
      "detected_at": "2026-04-02T08:00:00Z"
    }
  ]
}
```

### Notes

- **User Alerts** are created by the user via `POST /api/alerts`.
- **Smart Alerts** are system-generated when a product's price drops >20% below its recent average. The backend detects these during scrape processing.
- The frontend displays these in separate sections.

---

## 19. POST /api/alerts 🔒

Creates a new user price alert.

### Request Body

```json
{
  "product_id": "milk",
  "target_price": 3.00
}
```

### Response

```json
{
  "success": true,
  "alert_id": 5,
  "message": "Alert set for Milk at $3.00"
}
```

---

## 20. DELETE /api/alerts/{alert_id} 🔒

Deletes a user alert.

### Response

```json
{
  "success": true,
  "deleted": true
}
```

---

## 21. POST /api/receipts 🔒

Processes a scanned receipt. The frontend sends the user-confirmed items (after OCR review and editing). The backend should atomically:

1. Mark matching `list_items` as `is_purchased = TRUE`
2. Insert prices into `price_records`
3. Update or create `inventory_items`
4. All data feeds into Insight (analytics views) automatically

### Request Body

```json
{
  "list_id": 1,
  "store": "Walmart",
  "items": [
    {
      "product_name": "Whole Milk 1 Gal",
      "product_id": "milk",
      "quantity": 2,
      "price": 3.42,
      "unit_price": 3.42,
      "matched": true
    },
    {
      "product_name": "Chicken Breast 2.6lb",
      "product_id": "chicken",
      "quantity": 1,
      "price": 8.37,
      "unit_price": 3.22,
      "matched": true
    },
    {
      "product_name": "Organic Bananas",
      "product_id": null,
      "quantity": 1,
      "price": 1.29,
      "unit_price": 1.29,
      "matched": false
    }
  ]
}
```

### Field Definitions (Request — per item)

| Field          | Type        | Required | Description                                               |
|----------------|-------------|----------|-----------------------------------------------------------|
| `product_name` | string      | Yes      | Product name as confirmed by user (may be edited from OCR)|
| `product_id`   | string/null | Yes      | Matched product ID, or `null` if unmatched                |
| `quantity`      | int         | Yes      | Quantity purchased                                        |
| `price`        | float       | Yes      | Total price paid (as confirmed by user)                   |
| `unit_price`   | float       | Yes      | Calculated unit price                                     |
| `matched`      | bool        | Yes      | Whether this item was matched to a product in the DB      |

### Response

```json
{
  "success": true,
  "processed": {
    "items_purchased": 2,
    "prices_recorded": 2,
    "inventory_updated": 2,
    "unmatched_items": 1
  },
  "message": "Receipt processed successfully"
}
```

### Notes

- Only items with `matched: true` and a valid `product_id` should update `list_items`, `price_records`, and `inventory_items`.
- Items with `matched: false` should be logged but not linked to existing products.
- This operation should be wrapped in a **transaction** — if any step fails, ROLLBACK all changes.

---

## 22. GET /api/insight/monthly 🔒

Returns monthly spending data for the authenticated user.

### Query Parameters

| Param    | Type   | Required | Description                    |
|----------|--------|----------|--------------------------------|
| `months` | int    | No       | Number of months (default: 6)  |

### Response

```json
[
  { "month": "Oct", "year": 2025, "amount": 245.00 },
  { "month": "Nov", "year": 2025, "amount": 312.00 },
  { "month": "Dec", "year": 2025, "amount": 289.00 },
  { "month": "Jan", "year": 2026, "amount": 267.00 },
  { "month": "Feb", "year": 2026, "amount": 234.00 },
  { "month": "Mar", "year": 2026, "amount": 198.00 }
]
```

---

## 23. GET /api/insight/categories 🔒

Returns spending breakdown by category for the authenticated user.

### Query Parameters

| Param    | Type   | Required | Description                    |
|----------|--------|----------|--------------------------------|
| `months` | int    | No       | Number of months (default: 6)  |

### Response

```json
[
  { "category": "Dairy", "amount": 68.00, "percentage": 34.3 },
  { "category": "Meat", "amount": 52.00, "percentage": 26.3 },
  { "category": "Household", "amount": 45.00, "percentage": 22.7 },
  { "category": "Snacks", "amount": 18.00, "percentage": 9.1 },
  { "category": "Beverages", "amount": 15.00, "percentage": 7.6 }
]
```

---

## 24. GET /api/insight/summary 🔒

Returns high-level spending insights for the dashboard.

### Response

```json
{
  "total_6_months": 1545.00,
  "monthly_average": 257.50,
  "current_month": 198.00,
  "change_vs_last_month": -15.3,
  "insights": [
    {
      "type": "decrease",
      "message": "Your spending decreased 15% this month",
      "value": -15.3
    },
    {
      "type": "category",
      "message": "Dairy is your largest spending category at $68/month",
      "value": 34.3
    },
    {
      "type": "savings",
      "message": "You could save ~$8/month by switching Meat purchases to Walmart",
      "value": 8.00
    }
  ]
}
```

---

## Error Handling

All endpoints should return errors in this format:

```json
{
  "error": true,
  "message": "Product not found: xyz"
}
```

| Code | When                                          |
|------|-----------------------------------------------|
| 200  | Success                                       |
| 201  | Resource created                              |
| 400  | Bad request (missing/invalid parameters)      |
| 401  | Unauthorized (not logged in, for 🔒 endpoints)|
| 404  | Resource not found                            |
| 500  | Server error (scraping failure, DB error, etc)|

---

## Endpoint Summary

| #  | Method | Endpoint                                  | Auth | Used By          |
|----|--------|-------------------------------------------|------|------------------|
| 1  | GET    | `/api/retailers`                          | No   | All pages        |
| 2  | GET    | `/api/products`                           | No   | Select, Compare  |
| 3  | GET    | `/api/compare/{product_id}`               | No   | Compare          |
| 4  | POST   | `/api/compare/summary`                    | No   | Compare (All tab)|
| 5  | GET    | `/api/trends/{product_id}`                | No   | Trends           |
| 6  | POST   | `/api/auth/register`                      | No   | Login/Register   |
| 7  | POST   | `/api/auth/login`                         | No   | Login/Register   |
| 8  | GET    | `/api/user/favorites`                     | 🔒   | Dashboard, Compare|
| 9  | PUT    | `/api/user/favorites`                     | 🔒   | Select (edit)    |
| 10 | GET    | `/api/lists`                              | 🔒   | Shopping Lists   |
| 11 | GET    | `/api/lists/{list_id}`                    | 🔒   | Shopping Lists   |
| 12 | POST   | `/api/lists`                              | 🔒   | Shopping Lists   |
| 13 | POST   | `/api/lists/{list_id}/items`              | 🔒   | Compare, Lists   |
| 14 | PATCH  | `/api/lists/{list_id}/items/{item_id}`    | 🔒   | Shopping Lists   |
| 15 | GET    | `/api/inventory`                          | 🔒   | Inventory        |
| 16 | POST   | `/api/inventory`                          | 🔒   | Inventory, OCR   |
| 17 | PATCH  | `/api/inventory/{id}/dismiss`             | 🔒   | Inventory        |
| 18 | GET    | `/api/alerts`                             | 🔒   | Alerts           |
| 19 | POST   | `/api/alerts`                             | 🔒   | Alerts           |
| 20 | DELETE | `/api/alerts/{alert_id}`                  | 🔒   | Alerts           |
| 21 | POST   | `/api/receipts`                           | 🔒   | Receipt OCR      |
| 22 | GET    | `/api/insight/monthly`                    | 🔒   | Insight          |
| 23 | GET    | `/api/insight/categories`                 | 🔒   | Insight          |
| 24 | GET    | `/api/insight/summary`                    | 🔒   | Insight, Dashboard|

---

## DB Tables → Endpoint Mapping

| Endpoint                  | Primary Tables Used                                     |
|---------------------------|---------------------------------------------------------|
| `/api/retailers`          | `retailers`                                             |
| `/api/products`           | `products`, `categories`, `brands`                      |
| `/api/compare/*`          | `products`, `product_variants`, `price_records`, `retailers`, `units` |
| `/api/trends/*`           | `price_records`, `product_variants`, `seasonal_patterns` |
| `/api/auth/*`             | `users`                                                 |
| `/api/user/favorites`     | `users` (store as JSON or separate junction table)       |
| `/api/lists*`             | `shopping_lists`, `list_items`, `product_variants`, `price_records` |
| `/api/inventory*`         | `inventory_items`, `products`                           |
| `/api/alerts*`            | `price_alerts`, `products`, `price_records`             |
| `/api/receipts`           | `list_items`, `price_records`, `inventory_items`        |
| `/api/insight/*`          | `v_monthly_spending_by_category` (view), `list_items`, `price_records` |

---

## Flask Quickstart

```python
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# --- Public endpoints ---

@app.route('/api/retailers')
def get_retailers():
    retailers = db.get_all_retailers()
    return jsonify(retailers)

@app.route('/api/products')
def get_products():
    products = db.get_all_products()
    return jsonify(products)

@app.route('/api/compare/<product_id>')
def get_comparison(product_id):
    results = db.get_normalized_prices(product_id, limit=5)
    return jsonify(results)

@app.route('/api/compare/summary', methods=['POST'])
def get_summary():
    product_ids = request.json.get('product_ids', [])
    result = {}
    for pid in product_ids:
        result[pid] = db.get_normalized_prices(pid, limit=5)
    return jsonify(result)

@app.route('/api/trends/<product_id>')
def get_trends(product_id):
    trends = db.get_price_history(product_id)
    return jsonify(trends)

# --- Auth ---

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    user = db.create_user(data['email'], data['password'], data['display_name'])
    return jsonify({"success": True, "user": user, "token": generate_token(user)})

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    user = db.authenticate(data['email'], data['password'])
    if not user:
        return jsonify({"error": True, "message": "Invalid credentials"}), 401
    return jsonify({"success": True, "user": user, "token": generate_token(user)})

# --- Protected endpoints (require auth) ---

@app.route('/api/user/favorites')
@require_auth
def get_favorites():
    return jsonify({"product_ids": db.get_user_favorites(current_user.id)})

@app.route('/api/user/favorites', methods=['PUT'])
@require_auth
def update_favorites():
    ids = request.json.get('product_ids', [])
    db.update_user_favorites(current_user.id, ids)
    return jsonify({"success": True, "product_ids": ids})

@app.route('/api/lists')
@require_auth
def get_lists():
    return jsonify(db.get_user_lists(current_user.id))

@app.route('/api/lists/<int:list_id>')
@require_auth
def get_list(list_id):
    return jsonify(db.get_list_detail(list_id, current_user.id))

@app.route('/api/lists', methods=['POST'])
@require_auth
def create_list():
    name = request.json.get('name')
    lst = db.create_list(current_user.id, name)
    return jsonify({"success": True, "list_id": lst.id, "name": name}), 201

@app.route('/api/lists/<int:list_id>/items', methods=['POST'])
@require_auth
def add_list_item(list_id):
    data = request.json
    # TRANSACTION: insert item + update estimated_total
    item = db.add_list_item_atomic(list_id, data['variant_id'], data['quantity'])
    return jsonify({"success": True, "list_item_id": item.id, "estimated_total": item.list_total}), 201

@app.route('/api/lists/<int:list_id>/items/<int:item_id>', methods=['PATCH'])
@require_auth
def update_list_item(list_id, item_id):
    data = request.json
    item = db.update_list_item(item_id, data)
    return jsonify({"success": True, "list_item_id": item_id, **data})

@app.route('/api/inventory')
@require_auth
def get_inventory():
    return jsonify(db.get_user_inventory(current_user.id))

@app.route('/api/inventory', methods=['POST'])
@require_auth
def add_inventory():
    data = request.json
    inv = db.upsert_inventory(current_user.id, data)
    return jsonify({"success": True, "inventory_id": inv.id, "depletion_date": str(inv.depletion_date)}), 201

@app.route('/api/inventory/<int:inv_id>/dismiss', methods=['PATCH'])
@require_auth
def dismiss_inventory(inv_id):
    db.dismiss_inventory_alert(inv_id, current_user.id)
    return jsonify({"success": True, "inventory_id": inv_id, "dismissed": True})

@app.route('/api/alerts')
@require_auth
def get_alerts():
    user_alerts = db.get_user_alerts(current_user.id)
    smart_alerts = db.get_smart_alerts(current_user.id)
    return jsonify({"user_alerts": user_alerts, "smart_alerts": smart_alerts})

@app.route('/api/alerts', methods=['POST'])
@require_auth
def create_alert():
    data = request.json
    alert = db.create_alert(current_user.id, data['product_id'], data['target_price'])
    return jsonify({"success": True, "alert_id": alert.id, "message": f"Alert set"}), 201

@app.route('/api/alerts/<int:alert_id>', methods=['DELETE'])
@require_auth
def delete_alert(alert_id):
    db.delete_alert(alert_id, current_user.id)
    return jsonify({"success": True, "deleted": True})

@app.route('/api/receipts', methods=['POST'])
@require_auth
def process_receipt():
    data = request.json
    # TRANSACTION: mark purchased + insert prices + update inventory
    result = db.process_receipt_atomic(current_user.id, data)
    return jsonify({"success": True, "processed": result})

@app.route('/api/insight/monthly')
@require_auth
def get_monthly_spending():
    months = request.args.get('months', 6, type=int)
    return jsonify(db.get_monthly_spending(current_user.id, months))

@app.route('/api/insight/categories')
@require_auth
def get_category_spending():
    months = request.args.get('months', 6, type=int)
    return jsonify(db.get_category_spending(current_user.id, months))

@app.route('/api/insight/summary')
@require_auth
def get_insight_summary():
    return jsonify(db.get_insight_summary(current_user.id))

if __name__ == '__main__':
    app.run(port=5000, debug=True)
```

---

## Development Workflow

1. **Backend team:** `pip install flask flask-cors` → build endpoints → `python app.py`
2. **Frontend team:** `npm install` → `npm start` (auto-proxies to Flask on port 5000)
3. **To switch from mock to real data:** In `src/api/index.js`, change `USE_MOCK = false` and the frontend will call real endpoints instead of returning mock data.
