// ============================================================
// SmartCart — Mock Data
// Switch to real API by setting USE_MOCK = false in src/api/index.js
// ============================================================

export const PRODUCT_CATALOG = [
  { id: "milk", name: "Milk", icon: "🥛", category: "Dairy" },
  { id: "chicken", name: "Chicken Breast", icon: "🍗", category: "Meat" },
  { id: "protein_bar", name: "Protein Bar", icon: "💪", category: "Snacks" },
  { id: "trash_bag", name: "Trash Bags", icon: "🗑️", category: "Household" },
  { id: "bedsheet", name: "Bed Sheets", icon: "🛏️", category: "Home" },
  { id: "toilet_paper", name: "Toilet Paper", icon: "🧻", category: "Household" },
  { id: "paper_towel", name: "Paper Towels", icon: "🧾", category: "Household" },
  { id: "eggs", name: "Eggs", icon: "🥚", category: "Dairy" },
  { id: "water", name: "Bottled Water", icon: "💧", category: "Beverages" },
  { id: "detergent", name: "Detergent", icon: "🧴", category: "Household" },
];

export const MOCK_RETAILERS = [
  { id: 1, name: "Amazon", color: "#FF9900", logo_url: null, base_url: "https://www.amazon.com" },
  { id: 2, name: "Target", color: "#CC0000", logo_url: null, base_url: "https://www.target.com" },
  { id: 3, name: "Walmart", color: "#0071DC", logo_url: null, base_url: "https://www.walmart.com" },
];

export const STORE_COLORS = { Amazon: "#FF9900", Target: "#CC0000", Walmart: "#0071DC" };

export const MOCK_COMPARISONS = {
  milk: [
    { rank: 1, product: "Great Value Whole Milk 1 Gal", store: "Walmart", storeColor: "#0071DC", unitPrice: 3.42, unit: "per gallon", totalPrice: 3.42, originalPack: "1 gal", url: "#" },
    { rank: 2, product: "Good & Gather Whole Milk", store: "Target", storeColor: "#CC0000", unitPrice: 3.89, unit: "per gallon", totalPrice: 3.89, originalPack: "1 gal", url: "#" },
    { rank: 3, product: "365 Organic Whole Milk", store: "Amazon", storeColor: "#FF9900", unitPrice: 5.49, unit: "per gallon", totalPrice: 5.49, originalPack: "1 gal", url: "#" },
  ],
  chicken: [
    { rank: 1, product: "Walmart Boneless Breast", store: "Walmart", storeColor: "#0071DC", unitPrice: 3.22, unit: "per lb", totalPrice: 8.37, originalPack: "2.6 lb", url: "#" },
    { rank: 2, product: "Good & Gather Chicken Breast", store: "Target", storeColor: "#CC0000", unitPrice: 3.99, unit: "per lb", totalPrice: 9.98, originalPack: "2.5 lb", url: "#" },
    { rank: 3, product: "Amazon Fresh Chicken Breast", store: "Amazon", storeColor: "#FF9900", unitPrice: 4.16, unit: "per lb", totalPrice: 12.49, originalPack: "3 lb", url: "#" },
  ],
  eggs: [
    { rank: 1, product: "Great Value Large Eggs 18ct", store: "Walmart", storeColor: "#0071DC", unitPrice: 0.27, unit: "per egg", totalPrice: 4.87, originalPack: "18 ct", url: "#" },
    { rank: 2, product: "Good & Gather Cage-Free 12ct", store: "Target", storeColor: "#CC0000", unitPrice: 0.37, unit: "per egg", totalPrice: 4.49, originalPack: "12 ct", url: "#" },
    { rank: 3, product: "Happy Egg Co Free Range 12ct", store: "Amazon", storeColor: "#FF9900", unitPrice: 0.50, unit: "per egg", totalPrice: 5.99, originalPack: "12 ct", url: "#" },
  ],
  toilet_paper: [
    { rank: 1, product: "Great Value 1000 Sheets 24pk", store: "Walmart", storeColor: "#0071DC", unitPrice: 0.62, unit: "per roll", totalPrice: 14.97, originalPack: "24 rolls", url: "#" },
    { rank: 2, product: "Up&Up Soft & Strong 18pk", store: "Target", storeColor: "#CC0000", unitPrice: 0.78, unit: "per roll", totalPrice: 13.99, originalPack: "18 mega rolls", url: "#" },
    { rank: 3, product: "Charmin Ultra Soft 12pk", store: "Amazon", storeColor: "#FF9900", unitPrice: 1.25, unit: "per roll", totalPrice: 14.99, originalPack: "12 mega rolls", url: "#" },
  ],
  paper_towel: [
    { rank: 1, product: "Up&Up Make-A-Size 12pk", store: "Target", storeColor: "#CC0000", unitPrice: 1.42, unit: "per roll", totalPrice: 16.99, originalPack: "12 rolls", url: "#" },
    { rank: 2, product: "Amazon Basics 2-Ply 12pk", store: "Amazon", storeColor: "#FF9900", unitPrice: 1.58, unit: "per roll", totalPrice: 18.99, originalPack: "12 rolls", url: "#" },
    { rank: 3, product: "Bounty Select-A-Size 12pk", store: "Walmart", storeColor: "#0071DC", unitPrice: 1.91, unit: "per roll", totalPrice: 22.97, originalPack: "12 rolls", url: "#" },
  ],
  protein_bar: [
    { rank: 1, product: "Kirkland Protein Bar 20pk", store: "Amazon", storeColor: "#FF9900", unitPrice: 1.10, unit: "per bar", totalPrice: 21.99, originalPack: "20 bars", url: "#" },
    { rank: 2, product: "Clif Bar Variety 12pk", store: "Walmart", storeColor: "#0071DC", unitPrice: 1.33, unit: "per bar", totalPrice: 15.99, originalPack: "12 bars", url: "#" },
    { rank: 3, product: "Quest Protein Bar 12pk", store: "Target", storeColor: "#CC0000", unitPrice: 1.92, unit: "per bar", totalPrice: 22.99, originalPack: "12 bars", url: "#" },
  ],
  trash_bag: [
    { rank: 1, product: "Great Value 13 Gal 80ct", store: "Walmart", storeColor: "#0071DC", unitPrice: 0.10, unit: "per bag", totalPrice: 7.97, originalPack: "80 bags", url: "#" },
    { rank: 2, product: "Up&Up 13 Gal 70ct", store: "Target", storeColor: "#CC0000", unitPrice: 0.13, unit: "per bag", totalPrice: 8.99, originalPack: "70 bags", url: "#" },
    { rank: 3, product: "Glad ForceFlex 40ct", store: "Amazon", storeColor: "#FF9900", unitPrice: 0.25, unit: "per bag", totalPrice: 9.99, originalPack: "40 bags", url: "#" },
  ],
  bedsheet: [
    { rank: 1, product: "Mainstays Microfiber Set", store: "Walmart", storeColor: "#0071DC", unitPrice: 12.97, unit: "per set", totalPrice: 12.97, originalPack: "Queen", url: "#" },
    { rank: 2, product: "Amazon Basics Microfiber", store: "Amazon", storeColor: "#FF9900", unitPrice: 15.99, unit: "per set", totalPrice: 15.99, originalPack: "Queen", url: "#" },
    { rank: 3, product: "Threshold 300TC Set", store: "Target", storeColor: "#CC0000", unitPrice: 24.99, unit: "per set", totalPrice: 24.99, originalPack: "Queen", url: "#" },
  ],
  water: [
    { rank: 1, product: "Great Value Purified 40pk", store: "Walmart", storeColor: "#0071DC", unitPrice: 0.009, unit: "per oz", totalPrice: 3.98, originalPack: "40×16.9oz", url: "#" },
    { rank: 2, product: "Aquafina 32pk", store: "Amazon", storeColor: "#FF9900", unitPrice: 0.012, unit: "per oz", totalPrice: 6.49, originalPack: "32×16.9oz", url: "#" },
    { rank: 3, product: "Dasani 24pk", store: "Target", storeColor: "#CC0000", unitPrice: 0.013, unit: "per oz", totalPrice: 5.29, originalPack: "24×16.9oz", url: "#" },
  ],
  detergent: [
    { rank: 1, product: "All Free Clear 58 Loads", store: "Walmart", storeColor: "#0071DC", unitPrice: 0.17, unit: "per load", totalPrice: 9.97, originalPack: "58 loads", url: "#" },
    { rank: 2, product: "Arm & Hammer 50 Loads", store: "Target", storeColor: "#CC0000", unitPrice: 0.20, unit: "per load", totalPrice: 9.99, originalPack: "50 loads", url: "#" },
    { rank: 3, product: "Tide Original 64 Loads", store: "Amazon", storeColor: "#FF9900", unitPrice: 0.22, unit: "per load", totalPrice: 13.97, originalPack: "64 loads", url: "#" },
  ],
};

export function generateTrendData(basePrice) {
  const months = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
  return months.map((m, i) => ({
    month: m,
    amazon: +(basePrice * (1 + Math.sin(i * 1.2) * 0.08 + 0.03)).toFixed(2),
    target: +(basePrice * (0.95 + Math.cos(i * 0.9) * 0.06 + 0.02)).toFixed(2),
    walmart: +(basePrice * (0.92 + Math.sin(i * 0.7 + 1) * 0.05 + 0.015)).toFixed(2),
    predicted: i >= 4 ? +(basePrice * (0.88 + 0.02)).toFixed(2) : null,
  }));
}

export const MOCK_LISTS = [
  { id: 1, name: "Weekly Groceries", items: [
    { product: "Milk", icon: "🥛", qty: 2, bestStore: "Walmart", bestPrice: 3.42, unit: "per gallon", purchased: false },
    { product: "Eggs", icon: "🥚", qty: 1, bestStore: "Walmart", bestPrice: 4.87, unit: "18 ct", purchased: true },
    { product: "Chicken Breast", icon: "🍗", qty: 1, bestStore: "Walmart", bestPrice: 8.37, unit: "2.6 lb", purchased: false },
  ]},
  { id: 2, name: "Household Essentials", items: [
    { product: "Toilet Paper", icon: "🧻", qty: 1, bestStore: "Walmart", bestPrice: 14.97, unit: "24 rolls", purchased: false },
    { product: "Paper Towels", icon: "🧾", qty: 1, bestStore: "Target", bestPrice: 16.99, unit: "12 rolls", purchased: false },
    { product: "Trash Bags", icon: "🗑️", qty: 1, bestStore: "Walmart", bestPrice: 7.97, unit: "80 bags", purchased: false },
  ]}
];

export const MOCK_INVENTORY = [
  { id: 1, product: "Milk", icon: "🥛", qty: "0.5 gal", purchaseDate: "Mar 28", daysLeft: 2, totalDays: 7, status: "low" },
  { id: 2, product: "Eggs", icon: "🥚", qty: "6 eggs", purchaseDate: "Mar 30", daysLeft: 5, totalDays: 10, status: "ok" },
  { id: 3, product: "Toilet Paper", icon: "🧻", qty: "8 rolls", purchaseDate: "Mar 15", daysLeft: 12, totalDays: 30, status: "ok" },
  { id: 4, product: "Detergent", icon: "🧴", qty: "20 loads", purchaseDate: "Mar 10", daysLeft: 1, totalDays: 28, status: "low" },
  { id: 5, product: "Trash Bags", icon: "🗑️", qty: "30 bags", purchaseDate: "Mar 20", daysLeft: 18, totalDays: 40, status: "ok" },
];

export const MOCK_ALERTS = [
  { id: 1, product: "Milk", icon: "🥛", targetPrice: 3.00, currentPrice: 3.42, isTriggered: false, type: "user" },
  { id: 2, product: "Chicken Breast", icon: "🍗", targetPrice: 3.50, currentPrice: 3.22, isTriggered: true, store: "Walmart", triggeredAt: "Mar 28", type: "user" },
  { id: 3, product: "Eggs", icon: "🥚", targetPrice: 4.00, currentPrice: 4.87, isTriggered: false, type: "user" },
  { id: 4, product: "Protein Bar", icon: "💪", currentPrice: 1.10, previousAvg: 1.65, dropPct: 33, store: "Amazon", type: "smart", triggeredAt: "Apr 2" },
  { id: 5, product: "Detergent", icon: "🧴", currentPrice: 0.17, previousAvg: 0.22, dropPct: 23, store: "Walmart", type: "smart", triggeredAt: "Apr 1" },
];

export const MOCK_MONTHLY_SPENDING = [
  { month: "Oct", amount: 245 }, { month: "Nov", amount: 312 }, { month: "Dec", amount: 289 },
  { month: "Jan", amount: 267 }, { month: "Feb", amount: 234 }, { month: "Mar", amount: 198 },
];

export const MOCK_CATEGORY_SPENDING = [
  { category: "Dairy", amount: 68, color: "#4A7169" },
  { category: "Meat", amount: 52, color: "#735231" },
  { category: "Household", amount: 45, color: "#BEB59C" },
  { category: "Snacks", amount: 18, color: "#FF9900" },
  { category: "Beverages", amount: 15, color: "#0071DC" },
];
