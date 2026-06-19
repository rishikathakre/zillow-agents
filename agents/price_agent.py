"""
price_agent.py -- Real price momentum + affordability score (0-100).

Data sources
------------
1. Census ACS 5-year: median home value + 3-year appreciation trend
2. Zillow API: current listing median price (enrichment when not rate-limited)

Scoring formula
---------------
  appreciation_score = normalise(annual_appreciation_pct, -5% -> 0, +15% -> 100)
  affordability_score = bracket(median_price / national_median)
  price_score = 0.60 * appreciation_score + 0.40 * affordability_score
"""
from __future__ import annotations

import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from services import census as svc_census
from services.zillow_csv import get_median_price, get_price_history
from state import AgentState

log = logging.getLogger(__name__)

NATIONAL_MEDIAN = 305_000   # ACS 2022 US median owner-occupied home value
_MIN_APPREC     = -5.0      # annual % -> score 0
_MAX_APPREC     = 15.0      # annual % -> score 100


def _apprec_score(pct: float) -> float:
    return max(0.0, min(100.0, (pct - _MIN_APPREC) / (_MAX_APPREC - _MIN_APPREC) * 100))


def _affordability_score(price: float) -> float:
    ratio = price / NATIONAL_MEDIAN
    if ratio < 0.5:   return 90.0
    if ratio < 0.8:   return 75.0
    if ratio < 1.2:   return 60.0
    if ratio < 1.8:   return 40.0
    if ratio < 2.5:   return 25.0
    return 10.0


def price_agent(state: AgentState) -> AgentState:
    zip_code  = state.get("zip_code", "")
    env_keys  = state.get("env_keys", {})
    print(f"\n[PriceAgent] Fetching real price data for ZIP: {zip_code}")

    try:
        # ── 1. Census ACS ─────────────────────────────────────────────────────
        census = svc_census.get_acs_data(zip_code)
        median_value   = census.get("median_home_value")
        annual_apprec  = census.get("annual_appreciation_pct")

        if median_value:
            print(f"[PriceAgent] Census median home value: ${median_value:,} "
                  f"(appreciation {annual_apprec:+.1f}%/yr)"
                  if annual_apprec else
                  f"[PriceAgent] Census median home value: ${median_value:,}")

        # ── 2. Zillow CSV data (enrichment) ──────────────────────────────────
        csv_price = get_median_price(zip_code)
        if csv_price and csv_price > 0:
            print(f"[PriceAgent] Zillow CSV median: ${csv_price:,.0f}")
            median_value = csv_price if not median_value else (
                0.4 * median_value + 0.6 * csv_price
            )

        if not median_value:
            print(f"[PriceAgent] No price data available for {zip_code} -- using neutral 50.0")
            return {**state, "price_score": 50.0}

        # ── 3. Compute score ──────────────────────────────────────────────────
        a_score = _apprec_score(annual_apprec) if annual_apprec is not None else 50.0
        f_score = _affordability_score(median_value)
        score   = round(0.60 * a_score + 0.40 * f_score, 1)

        print(f"[PriceAgent] median=${median_value:,.0f}  "
              f"apprec={annual_apprec if annual_apprec else 'N/A'}%/yr  "
              f"apprec_score={a_score:.1f}  afford_score={f_score:.1f}  "
              f"FINAL={score:.1f}")

        return {**state, "price_score": score}

    except Exception as exc:
        log.error("[PriceAgent] Unexpected error: %s", exc, exc_info=True)
        return {**state, "price_score": 50.0}
