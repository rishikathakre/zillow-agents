"""
rental_agent.py -- Real gross rental yield score (0-100).

Data sources
------------
1. Census ACS 5-year: median gross rent + median home value
2. Zillow API: rentZestimate from listings (enrichment)

Scoring formula
---------------
  gross_yield = (annual_rent / home_price) * 100
  score = clamp(gross_yield / 8.0 * 100, 0, 100)
  where 8%+ annual yield -> score 100, 0% -> score 0
"""
from __future__ import annotations

import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from services import census as svc_census
from services.zillow_csv import get_median_price, get_median_rent
from state import AgentState

log = logging.getLogger(__name__)

_MAX_YIELD_PCT = 8.0   # 8%+ annual yield -> score 100


def _yield_to_score(gross_yield_pct: float) -> float:
    return max(0.0, min(100.0, gross_yield_pct / _MAX_YIELD_PCT * 100))


def rental_agent(state: AgentState) -> AgentState:
    zip_code = state.get("zip_code", "")
    env_keys = state.get("env_keys", {})
    print(f"\n[RentalAgent] Fetching real rental data for ZIP: {zip_code}")

    try:
        # ── 1. Census ACS: median rent + median home value ────────────────────
        census = svc_census.get_acs_data(zip_code)
        monthly_rent = census.get("median_rent")
        home_price   = census.get("median_home_value")

        if monthly_rent:
            print(f"[RentalAgent] Census median rent: ${monthly_rent:,}/mo")
        if home_price:
            print(f"[RentalAgent] Census median home value: ${home_price:,}")

        # ── 2. Zillow CSV data enrichment ────────────────────────────────────
        csv_price = get_median_price(zip_code)
        csv_rent = get_median_rent(zip_code)
        if csv_rent and csv_rent > 0:
            print(f"[RentalAgent] Zillow CSV rent: ${csv_rent:,.0f}/mo")
            monthly_rent = csv_rent if not monthly_rent else (
                0.4 * monthly_rent + 0.6 * csv_rent
            )
        if csv_price and csv_price > 0 and not home_price:
            home_price = csv_price

        # ── 3. Compute gross yield and score ─────────────────────────────────
        if not monthly_rent:
            print(f"[RentalAgent] No rent data for {zip_code} -- using neutral 50.0")
            return {**state, "rental_yield": 50.0}

        if not home_price or home_price == 0:
            print(f"[RentalAgent] No price data for {zip_code} -- using neutral 50.0")
            return {**state, "rental_yield": 50.0}

        annual_rent  = monthly_rent * 12
        gross_yield  = annual_rent / home_price * 100
        score        = _yield_to_score(gross_yield)

        print(f"[RentalAgent] rent=${monthly_rent:,.0f}/mo  "
              f"price=${home_price:,.0f}  "
              f"yield={gross_yield:.2f}%  score={score:.1f}")

        return {**state, "rental_yield": round(score, 2)}

    except Exception as exc:
        log.error("[RentalAgent] Unexpected error: %s", exc, exc_info=True)
        return {**state, "rental_yield": 50.0}
