"""
airbnb_agent.py — Short-term rental (STR) viability score (0-100).

Loads data/airbnb.csv (columns: neighbourhood, price, availability_365,
minimum_nights) and data/zillow.csv (home prices by ZIP).

Calculates:
    booked_nights    = 365 - availability_365
    annual_revenue   = booked_nights * price
    str_yield        = annual_revenue / home_price * 100

Normalises on a capped scale where 15%+ STR yield earns a score of 100.

Stores the result in state["airbnb_score"].

Note on ZIP ↔ neighbourhood matching
--------------------------------------
Inside-Airbnb data uses neighbourhood names, not ZIP codes.  This agent
expects data/airbnb.csv to include a zip_code column (or for the
neighbourhood values to exactly equal the ZIP code).  If your CSV uses
neighbourhood strings instead, add a data/zip_to_neighbourhood.csv lookup
(columns: zip_code, neighbourhood) and uncomment the join below.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from state import AgentState

DATA_DIR    = Path(__file__).parent.parent / "data"
AIRBNB_CSV  = DATA_DIR / "airbnb.csv"
ZILLOW_CSV  = DATA_DIR / "zillow.csv"

# Normalisation: 0% STR yield → score 0, ≥15% → score 100
_MAX_STR_YIELD = 15.0


def _yield_to_score(str_yield_pct: float) -> float:
    return max(0.0, min(100.0, str_yield_pct / _MAX_STR_YIELD * 100))


def _latest_price(df: pd.DataFrame, zip_str: str) -> float | None:
    """Return the most-recent date-column value for a given ZIP."""
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


def airbnb_agent(state: AgentState) -> AgentState:
    """
    LangGraph node: populates state["airbnb_score"].

    Expected CSV schemas
    --------------------
    airbnb.csv  : zip_code (str), neighbourhood (str), price (float),
                  availability_365 (int), minimum_nights (int)
    zillow.csv  : RegionName (str = ZIP), ... date columns
    """
    zip_code = state.get("zip_code", "")
    print(f"\n[AirbnbAgent] Calculating STR score for ZIP: {zip_code}")

    try:
        airbnb_df = pd.read_csv(AIRBNB_CSV, dtype={"zip_code": str})
        zillow_df = pd.read_csv(ZILLOW_CSV,  dtype={"RegionName": str})

        # Filter Airbnb listings for this ZIP
        listings = airbnb_df[airbnb_df["zip_code"] == str(zip_code)].copy()
        if listings.empty:
            print(f"[AirbnbAgent] No Airbnb listings found for ZIP {zip_code}.")
            return {**state, "airbnb_score": None}

        listings["price"]            = pd.to_numeric(listings["price"],            errors="coerce")
        listings["availability_365"] = pd.to_numeric(listings["availability_365"], errors="coerce")

        listings = listings.dropna(subset=["price", "availability_365"])
        if listings.empty:
            print("[AirbnbAgent] All listings have missing price or availability.")
            return {**state, "airbnb_score": None}

        # Estimated annual STR revenue per listing, then take the median
        listings["booked_nights"]  = 365 - listings["availability_365"].clip(0, 365)
        listings["annual_revenue"] = listings["booked_nights"] * listings["price"]
        median_revenue = listings["annual_revenue"].median()

        # Home price from Zillow
        home_price = _latest_price(zillow_df, str(zip_code))
        if home_price is None:
            print(f"[AirbnbAgent] No home price found for ZIP {zip_code}.")
            return {**state, "airbnb_score": None}
        if home_price == 0:
            print("[AirbnbAgent] Home price is zero; cannot compute STR yield.")
            return {**state, "airbnb_score": None}

        str_yield = median_revenue / home_price * 100
        score     = _yield_to_score(str_yield)

        print(
            f"[AirbnbAgent] listings={len(listings)}  "
            f"median_revenue=${median_revenue:,.0f}/yr  "
            f"home_price=${home_price:,.0f}  "
            f"str_yield={str_yield:.2f}%  score={score:.1f}"
        )
        return {**state, "airbnb_score": round(score, 2)}

    except FileNotFoundError as exc:
        print(f"[AirbnbAgent] CSV not found: {exc.filename} — returning neutral score 50.0")
        return {**state, "airbnb_score": 50.0}
    except Exception as exc:
        print(f"[AirbnbAgent] Unexpected error: {exc}")
        return {**state, "airbnb_score": None}
