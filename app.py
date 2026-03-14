import streamlit as st
import pandas as pd
import plotly.graph_objects as go
from db.session import SessionLocal
from db.repository import ProductRepository

# ---------------------
# Page Config
# ---------------------
st.set_page_config(
    page_title="Basket Optimiser",
    page_icon="🧺",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# ---------------------
# Custom CSS (loaded from external file)
# ---------------------
def load_css(filepath: str):
    with open(filepath, "r") as f:
        st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)

load_css("web/css/main.css")

# ---------------------
# DB Init
# ---------------------
db = SessionLocal()
repo = ProductRepository(db)

# ---------------------
# Product List
# ---------------------
PRODUCT_OPTIONS = [
    "Toilet Paper",
    "Protein Bar",
    "Paper Towel",
    "Chicken Breast",
]

# ---------------------
# Helper: store color class
# ---------------------
def store_class(name: str) -> str:
    lower = name.lower()
    if "walmart" in lower:
        return "store-walmart"
    if "target" in lower:
        return "store-target"
    if "amazon" in lower:
        return "store-amazon"
    return ""

# ---------------------
# Helper: store initial
# ---------------------
def store_initial(name: str) -> str:
    return name[0].upper() if name else "?"

# ---------------------
# Header
# ---------------------
st.markdown(
    '<div class="app-header">'
    '<span style="font-size:1.6rem;">🧺</span>'
    '<h1>Basket Optimiser</h1>'
    '</div>'
    '<p class="app-subtitle">Compare unit prices across Amazon, Target, and Walmart — find the best deal instantly.</p>',
    unsafe_allow_html=True,
)

# ---------------------
# Product Selection & Search
# ---------------------
filter_col1, filter_col2 = st.columns([2, 3])

with filter_col1:
    selected_product = st.selectbox(
        "Product",
        options=PRODUCT_OPTIONS,
        label_visibility="collapsed",
    )

with filter_col2:
    search_query = st.text_input(
        "Search",
        placeholder="🔍 Filter by keyword...",
        label_visibility="collapsed",
    )

# ---------------------
# Load Data
# ---------------------
raw_data = repo.get_latest_prices_by_product(selected_product)

if not raw_data:
    st.warning(f"No data available for **{selected_product}**.")
    db.close()
    st.stop()

df = pd.DataFrame(raw_data)
df = df[df["price_per_unit"] > 0].copy()

# Apply keyword filter if user typed something
if search_query:
    mask = df["product_name"].str.lower().str.contains(search_query.lower(), na=False)
    if mask.any():
        df = df[mask].copy()

if df.empty:
    st.warning("No valid price data available for comparison.")
    db.close()
    st.stop()

df = df.sort_values("price_per_unit").reset_index(drop=True)

# ---------------------
# Compute Stats
# ---------------------
best = df.iloc[0]
worst = df.iloc[-1]
unit_label = best["normalized_unit"] or "unit"
total_products = len(df)

# Max savings: use only rows with valid price_per_unit (not None, NaN, or 0)
valid_prices = df["price_per_unit"].dropna()
valid_prices = valid_prices[valid_prices > 0]
if len(valid_prices) >= 2:
    savings_pct = round((1 - valid_prices.min() / valid_prices.max()) * 100)
else:
    savings_pct = 0

# ---------------------
# Metric Cards
# ---------------------
metric_html = (
    '<div class="metric-row" style="grid-template-columns:repeat(2,1fr);">'
    '<div class="metric-card">'
    f'<p class="metric-label">Products found</p>'
    f'<p class="metric-value">{total_products}</p>'
    '</div>'
    '<div class="metric-card">'
    f'<p class="metric-label">Max savings</p>'
    f'<p class="metric-value green">{savings_pct}%</p>'
    '</div>'
    '</div>'
)
st.markdown(metric_html, unsafe_allow_html=True)

# ---------------------
# Tabs
# ---------------------
tab_compare, tab_trend, tab_forecast = st.tabs([
    "🏆  Unit Price Comparison",
    "📈  Price Trend",
    "🔮  Price Forecast",
])

# =====================
# TAB: Unit Price Comparison
# =====================
with tab_compare:

    # ── Best Deal ──
    st.markdown('<p class="section-title">Best deal</p>', unsafe_allow_html=True)

    best_url = best.get("product_url", "#")
    best_deal_html = (
        '<div class="best-deal-card">'
        '<div class="best-deal-left">'
        f'<div class="best-deal-icon">{store_initial(best["store_name"])}</div>'
        '<div>'
        '<span class="best-badge">Best value</span>'
        f'<p class="best-deal-name">{best["store_name"]} — {best["product_name"][:70]}</p>'
        f'<p class="best-deal-sub">Saves {savings_pct}% vs. most expensive option</p>'
        '</div>'
        '</div>'
        '<div>'
        f'<p class="best-deal-price">${best["price_per_unit"]:.4f}</p>'
        f'<p class="best-deal-unit">per {unit_label}</p>'
        '</div>'
        '</div>'
    )
    st.markdown(best_deal_html, unsafe_allow_html=True)

    # ── Ranking Table ──
    st.markdown('<p class="section-title">All options ranked</p>', unsafe_allow_html=True)

    best_price = df.iloc[0]["price_per_unit"]
    worst_price = df.iloc[-1]["price_per_unit"]

    TOP_N = 10

    def build_table_rows(data, start_rank=1):
        rows = ""
        for idx, (_, row) in enumerate(data.iterrows()):
            rank = start_rank + idx
            rank_cls = "best" if rank == 1 else ""
            pill_cls = store_class(row["store_name"])
            price_cls = "price-best" if rank == 1 else ("price-worst" if rank == len(df) else "")

            if rank == 1:
                vs_text = "—"
                vs_cls = "neutral"
            else:
                diff_pct = round((row["price_per_unit"] / best_price - 1) * 100)
                vs_cls = "warn" if diff_pct <= 30 else "bad"
                vs_text = f"+{diff_pct}%"

            url = row.get("product_url", "#")
            name_display = row["product_name"][:65]
            unit = row["normalized_unit"] or unit_label

            rows += (
                f'<tr>'
                f'<td class="rank-num {rank_cls}">{rank}</td>'
                f'<td><span class="store-pill {pill_cls}">{row["store_name"]}</span></td>'
                f'<td class="product-name-cell" title="{row["product_name"]}">{name_display}</td>'
                f'<td class="right {price_cls}">${row["price_per_unit"]:.4f}/{unit}</td>'
                f'<td class="right vs-best {vs_cls}">{vs_text}</td>'
                f'<td class="right link-cell"><a href="{url}" target="_blank">View ↗</a></td>'
                f'</tr>'
            )
        return rows

    table_header = (
        '<table class="rank-table">'
        '<thead><tr>'
        '<th>Rank</th>'
        '<th>Store</th>'
        '<th>Product</th>'
        '<th class="right">Unit price</th>'
        '<th class="right">vs. best</th>'
        '<th class="right">Link</th>'
        '</tr></thead>'
    )

    # Top 10
    df_top = df.iloc[:TOP_N]
    top_rows = build_table_rows(df_top, start_rank=1)
    top_table_html = table_header + f'<tbody>{top_rows}</tbody></table>'
    st.markdown(top_table_html, unsafe_allow_html=True)

    # Remaining rows in expander
    if len(df) > TOP_N:
        df_rest = df.iloc[TOP_N:].copy()
        with st.expander(f"Show more ({len(df_rest)} more options)"):
            rest_rows = build_table_rows(df_rest, start_rank=TOP_N + 1)
            rest_table_html = table_header + f'<tbody>{rest_rows}</tbody></table>'
            st.markdown(rest_table_html, unsafe_allow_html=True)

    # ── Horizontal Bar Chart — price per unit comparison ──
    st.markdown('<p class="section-title">Price per unit comparison</p>', unsafe_allow_html=True)

    # Color gradient: green (cheapest) → yellow (mid) → red (most expensive)
    df_chart = df.iloc[:TOP_N]
    n = len(df_chart)
    bar_colors = []
    for i in range(n):
        ratio = i / max(n - 1, 1)
        if ratio <= 0.5:
            t = ratio * 2
            r = int(5 + t * 229)
            g = int(150 + t * (163 - 150))
            b = int(105 - t * 105)
        else:
            t = (ratio - 0.5) * 2
            r = int(234 + t * (220 - 234))
            g = int(163 - t * 125)
            b = int(0)
        bar_colors.append(f"rgb({r},{g},{b})")

    bar_labels = []
    for _, row in df_chart.iterrows():
        store = row["store_name"]
        name = row["product_name"][:40]
        bar_labels.append(f"{store} — {name}")

    fig_bar = go.Figure()
    fig_bar.add_trace(go.Bar(
        y=bar_labels,
        x=df_chart["price_per_unit"].tolist(),
        orientation="h",
        marker_color=bar_colors,
        text=[f"${p:.4f}" for p in df_chart["price_per_unit"]],
        textposition="outside",
        textfont=dict(size=12, family="DM Sans", color="#e5e7eb"),
    ))
    fig_bar.update_layout(
        height=max(n * 46 + 80, 250),
        margin=dict(l=10, r=70, t=10, b=40),
        xaxis=dict(
            title=f"Price per {unit_label}",
            showgrid=True,
            gridcolor="rgba(255,255,255,0.08)",
            zeroline=False,
            tickfont=dict(color="#9ca3af"),
            title_font=dict(color="#9ca3af"),
            tickprefix="$",
        ),
        yaxis=dict(
            autorange="reversed",
            tickfont=dict(size=12, color="#e5e7eb"),
        ),
        plot_bgcolor="rgba(0,0,0,0)",
        paper_bgcolor="rgba(0,0,0,0)",
        font=dict(family="DM Sans", size=12),
        showlegend=False,
    )
    st.plotly_chart(fig_bar, use_container_width=True)


# =====================
# TAB: Price Trend
# =====================
with tab_trend:
    # Try to load historical data if available
    has_history = False
    try:
        if hasattr(repo, "get_price_history"):
            history_data = repo.get_price_history(selected_product)
            if history_data:
                hist_df = pd.DataFrame(history_data)
                if not hist_df.empty and "scraped_at" in hist_df.columns:
                    has_history = True
    except Exception:
        has_history = False

    if has_history:
        hist_df["scraped_at"] = pd.to_datetime(hist_df["scraped_at"])

        fig_trend = go.Figure()
        store_colors = {
            "Walmart": "#059669",
            "Target": "#ef4444",
            "Amazon": "#f59e0b",
        }

        for store in hist_df["store_name"].unique():
            store_data = hist_df[hist_df["store_name"] == store].sort_values("scraped_at")
            color = store_colors.get(store, "#6b7280")
            fig_trend.add_trace(go.Scatter(
                x=store_data["scraped_at"],
                y=store_data["price_per_unit"],
                mode="lines+markers",
                name=store,
                line=dict(color=color, width=2.5),
                marker=dict(size=6),
            ))

        fig_trend.update_layout(
            height=380,
            margin=dict(l=0, r=20, t=20, b=40),
            xaxis=dict(
                showgrid=True,
                gridcolor="#f3f4f6",
                title="Date",
            ),
            yaxis=dict(
                showgrid=True,
                gridcolor="#f3f4f6",
                title=f"Price per {unit_label}",
                tickprefix="$",
            ),
            plot_bgcolor="white",
            paper_bgcolor="white",
            font=dict(family="DM Sans", size=12),
            legend=dict(
                orientation="h",
                yanchor="bottom",
                y=1.02,
                xanchor="left",
                x=0,
            ),
            hovermode="x unified",
        )
        st.plotly_chart(fig_trend, use_container_width=True)

        # Summary stats below chart
        stat1, stat2, stat3 = st.columns(3)
        avg_price = hist_df["price_per_unit"].mean()
        price_range = hist_df["price_per_unit"].max() - hist_df["price_per_unit"].min()

        with stat1:
            st.metric("Average unit price", f"${avg_price:.4f}")
        with stat2:
            st.metric("Price range", f"${price_range:.4f}")
        with stat3:
            # Calculate trend from first to last week
            earliest = hist_df.sort_values("scraped_at").iloc[0]["price_per_unit"]
            latest = hist_df.sort_values("scraped_at").iloc[-1]["price_per_unit"]
            trend_pct = ((latest - earliest) / earliest) * 100 if earliest > 0 else 0
            trend_label = f"{trend_pct:+.1f}%"
            st.metric("Trend", trend_label, delta=trend_label)
    else:
        st.markdown(
            '<div class="trend-placeholder">'
            '<p style="font-size:2rem;margin:0 0 0.5rem;">📈</p>'
            '<p style="font-weight:600;margin:0 0 0.5rem;">Price trend coming soon</p>'
            '<p style="font-size:0.85rem;margin:0;">Historical price tracking is under development.<br>'
            'Once your scraping pipeline collects data over multiple weeks, trends will appear here automatically.</p>'
            '</div>',
            unsafe_allow_html=True,
        )

        st.info(
            "💡 **Tip:** To enable this feature, add a `get_price_history(product_name)` method "
            "to your `ProductRepository` that returns rows with `store_name`, `price_per_unit`, "
            "and `scraped_at` columns."
        )


# =====================
# TAB: Price Forecast
# =====================
with tab_forecast:
    st.markdown(
        '<div class="trend-placeholder">'
        '<p style="font-size:2rem;margin:0 0 0.5rem;">🔮</p>'
        '<p style="font-weight:600;margin:0 0 0.5rem;">Price forecast coming soon</p>'
        '<p style="font-size:0.85rem;margin:0;">Time-series forecasting models will be added<br>'
        'after sufficient historical data is collected.</p>'
        '</div>',
        unsafe_allow_html=True,
    )


# ---------------------
# Footer
# ---------------------
st.markdown(
    '<div class="app-footer">'
    'Basket Optimiser — Built with Streamlit &amp; Python · Data from Amazon, Target, Walmart'
    '</div>',
    unsafe_allow_html=True,
)

# ---------------------
# Cleanup
# ---------------------
db.close()