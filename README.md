# SmartCart Frontend

Grocery price comparison app — compare prices across Amazon, Target, Walmart & more.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm start
```

The app will open at `http://localhost:3000`.

**No backend needed!** The app runs entirely on mock data. When your backend team is ready, change one line to switch to real API.

## Switch to Real API

Open `src/api/index.js` and change:

```javascript
const USE_MOCK = true;   // ← change to false
```

That's it. All pages will start calling the Flask backend at `http://localhost:5000/api`.

## Project Structure

```
smartcart-frontend/
├── public/
│   └── index.html
├── src/
│   ├── api/
│   │   └── index.js          # API layer (mock ↔ real toggle)
│   ├── components/
│   │   ├── Icons.js           # Shared SVG icons
│   │   └── Nav.js             # Navigation with Shopping dropdown
│   ├── data/
│   │   └── mockData.js        # All mock datasets
│   ├── pages/
│   │   ├── Landing.js         # Landing page
│   │   ├── Select.js          # Favorite product selection
│   │   ├── Login.js           # Login / Register (UC7)
│   │   ├── Dashboard.js       # Dashboard Home (guest/logged in)
│   │   ├── Compare.js         # Price Comparison (UC1)
│   │   ├── Trends.js          # Price Trends with chart (UC8)
│   │   ├── ShoppingLists.js   # Shopping Lists + Receipt OCR (UC2)
│   │   ├── Inventory.js       # Household Inventory (UC6)
│   │   ├── Alerts.js          # Price Alerts + Smart Alerts (UC3+UC4)
│   │   └── Insight.js         # Spending Analytics (UC5)
│   ├── styles/
│   │   └── global.css         # All styles
│   ├── App.js                 # Main app with routing
│   └── index.js               # React entry point
├── package.json
└── README.md
```

## Pages & Use Cases

| Page           | Use Case | Description                              |
|----------------|----------|------------------------------------------|
| Landing        | —        | Welcome page, CTA to start               |
| Select         | —        | Pick favorite products                   |
| Login/Register | UC7      | Email + password auth                    |
| Dashboard      | —        | Hub with KPIs, favorites, quick actions  |
| Compare        | UC1      | Cross-retailer price comparison          |
| Trends         | UC8      | Historical price charts + predictions    |
| Shopping Lists | UC2+UC9  | Lists + store comparison + Receipt OCR   |
| Inventory      | UC6      | Track items at home, depletion alerts    |
| Alerts         | UC3+UC4  | User alerts + system smart alerts        |
| Insight        | UC5      | Monthly spending, categories, insights   |

## Nav Structure

- **Logged out:** Dashboard · Shopping ▾ (Compare, Trends) · Sign In
- **Logged in:** Dashboard · Shopping ▾ (Compare, Trends, Lists, Inventory, Alerts) · Insight · Profile

## Color Palette

| Color       | Hex       | Usage                        |
|-------------|-----------|------------------------------|
| Deep Green  | `#204035` | Nav, footer                  |
| Green       | `#4A7169` | CTA buttons, active states   |
| Sand        | `#BEB59C` | Borders, hover states        |
| Brown       | `#735231` | Headings, KPI numbers        |
| Deep Brown  | `#49271B` | Body text                    |
| Background  | `#FFFDF5` | Page background              |
| Card        | `#FFFFFF` | Card backgrounds             |

## For Backend Team

See `API_SPEC_v2.md` for the complete API documentation (24 endpoints).
