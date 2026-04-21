"""
price_agent.py — Calculates a 0-100 price momentum score from Zillow ZHVI data.

Loads data/zillow.csv, filters rows whose RegionName matches the target
zip_code, computes the % price change over the last 12 months from the
time-series date columns, and normalises it to a 0-100 score stored in
state["price_score"].
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from state import AgentState

DATA_DIR  = Path(__file__).parent.parent / "data"
ZILLOW_CSV = DATA_DIR / "zillow.csv"

# Normalisation anchors: -10% growth → 0, +20% growth → 100
_MIN_PCT = -10.0
_MAX_PCT =  20.0


def _pct_to_score(pct: float) -> float:
    """Linearly clamp % growth to [0, 100]."""
    score = (pct - _MIN_PCT) / (_MAX_PCT - _MIN_PCT) * 100
    return max(0.0, min(100.0, score))


def price_agent(state: AgentState) -> AgentState:
    """
    LangGraph node: populates state["price_score"].

    Reads the Zillow ZHVI wide-format CSV (one row per ZIP, date columns like
    '2023-01-31'), finds the most recent 12 months of data, computes the
    appreciation % and normalises to 0-100.
    """
    zip_code = state.get("zip_code", "")
    print(f"\n[PriceAgent] Calculating price score for ZIP: {zip_code}")

    try:
        df = pd.read_csv(ZILLOW_CSV, dtype={"RegionName": str})

        # Filter to target ZIP
        row = df[df["RegionName"] == str(zip_code)]
        if row.empty:
            print(f"[PriceAgent] No data found for ZIP {zip_code}.")
            return {**state, "price_score": None}

        # Identify date columns (format YYYY-MM-DD)
        date_cols = sorted(
            [c for c in df.columns if c[:4].isdigit() and len(c) == 10],
            key=lambda c: pd.to_datetime(c),
        )
        if len(date_cols) < 13:
            print("[PriceAgent] Not enough date columns for a 12-month window.")
            return {**state, "price_score": None}

        latest_col   = date_cols[-1]
        year_ago_col = date_cols[-13]   # 12 months back

        latest_price   = pd.to_numeric(row[latest_col].values[0],   errors="coerce")
        year_ago_price = pd.to_numeric(row[year_ago_col].values[0], errors="coerce")

        if pd.isna(latest_price) or pd.isna(year_ago_price) or year_ago_price == 0:
            print("[PriceAgent] Missing or zero price values; cannot compute change.")
            return {**state, "price_score": None}

        pct_change = (latest_price - year_ago_price) / year_ago_price * 100
        score      = _pct_to_score(pct_change)

        print(
            f"[PriceAgent] {year_ago_col} → {latest_col}: "
            f"${year_ago_price:,.0f} → ${latest_price:,.0f} "
            f"({pct_change:+.1f}%)  score={score:.1f}"
        )
        return {**state, "price_score": round(score, 2)}

    except FileNotFoundError:
        print(f"[PriceAgent] CSV not found: {ZILLOW_CSV} — returning neutral score 50.0")
        return {**state, "price_score": 50.0}
    except Exception as exc:
        print(f"[PriceAgent] Unexpected error: {exc}")
        return {**state, "price_score": None}
