"""
rental_agent.py — Gross rental yield score (0-100).

Loads data/zillow_rent.csv (monthly rent by ZIP) and data/zillow.csv (home
price by ZIP), calculates:
    gross_yield = (monthly_rent * 12) / home_price * 100

Normalises on a capped scale where 8%+ yield earns a score of 100.

Stores the result in state["rental_yield"].
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from state import AgentState

DATA_DIR   = Path(__file__).parent.parent / "data"
ZILLOW_CSV = DATA_DIR / "zillow.csv"
RENT_CSV   = DATA_DIR / "zillow_rent.csv"

# Normalisation: 0% yield → score 0, ≥8% yield → score 100
_MAX_YIELD_PCT = 8.0


def _yield_to_score(gross_yield_pct: float) -> float:
    """Linearly clamp gross yield % to [0, 100]."""
    return max(0.0, min(100.0, gross_yield_pct / _MAX_YIELD_PCT * 100))


def rental_agent(state: AgentState) -> AgentState:
    """
    LangGraph node: populates state["rental_yield"].

    Expected CSV schemas
    --------------------
    zillow.csv      : RegionName (ZIP as str), ... date columns (latest = home price)
    zillow_rent.csv : RegionName (ZIP as str), ... date columns (latest = monthly rent)
    """
    zip_code = state.get("zip_code", "")
    print(f"\n[RentalAgent] Calculating rental yield for ZIP: {zip_code}")

    try:
        price_df = pd.read_csv(ZILLOW_CSV,  dtype={"RegionName": str})
        rent_df  = pd.read_csv(RENT_CSV,    dtype={"RegionName": str})

        # Helper: get the most-recent date column value for a ZIP
        def latest_value(df: pd.DataFrame, zip_str: str) -> float | None:
            row = df[df["RegionName"] == zip_str]
            if row.empty:
                return None
            date_cols = sorted(
                [c for c in df.columns if c[:4].isdigit() and len(c) == 10],
                key=lambda c: pd.to_datetime(c),
            )
            if not date_cols:
                return None
            val = pd.to_numeric(row[date_cols[-1]].values[0], errors="coerce")
            return None if pd.isna(val) else float(val)

        home_price   = latest_value(price_df, str(zip_code))
        monthly_rent = latest_value(rent_df,  str(zip_code))

        if home_price is None:
            print(f"[RentalAgent] No home price found for ZIP {zip_code}.")
            return {**state, "rental_yield": None}
        if monthly_rent is None:
            print(f"[RentalAgent] No rent data found for ZIP {zip_code}.")
            return {**state, "rental_yield": None}
        if home_price == 0:
            print("[RentalAgent] Home price is zero; cannot compute yield.")
            return {**state, "rental_yield": None}

        gross_yield = (monthly_rent * 12) / home_price * 100
        score       = _yield_to_score(gross_yield)

        print(
            f"[RentalAgent] rent=${monthly_rent:,.0f}/mo  "
            f"price=${home_price:,.0f}  "
            f"yield={gross_yield:.2f}%  score={score:.1f}"
        )
        return {**state, "rental_yield": round(score, 2)}

    except FileNotFoundError as exc:
        print(f"[RentalAgent] CSV not found: {exc.filename} — returning neutral score 50.0")
        return {**state, "rental_yield": 50.0}
    except Exception as exc:
        print(f"[RentalAgent] Unexpected error: {exc}")
        return {**state, "rental_yield": None}
