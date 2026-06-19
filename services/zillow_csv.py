import pandas as pd
import os
from pathlib import Path

DATA_DIR = Path("data")
PRICES_CSV = DATA_DIR / "zillow_prices.csv"
RENT_CSV   = DATA_DIR / "zillow_rent.csv"

def _load_prices():
    if not PRICES_CSV.exists():
        return None
    return pd.read_csv(PRICES_CSV, dtype={"RegionName": str})

def _load_rent():
    if not RENT_CSV.exists():
        return None
    return pd.read_csv(RENT_CSV, dtype={"RegionName": str})

def get_median_price(zip_code: str) -> float:
    df = _load_prices()
    if df is None:
        return 0.0
    row = df[df["RegionName"] == zip_code.zfill(5)]
    if row.empty:
        return 0.0
    # Get the most recent date column value
    date_cols = [c for c in df.columns
                 if c.startswith("20")]
    if not date_cols:
        return 0.0
    latest = date_cols[-1]
    val = row.iloc[0][latest]
    return float(val) if pd.notna(val) else 0.0

def get_median_rent(zip_code: str) -> float:
    df = _load_rent()
    if df is None:
        return 0.0
    row = df[df["RegionName"] == zip_code.zfill(5)]
    if row.empty:
        return 0.0
    date_cols = [c for c in df.columns
                 if c.startswith("20")]
    if not date_cols:
        return 0.0
    latest = date_cols[-1]
    val = row.iloc[0][latest]
    return float(val) if pd.notna(val) else 0.0

def get_price_history(zip_code: str,
                      months: int = 24) -> list:
    df = _load_prices()
    if df is None:
        return []
    row = df[df["RegionName"] == zip_code.zfill(5)]
    if row.empty:
        return []
    date_cols = sorted([c for c in df.columns
                        if c.startswith("20")])
    recent = date_cols[-months:]
    result = []
    for col in recent:
        val = row.iloc[0][col]
        if pd.notna(val):
            result.append({
                "month": col[:7],
                "price": round(float(val))
            })
    return result
