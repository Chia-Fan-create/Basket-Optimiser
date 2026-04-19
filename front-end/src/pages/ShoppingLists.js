import React, { useState, useEffect } from 'react';
import { PlusSvg, CheckSvg, CameraSvg, ArrowR } from '../components/Icons';
import { STORE_COLORS } from '../data/mockData';
import { getLists, getListDetail, createList, addListItem, deleteListItem, clearPurchasedItems, updateListItem, processReceipt, getProducts, getComparison } from '../api';

export default function ShoppingListsPage({ onNavigate }) {
  const [show, setShow] = useState(false);

  // listMetas = array of { list_id, name, estimated_total } from GET /api/lists
  // activeDetail = full object from GET /api/lists/:id (has items, store_totals, etc.)
  const [listMetas, setListMetas] = useState([]);
  const [activeDetail, setActiveDetail] = useState(null);
  const [activeListId, setActiveListId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState(null);

  const [addItemOpen, setAddItemOpen] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [addSearch, setAddSearch] = useState('');
  const [addBusy, setAddBusy] = useState(null);   // product id being added
  const [addDone, setAddDone] = useState({});      // { pid: true } flash

  const [ocrOpen, setOcrOpen] = useState(false);
  const [ocrStep, setOcrStep] = useState(0);
  const [ocrChecked, setOcrChecked] = useState({});
  const [ocrResults, setOcrResults] = useState([]);
  const [ocrSubmitting, setOcrSubmitting] = useState(false);

  useEffect(() => { setTimeout(() => setShow(true), 50); }, []);

  // Step 1: fetch list metadata on mount
  useEffect(() => {
    getLists()
      .then(data => {
        setListMetas(data);
        // backend uses list_id; mock uses id
        const firstId = data[0]?.list_id ?? data[0]?.id;
        if (firstId !== undefined) setActiveListId(firstId);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Step 2: fetch full detail whenever active list changes
  useEffect(() => {
    if (activeListId === null || activeListId === undefined) return;
    setLoadingDetail(true);
    getListDetail(activeListId)
      .then(setActiveDetail)
      .catch(err => setError(err.message))
      .finally(() => setLoadingDetail(false));
  }, [activeListId]);

  const handleCreateList = () => {
    const name = prompt('List name:');
    if (!name) return;
    createList(name)
      .then(res => {
        const newId = res.list_id;
        return getLists().then(data => {
          setListMetas(data);
          setActiveListId(newId);
        });
      })
      .catch(err => setError(err.message));
  };

  // Works with both mock (id) and backend (list_item_id)
  const handleTogglePurchased = (itemId, itemIndex, currentState) => {
    const matches = (item, idx) =>
      itemId !== undefined ? (item.list_item_id ?? item.id) === itemId : idx === itemIndex;

    setActiveDetail(prev => ({
      ...prev,
      items: prev.items.map((item, idx) =>
        matches(item, idx)
          ? { ...item, is_purchased: !currentState, purchased: !currentState }
          : item
      )
    }));

    if (itemId !== undefined) {
      updateListItem(activeListId, itemId, { is_purchased: !currentState })
        .catch(err => {
          setActiveDetail(prev => ({
            ...prev,
            items: prev.items.map((item, idx) =>
              matches(item, idx)
                ? { ...item, is_purchased: currentState, purchased: currentState }
                : item
            )
          }));
          setError(err.message);
        });
    }
  };

  const handleDeleteItem = (itemId) => {
    if (!itemId) return;
    setActiveDetail(prev => ({
      ...prev,
      items: prev.items.filter(item => (item.list_item_id ?? item.id) !== itemId)
    }));
    deleteListItem(activeListId, itemId)
      .then(() => getListDetail(activeListId))
      .then(detail => {
        setActiveDetail(detail);
        getLists().then(setListMetas).catch(() => {});
      })
      .catch(err => {
        setError(err.message);
        getListDetail(activeListId).then(setActiveDetail).catch(() => {});
      });
  };

  const handleAddItemOpen = () => {
    setAddItemOpen(true);
    setAddSearch('');
    setAddDone({});
    if (allProducts.length === 0) {
      getProducts().then(setAllProducts).catch(() => {});
    }
  };

  const handleQuickAdd = (product) => {
    if (addBusy) return;
    setAddBusy(product.id);
    getComparison(product.id)
      .then(variants => {
        if (!variants || variants.length === 0) throw new Error('No variants found');
        return addListItem(activeListId, variants[0].variant_id, 1);
      })
      .then(() => getListDetail(activeListId))
      .then(detail => {
        setActiveDetail(detail);
        setAddDone(prev => ({ ...prev, [product.id]: true }));
        getLists().then(setListMetas).catch(() => {});
      })
      .catch(err => setError(err.message))
      .finally(() => setAddBusy(null));
  };

  const handleOcrOpen = () => {
    // Pre-populate with items already checked as purchased
    const purchased = (activeDetail?.items || []).filter(item => item.is_purchased ?? item.purchased);
    if (purchased.length === 0) {
      setOcrOpen(true); setOcrStep(0); setOcrResults([]); setOcrChecked({});
      return;
    }
    const mapped = purchased.map(item => ({
      product: item.product_name ?? item.product,
      price: item.best_price ?? 0,
      unit_price: item.best_unit_price ?? 0,
      qty: item.quantity ?? item.qty ?? 1,
      matched: true,
    }));
    setOcrResults(mapped);
    const checked = {};
    mapped.forEach((_, i) => { checked[i] = true; });
    setOcrChecked(checked);
    setOcrOpen(true);
    setOcrStep(1);
  };

  const handleOcrConfirm = () => {
    const selectedItems = ocrResults.filter((_, i) => ocrChecked[i]);
    setOcrSubmitting(true);
    const storeName = activeDetail?.cheapest_store || 'Unknown';
    processReceipt(activeListId, storeName, selectedItems)
      .then(() => getListDetail(activeListId))
      .then(detail => { setActiveDetail(detail); setOcrStep(2); })
      .catch(err => setError(err.message))
      .finally(() => setOcrSubmitting(false));
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  // Normalise field names: backend uses list_id/list_item_id, mock uses id
  const items = activeDetail?.items || [];
  const storeTotals = activeDetail?.store_totals || {};
  const sortedStores = Object.entries(storeTotals).sort((a, b) => a[1] - b[1]);
  const cheapest = sortedStores[0];
  const expensive = sortedStores[sortedStores.length - 1];
  const savings = activeDetail?.savings_vs_expensive != null
    ? activeDetail.savings_vs_expensive.toFixed(2)
    : (cheapest && expensive ? (expensive[1] - cheapest[1]).toFixed(2) : '0.00');

  return (
    <div className="page lists-page" style={{ opacity: show ? 1 : 0, transform: show ? 'none' : 'translateY(30px)' }}>
      <h2 className="page-title">Shopping Lists</h2>
      <p className="page-sub">Build lists and find the cheapest store for everything</p>

      <div className="list-tabs">
        {listMetas.map(l => {
          const id = l.list_id ?? l.id;
          return (
            <button
              key={id}
              className={`ltab2 ${activeListId === id ? 'active' : ''}`}
              onClick={() => setActiveListId(id)}
            >
              {l.name}
            </button>
          );
        })}
        <button className="ltab2 add-ltab" onClick={handleCreateList}><PlusSvg /> New List</button>
      </div>

      {loadingDetail ? (
        <div className="loading">Loading list...</div>
      ) : (
        <>
          {cheapest && (
            <div className="store-banner">
              <div className="sb-best">
                <span className="sb-label">Cheapest Store</span>
                <span className="sb-store" style={{ color: STORE_COLORS[cheapest[0]] }}>{cheapest[0]}</span>
                <span className="sb-price">${cheapest[1].toFixed(2)}</span>
              </div>
              <div className="sb-savings">
                <span className="sb-save">Save ${savings}</span>
                <span className="sb-vs">vs. {expensive[0]}</span>
              </div>
              <div className="sb-all">
                {sortedStores.map(([s, t]) => (
                  <div key={s} className="sb-row">
                    <span className="sb-dot" style={{ background: STORE_COLORS[s] }} />
                    <span className="sb-name">{s}</span>
                    <span className="sb-total">${t.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeDetail && (
            <div className="list-card">
              <div className="list-card-head">
                <h3>{activeDetail.name}</h3>
                <span className="list-cnt">{items.length} items</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '-4px 0 8px', fontFamily: 'Outfit, sans-serif' }}>
                Check items off as you shop — checked items count toward your spending analytics.
              </p>

              {items.map((item, i) => {
                const itemId = item.list_item_id ?? item.id;
                const isPurchased = item.is_purchased ?? item.purchased ?? false;
                const storeColor = item.best_store_color ?? STORE_COLORS[item.bestStore];
                const storeName = item.best_store ?? item.bestStore;
                const price = item.best_price ?? item.bestPrice;
                const qty = item.quantity ?? item.qty;
                const productName = item.product_name ?? item.product;

                return (
                  <div
                    key={itemId ?? i}
                    className={`li-row ${isPurchased ? 'done' : ''}`}
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <button
                      className={`li-check ${isPurchased ? 'checked' : ''}`}
                      onClick={() => handleTogglePurchased(itemId, i, isPurchased)}
                    >
                      {isPurchased && <CheckSvg />}
                    </button>
                    <span className="li-icon">{item.icon ?? '🛒'}</span>
                    <div className="li-info">
                      <span className="li-name">{productName}</span>
                      <span className="li-detail">Qty: {qty} · {item.unit}</span>
                    </div>
                    <div className="li-price">
                      <span className="li-bp">${price ? (price * qty).toFixed(2) : '—'}</span>
                      <span className="li-bs" style={{ color: storeColor }}>{storeName}</span>
                    </div>
                    <button
                      className="li-delete"
                      title="Remove item"
                      onClick={(e) => { e.stopPropagation(); handleDeleteItem(itemId); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', fontSize: 16, color: 'var(--sand)', marginLeft: 4, flexShrink: 0 }}
                      onMouseEnter={e => e.currentTarget.style.color = '#c0392b'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--sand)'}
                    >✕</button>
                  </div>
                );
              })}

              <button className="add-item-btn" onClick={handleAddItemOpen}>
                <PlusSvg /> Add Item
              </button>
            </div>
          )}
        </>
      )}

      {/* Add Item Modal */}
      {addItemOpen && (
        <div className="ocr-modal">
          <div className="ocr-card">
            <div className="ocr-head">
              <h3>Add Item to List</h3>
              <button className="ocr-close" onClick={() => setAddItemOpen(false)}>✕</button>
            </div>
            <div style={{ padding: '12px 24px 24px' }}>
              <input
                autoFocus
                placeholder="Search products..."
                value={addSearch}
                onChange={e => setAddSearch(e.target.value)}
                style={{ width: '100%', marginBottom: 12, padding: '10px 14px', border: '1px solid var(--sand)', borderRadius: 10, fontSize: 14, fontFamily: 'Outfit, sans-serif', boxSizing: 'border-box' }}
              />
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Tap a product to add (auto-picks cheapest option, qty 1)</p>
              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                {allProducts
                  .filter(p => !addSearch || p.name.toLowerCase().includes(addSearch.toLowerCase()))
                  .map(p => {
                    const done = addDone[p.id];
                    const busy = addBusy === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => !done && handleQuickAdd(p)}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 8px', cursor: busy ? 'wait' : done ? 'default' : 'pointer', borderBottom: '1px solid #f0ede4', borderRadius: 8, opacity: busy ? 0.5 : 1 }}
                        onMouseEnter={e => { if (!done && !busy) e.currentTarget.style.background = '#f9f7f0'; }}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <span style={{ fontSize: 22 }}>{p.icon}</span>
                        <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, color: 'var(--brown-deep)', flex: 1 }}>{p.name}</span>
                        {busy && <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'Outfit, sans-serif' }}>Adding...</span>}
                        {done && <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600, fontFamily: 'Outfit, sans-serif' }}>Added!</span>}
                        {!busy && !done && <PlusSvg />}
                      </div>
                    );
                  })
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Process Purchased Items */}
      <div className="ocr-section">
        <button className="ocr-trigger" onClick={handleOcrOpen}>
          <CheckSvg />
          <div>
            <strong>Process Purchased Items</strong>
            <p>Save prices to history & update your home inventory — no receipt needed</p>
          </div>
          <ArrowR />
        </button>

        {ocrOpen && (
          <div className="ocr-modal">
            <div className="ocr-card">
              <div className="ocr-head">
                <h3>Process Purchased Items</h3>
                <button className="ocr-close" onClick={() => setOcrOpen(false)}>✕</button>
              </div>

              {ocrStep === 0 && (
                <div className="ocr-upload">
                  <div style={{ textAlign: 'center', padding: '24px 16px' }}>
                    <p style={{ fontSize: 14, color: 'var(--brown)', marginBottom: 8, fontFamily: 'Outfit, sans-serif' }}>No checked items yet</p>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'Outfit, sans-serif' }}>Go back and check off the items you've purchased, then come back here to save prices & update inventory.</p>
                  </div>
                </div>
              )}

              {ocrStep === 1 && (
                <div className="ocr-confirm">
                  <p className="ocr-confirm-title">Review purchased items</p>
                  <p className="ocr-confirm-sub">These are the items you checked off. Confirm to save prices & update inventory.</p>
                  <div className="ocr-select-all">
                    <button className="ocr-sel-btn" onClick={() => {
                      const allChecked = Object.values(ocrChecked).every(v => v);
                      const next = {};
                      ocrResults.forEach((_, i) => { next[i] = !allChecked; });
                      setOcrChecked(next);
                    }}>
                      {Object.values(ocrChecked).every(v => v) ? 'Deselect All' : 'Select All'}
                    </button>
                    <span className="ocr-sel-count">
                      {Object.values(ocrChecked).filter(Boolean).length} of {ocrResults.length} selected
                    </span>
                  </div>
                  <div className="ocr-results">
                    {ocrResults.map((r, i) => (
                      <div key={i} className={`ocr-row ${r.matched ? '' : 'unmatched'} ${!ocrChecked[i] ? 'unchecked' : ''}`}>
                        <button
                          className={`ocr-check ${ocrChecked[i] ? 'checked' : ''}`}
                          onClick={() => setOcrChecked(p => ({ ...p, [i]: !p[i] }))}
                        >
                          {ocrChecked[i] && <CheckSvg />}
                        </button>
                        <div className="ocr-ri">
                          <div className="ocr-top-row">
                            <input className="ocr-input ocr-name-input" defaultValue={r.product} />
                            {r.matched
                              ? <span className="ocr-match">✓ Matched</span>
                              : <span className="ocr-nomatch">? No match</span>}
                          </div>
                          <div className="ocr-edit-row">
                            <div className="ocr-field">
                              <label className="ocr-field-label">Qty</label>
                              <input className="ocr-field-input" type="number" defaultValue={r.qty} />
                            </div>
                            <div className="ocr-field">
                              <label className="ocr-field-label">Price</label>
                              <div className="ocr-price-input">
                                <span className="ocr-dollar">$</span>
                                <input className="ocr-field-input" type="number" step="0.01" defaultValue={r.price.toFixed(2)} />
                              </div>
                            </div>
                            <div className="ocr-field">
                              <label className="ocr-field-label">Unit Price</label>
                              <span className="ocr-unit-price">${(r.price / r.qty).toFixed(2)}/ea</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="ocr-actions">
                    <button
                      className="btn-primary"
                      disabled={ocrSubmitting || Object.values(ocrChecked).filter(Boolean).length === 0}
                      onClick={handleOcrConfirm}
                    >
                      {ocrSubmitting
                        ? 'Saving...'
                        : `Confirm & Save (${Object.values(ocrChecked).filter(Boolean).length} items)`}
                      {!ocrSubmitting && <CheckSvg />}
                    </button>
                  </div>
                </div>
              )}

              {ocrStep === 2 && (
                <div className="ocr-done">
                  <div className="ocr-done-icon">✅</div>
                  <h3>All Done!</h3>
                  <div className="ocr-done-list">
                    <div className="ocr-done-item"><CheckSvg /> Prices saved to history</div>
                    <div className="ocr-done-item"><CheckSvg /> Inventory updated</div>
                    <div className="ocr-done-item"><CheckSvg /> Spending analytics refreshed</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
                    <button className="btn-primary" onClick={() => {
                      clearPurchasedItems(activeListId)
                        .then(() => getListDetail(activeListId))
                        .then(detail => {
                          setActiveDetail(detail);
                          getLists().then(setListMetas).catch(() => {});
                        })
                        .catch(() => {});
                      setOcrOpen(false);
                    }}>Done — Clear purchased items <ArrowR /></button>
                    <button className="btn-secondary" style={{ width: '100%' }} onClick={() => {
                      clearPurchasedItems(activeListId).catch(() => {});
                      setOcrOpen(false);
                      onNavigate('inventory');
                    }}>View Inventory <ArrowR /></button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}