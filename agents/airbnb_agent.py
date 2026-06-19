"""
airbnb_agent.py -- Real short-term rental (STR) viability score (0-100).

Data sources
------------
1. Census ACS 5-year: median rent, median home value, population
2. Zillow RapidAPI: live rent estimates + listing prices (enrichment)

Scoring formula
---------------
  ltr_yield = (monthly_rent * 12) / home_price * 100   # long-term rental yield
  str_premium = urbanization multiplier (1.4x – 2.2x)  # based on population proxy
  str_yield_est = ltr_yield * str_premium               # estimated STR yield
  score = clamp(str_yield_est / 15% * 100, 0, 100)

  Where 15%+ annual STR yield -> score 100, 0% -> score 0.

Rationale: STR revenue is typically 1.4x–2.2x long-term rent in urban/tourist
markets. This agent uses Census median rent/value to establish the LTR baseline
and adjusts for urbanization (population > 100k in metro -> higher STR premium).
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

# STR yield cap: 15%+ annual yield -> score 100
_MAX_STR_YIELD = 15.0

# Urbanization population thresholds -> STR premium multiplier
# High population density ZIP -> more tourist/business demand -> higher STR premium
_URBAN_TIERS = [
    (150_000, 2.2),    # dense urban / major metro
    (80_000,  1.9),    # urban
    (40_000,  1.6),    # suburban/urban fringe
    (15_000,  1.4),    # suburban
    (0,       1.2),    # rural
]


def _str_premium(population: int) -> float:
    for threshold, multiplier in _URBAN_TIERS:
        if population >= threshold:
            return multiplier
    return 1.2


def _yield_to_score(str_yield_pct: float) -> float:
    return max(0.0, min(100.0, str_yield_pct / _MAX_STR_YIELD * 100))


def airbnb_agent(state: AgentState) -> AgentState:
    zip_code = state.get("zip_code", "")
    env_keys = state.get("env_keys", {})
    print(f"\n[AirbnbAgent] Estimating STR viability for ZIP: {zip_code}")

    try:
        # ── 1. Census ACS: median rent + home value + population ──────────────
        census       = svc_census.get_acs_data(zip_code)
        monthly_rent = census.get("median_rent")
        home_price   = census.get("median_home_value")
        population   = census.get("population") or 0

        if monthly_rent:
            print(f"[AirbnbAgent] Census median rent: ${monthly_rent:,}/mo")
        if home_price:
            print(f"[AirbnbAgent] Census median home value: ${home_price:,}")
        if population:
            print(f"[AirbnbAgent] Census population: {population:,}")

        # ── 2. Zillow CSV data enrichment ────────────────────────────────────
        csv_price = get_median_price(zip_code)
        csv_rent = get_median_rent(zip_code)
        if csv_rent and csv_rent > 0:
            print(f"[AirbnbAgent] Zillow CSV rent: ${csv_rent:,.0f}/mo")
            monthly_rent = csv_rent if not monthly_rent else (
                0.4 * monthly_rent + 0.6 * csv_rent
            )
        if csv_price and csv_price > 0 and not home_price:
            home_price = csv_price

        # ── 3. Compute STR viability score ────────────────────────────────────
        if not monthly_rent:
            print(f"[AirbnbAgent] No rent data for {zip_code} -- using neutral 50.0")
            return {**state, "airbnb_score": 50.0}

        if not home_price or home_price == 0:
            print(f"[AirbnbAgent] No price data for {zip_code} -- using neutral 50.0")
            return {**state, "airbnb_score": 50.0}

        annual_rent = monthly_rent * 12
        ltr_yield   = annual_rent / home_price * 100

        # Apply STR premium based on urbanization
        premium     = _str_premium(population)
        str_yield   = ltr_yield * premium
        score       = _yield_to_score(str_yield)

        print(f"[AirbnbAgent] rent=${monthly_rent:,.0f}/mo  price=${home_price:,.0f}  "
              f"pop={population:,}  ltr_yield={ltr_yield:.2f}%  "
              f"str_premium={premium:.1f}x  str_yield_est={str_yield:.2f}%  "
              f"score={score:.1f}")

        return {**state, "airbnb_score": round(score, 2)}

    except Exception as exc:
        log.error("[AirbnbAgent] Unexpected error: %s", exc, exc_info=True)
        return {**state, "airbnb_score": 50.0}
