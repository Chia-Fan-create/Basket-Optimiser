import streamlit as st
import pandas as pd
import textwrap # For Markdown formatting
from db.session import SessionLocal
from db.repository import ProductRepository

'''
Streamlit App: Basket Optimiser
Using Streamlit for a user-friendly interface to compare unit prices of products across different stores.
'''
# ---------------------
# Page Config
# ---------------------
st.set_page_config(
    page_title="Basket Optimiser",
    page_icon="🧺",
    layout="wide"
)

# ---------------------
# Custom Assets
# ---------------------

def inject_custom_assets():
    with open("web/css/main.css", "r") as f:
        custom_css = textwrap.dedent(f.read())
# Google Fonts
    st.markdown(
    """
    <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600&family=Roboto:wght@500;700&display=swap" rel="stylesheet">
    """,
    unsafe_allow_html=True
)

# CSS
    st.markdown(
    f"""
    <style>
    {custom_css}

    .stApp {{
        font-family: 'Open Sans', sans-serif;
    }}

    h1, h2, h3, .fw-bold {{
        font-family: 'Roboto', sans-serif;
    }}

    [data-testid="stHeader"], [data-testid="stFooter"] {{
        display: none;
    }}
    </style>
    """,
    unsafe_allow_html=True
)

inject_custom_assets()

# ---------------------
# DB Init
# ---------------------
db = SessionLocal()
repo = ProductRepository(db)

# ---------------------
# Header
# ---------------------
st.markdown("""
<div class="container py-3">
  <h1 class="fw-bold mb-1">🧺 Basket Optimiser</h1>
  <p class="text-secondary">
    Compare unit prices across Amazon, Target, and Walmart
  </p>
</div>
""", unsafe_allow_html=True)

# ---------------------
# Feature Tabs
# ---------------------
tab_compare, tab_trend, tab_forecast = st.tabs([
    "Unit Price Comparison",
    "Price Trend (Soon)",
    "Price Forecast (Soon)"
])

# ---------------------
# Unit Price Comparison
# ---------------------
with tab_compare:
    st.markdown("### 🔍 Select a product")

    product_options = [
        "Toilet Paper",
        "Protein Bar",
        "Paper Towel",
        "Chicken Breast"
    ]

    selected_product = st.selectbox(
        "Product",
        options=product_options,
        label_visibility="collapsed"
    )

    raw_data = repo.get_latest_prices_by_product(selected_product)

    if not raw_data:
        st.warning(f"No data available for **{selected_product}**.")
    else:
        df = pd.DataFrame(raw_data)

        # only keep rows with valid price and unit info for comparison
        df = df[df["price_per_unit"] > 0]

        if df.empty:
            st.warning("No valid price data available for comparison.")
            st.stop()

        df = df.sort_values("price_per_unit").reset_index(drop=True)

        # Best Deal (Top 1)
        best = df.iloc[0]
        unit_label = best['normalized_unit'] or "unit"

        st.markdown("### 👑 Best Deal")
        st.markdown(f"""
        <div class="card best-deal p-4 mb-4">
          <span class="badge best-badge mb-2">BEST VALUE</span>
          <h4 class="fw-bold">{best['store_name']}</h4>
          <p class="text-muted mb-1">{best['product_name']}</p>
          <h2 class="unit-price">${best['price_per_unit']:.3f} / {unit_label}</h2>
          <a href="{best['product_url']}" target="_blank"
             class="btn btn-outline-primary btn-sm mt-2">
             View on Store
          </a>
        </div>
        """, unsafe_allow_html=True)

        # Next Best Options (Top 2–3)
        st.markdown("### 🥈 Other Top Options")
        cols = st.columns(2)

        for i, (_, row) in enumerate(df.iloc[1:3].iterrows()):
            with cols[i]:
                st.markdown(f"""
                <div class="card p-3 h-100">
                  <span class="badge bg-secondary mb-2">{row['store_name']}</span>
                  <p class="fw-semibold mb-1">{row['product_name'][:60]}...</p>
                  <div class="unit-price">${row['price_per_unit']:.3f} / {row['normalized_unit']}</div>
                  <a href="{row.get('product_url', '#')}" target="_blank"
                     class="btn btn-outline-primary btn-sm mt-2 w-100">
                     View
                  </a>
                </div>
                """, unsafe_allow_html=True)

        # Remaining Options
        st.markdown("### 📊 All Options (Ranked)")
        for i, (_, row) in enumerate(df.iloc[3:].iterrows(), start=4):
            st.markdown(f"""
            <div class="list-group-item d-flex justify-content-between align-items-center
                        border rounded mb-2 p-3 bg-white shadow-sm">
              <div>
                <strong>{i}. {row['store_name']}</strong><br>
                <small class="text-muted">{row['product_name']}</small>
              </div>
              <div class="text-end">
                <strong>${row['price_per_unit']:.3f} / {row['normalized_unit']}</strong>
              </div>
            </div>
            """, unsafe_allow_html=True)

# ---------------------
# Price Trend (Placeholder)
# ---------------------
with tab_trend:
    st.info("📈 Price trend visualization coming soon. Historical price tracking is under development.")

# ---------------------
# Price Forecast (Placeholder)
# ---------------------
with tab_forecast:
    st.info("🔮 Price forecasting models will be added after sufficient historical data is collected.")

db.close()