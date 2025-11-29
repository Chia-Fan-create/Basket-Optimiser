import streamlit as st
import pandas as pd

st.set_page_config(page_title="Basket Optimiser", layout="wide")
st.title("🧺 Basket Optimiser - Grocery Unit Price Comparison")

uploaded = st.file_uploader("Upload cleaned JSON file", type=["json", "csv"])

if uploaded:
    if uploaded.name.endswith(".json"):
        df = pd.read_json(uploaded)
    else:
        df = pd.read_csv(uploaded)

    st.subheader("🧾 Raw Products List")
    st.dataframe(df)

    # 排序 by price
    if "price" in df.columns:
        st.subheader("💰 Sorted by Price (Lowest First)")
        st.dataframe(df.sort_values("price"))

    # 顯示 Per-unit 價格 (待你之後加上 converter 再自動化)
    if "price" in df.columns and "unit" in df.columns:
        st.subheader("⚖️ Price per Unit (Simplified - Placeholder)")
        df["price_per_unit"] = df["price"]  # ➜ 可替換為你的 normalize 邏輯
        st.dataframe(df.sort_values("price_per_unit"))
