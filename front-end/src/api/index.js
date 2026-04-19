// ============================================================
// SmartCart — API Layer
// Toggle between mock data and real Flask backend
// ============================================================

import {
  PRODUCT_CATALOG, MOCK_COMPARISONS, MOCK_RETAILERS, MOCK_LISTS,
  MOCK_INVENTORY, MOCK_ALERTS, MOCK_MONTHLY_SPENDING,
  MOCK_CATEGORY_SPENDING, generateTrendData
} from '../data/mockData';

// ============================================================
// ⬇⬇⬇  CHANGE THIS TO `false` WHEN BACKEND IS READY  ⬇⬇⬇
// ============================================================
const USE_MOCK = false;
// ============================================================

const BASE_URL = '/api';

// Callback set by App.js — called when token expires so UI can log out
let _onAuthExpired = null;
export function setOnAuthExpired(cb) { _onAuthExpired = cb; }

// ── FIX: attach JWT token from localStorage on every request ──
async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) {
    // Token expired or invalid — clear it and notify App
    if (res.status === 401 && token && path !== '/auth/login' && path !== '/auth/register') {
      localStorage.removeItem('token');
      if (_onAuthExpired) _onAuthExpired();
    }
    const err = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// --- Retailers ---
export async function getRetailers() {
  if (USE_MOCK) return MOCK_RETAILERS;
  return apiFetch('/retailers');
}

// --- Products ---
export async function getProducts() {
  if (USE_MOCK) return PRODUCT_CATALOG;
  return apiFetch('/products');
}

// --- Compare ---
export async function getComparison(productId) {
  if (USE_MOCK) return MOCK_COMPARISONS[productId] || [];
  return apiFetch(`/compare/${productId}`);
}

// ── FIX: product_ids must be integers for the backend ──
export async function getCompareSummary(productIds) {
  if (USE_MOCK) {
    const result = {};
    productIds.forEach(pid => { result[pid] = MOCK_COMPARISONS[pid] || []; });
    return result;
  }
  return apiFetch('/compare/summary', {
    method: 'POST',
    body: JSON.stringify({ product_ids: productIds.map(Number) }),
  });
}

// --- Trends ---
export async function getTrends(productId) {
  if (USE_MOCK) {
    const basePrice = (MOCK_COMPARISONS[productId] || [{ unitPrice: 3 }])[0].unitPrice;
    return generateTrendData(basePrice);
  }
  return apiFetch(`/trends/${productId}`);
}

// --- Auth ---
export async function login(email, password) {
  if (USE_MOCK) return { success: true, user: { user_id: 1, email, display_name: "Demo User" }, token: "mock_token" };
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function register(email, password, displayName) {
  if (USE_MOCK) return { success: true, user: { user_id: 1, email, display_name: displayName }, token: "mock_token" };
  return apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, display_name: displayName }),
  });
}

// Validate existing token and return user info (used to restore session on refresh)
export async function getMe() {
  return apiFetch('/auth/me');
}

// --- User Favorites ---
export async function getFavorites() {
  if (USE_MOCK) return { product_ids: [] };
  return apiFetch('/user/favorites');
}

export async function updateFavorites(productIds) {
  if (USE_MOCK) return { success: true, product_ids: productIds };
  return apiFetch('/user/favorites', {
    method: 'PUT',
    body: JSON.stringify({ product_ids: productIds }),
  });
}

// --- Shopping Lists ---
// ── FIX: getLists only returns list metadata (no items).
//         getListDetail fetches the full list with items + store_totals. ──
export async function getLists() {
  if (USE_MOCK) return MOCK_LISTS.map(({ items, ...rest }) => rest); // strip items for consistency
  return apiFetch('/lists');
}

export async function getListDetail(listId) {
  if (USE_MOCK) return MOCK_LISTS.find(l => l.id === listId) || MOCK_LISTS[0];
  return apiFetch(`/lists/${listId}`);
}

export async function createList(name) {
  if (USE_MOCK) return { success: true, list_id: Date.now(), name };
  return apiFetch('/lists', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function addListItem(listId, variantId, quantity) {
  if (USE_MOCK) return { success: true, list_item_id: Date.now(), estimated_total: 0 };
  return apiFetch(`/lists/${listId}/items`, {
    method: 'POST',
    body: JSON.stringify({ variant_id: variantId, quantity }),
  });
}

export async function updateListItem(listId, itemId, data) {
  if (USE_MOCK) return { success: true, list_item_id: itemId, ...data };
  return apiFetch(`/lists/${listId}/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteListItem(listId, itemId) {
  if (USE_MOCK) return { success: true };
  return apiFetch(`/lists/${listId}/items/${itemId}`, {
    method: 'DELETE',
  });
}

export async function clearPurchasedItems(listId) {
  if (USE_MOCK) return { success: true, items_removed: 0 };
  return apiFetch(`/lists/${listId}/clear`, { method: 'POST' });
}

// --- Inventory ---
export async function getInventory() {
  if (USE_MOCK) return MOCK_INVENTORY;
  return apiFetch('/inventory');
}

export async function addInventoryItem(data) {
  if (USE_MOCK) return { success: true, inventory_id: Date.now(), depletion_date: "2026-04-15" };
  return apiFetch('/inventory', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function dismissInventoryItem(inventoryId) {
  if (USE_MOCK) return { success: true, inventory_id: inventoryId, dismissed: true };
  return apiFetch(`/inventory/${inventoryId}/dismiss`, { method: 'PATCH' });
}

// --- Alerts ---
export async function getAlerts() {
  if (USE_MOCK) {
    return {
      user_alerts: MOCK_ALERTS.filter(a => a.type === 'user'),
      smart_alerts: MOCK_ALERTS.filter(a => a.type === 'smart'),
    };
  }
  return apiFetch('/alerts');
}

export async function createAlert(productId, targetPrice) {
  if (USE_MOCK) return { success: true, alert_id: Date.now(), message: `Alert set at $${targetPrice}` };
  return apiFetch('/alerts', {
    method: 'POST',
    body: JSON.stringify({ product_id: productId, target_price: targetPrice }),
  });
}

export async function deleteAlert(alertId) {
  if (USE_MOCK) return { success: true, deleted: true };
  return apiFetch(`/alerts/${alertId}`, { method: 'DELETE' });
}

// --- Receipt OCR ---
export async function processReceipt(listId, store, items) {
  if (USE_MOCK) {
    return {
      success: true,
      processed: {
        items_purchased: items.filter(i => i.matched).length,
        prices_recorded: items.filter(i => i.matched).length,
        inventory_updated: items.filter(i => i.matched).length,
        unmatched_items: items.filter(i => !i.matched).length,
      },
      message: "Receipt processed successfully",
    };
  }
  return apiFetch('/receipts', {
    method: 'POST',
    body: JSON.stringify({ list_id: listId, store, items }),
  });
}

// --- Insight ---
export async function getMonthlySpending(months = 6) {
  if (USE_MOCK) return MOCK_MONTHLY_SPENDING;
  return apiFetch(`/insight/monthly?months=${months}`);
}

export async function getCategorySpending(months = 6) {
  if (USE_MOCK) return MOCK_CATEGORY_SPENDING;
  return apiFetch(`/insight/categories?months=${months}`);
}

export async function getInsightSummary() {
  if (USE_MOCK) {
    const total = MOCK_MONTHLY_SPENDING.reduce((a, b) => a + b.amount, 0);
    return {
      total_6_months: total,
      monthly_average: total / MOCK_MONTHLY_SPENDING.length,
      current_month: MOCK_MONTHLY_SPENDING[MOCK_MONTHLY_SPENDING.length - 1].amount,
      change_vs_last_month: -15.3,
      insights: [
        { type: "decrease", message: "Your spending decreased 15% this month", value: -15.3 },
        { type: "category", message: "Dairy is your largest spending category at $68/month", value: 34.3 },
        { type: "savings", message: "You could save ~$8/month by switching Meat purchases to Walmart", value: 8.0 },
      ],
    };
  }
  return apiFetch('/insight/summary');
}

export async function getPurchaseHistory() {
  if (USE_MOCK) return [];
  return apiFetch('/insight/purchases');
}