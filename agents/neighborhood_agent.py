"""
neighborhood_agent.py -- Real neighbourhood quality score (0-100).

Data sources
------------
1. Census ACS 5-year: poverty_rate, median_income, population
2. Google Places API: walk score (computed from amenity density)
3. BLS Local Area Unemployment Statistics: local unemployment rate

Scoring formula
---------------
  poverty_score     = max(0, 100 - poverty_rate * 3.33)   # 0% -> 100, 30% -> 0
  income_score      = bracket(median_income / national_median)
  walk_score        = Google Places computed (0-100) or 50 neutral
  employment_score  = max(0, 100 - local_unemployment * 10)  # 0% -> 100, 10%+ -> 0

  neighborhood_score = (
      0.35 * poverty_score
    + 0.25 * income_score
    + 0.25 * walk_score
    + 0.15 * employment_score
  )
"""
from __future__ import annotations

import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from services import census as svc_census
from services import places as svc_places
from services import bls    as svc_bls
from state import AgentState

log = logging.getLogger(__name__)

# National median household income (ACS 2022)
NATIONAL_MEDIAN_INCOME = 74_580

# Sub-score weights
_W_POVERTY    = 0.35
_W_INCOME     = 0.25
_W_WALK       = 0.25
_W_EMPLOYMENT = 0.15


def _income_score(median_income: float) -> float:
    """Bracket income relative to national median. Higher income -> higher score."""
    ratio = median_income / NATIONAL_MEDIAN_INCOME
    if ratio >= 2.0:  return 95.0
    if ratio >= 1.5:  return 85.0
    if ratio >= 1.2:  return 75.0
    if ratio >= 0.9:  return 60.0
    if ratio >= 0.7:  return 45.0
    if ratio >= 0.5:  return 30.0
    return 15.0


def _poverty_score(poverty_rate: float) -> float:
    """0% poverty -> 100; 30%+ -> 0."""
    return max(0.0, min(100.0, 100.0 - poverty_rate * 3.33))


def _employment_score(unemployment_rate: float) -> float:
    """0% unemployment -> 100; 10%+ -> 0."""
    return max(0.0, min(100.0, 100.0 - unemployment_rate * 10.0))


def neighborhood_agent(state: AgentState) -> AgentState:
    zip_code = state.get("zip_code", "")
    lat      = state.get("lat", 0.0)
    lon      = state.get("lon", 0.0)
    env_keys = state.get("env_keys", {})
    print(f"\n[NeighborhoodAgent] Fetching real neighbourhood data for ZIP: {zip_code}")

    try:
        # ── 1. Census ACS: poverty rate + median income ───────────────────────
        census        = svc_census.get_acs_data(zip_code)
        poverty_rate  = census.get("poverty_rate") or 0.0
        median_income = census.get("median_income") or 0.0
        population    = census.get("population") or 0

        if poverty_rate or median_income:
            print(f"[NeighborhoodAgent] Census: poverty={poverty_rate:.1f}%  "
                  f"income=${median_income:,.0f}  pop={population:,}")

        p_score = _poverty_score(poverty_rate) if poverty_rate else 50.0
        i_score = _income_score(median_income) if median_income else 50.0

        # ── 2. Google Places -> computed walk score ────────────────────────────
        google_key = env_keys.get("google", "")
        walk_score = 50.0   # neutral default
        walk_src   = "neutral"

        if google_key and lat and lon:
            try:
                places = svc_places.get_nearby_places(lat, lon, google_key, radius_m=1500)
                if places:
                    ws = (places.get("walk_scores") or
                          svc_places.compute_walk_score(places.get("places", {})))
                    if ws:
                        walk_score = float(ws.get("walk_score", 50))
                        walk_src   = ws.get("source", "google_places")
                        print(f"[NeighborhoodAgent] Walk score={walk_score:.0f} "
                              f"(source={walk_src})")
            except Exception as exc:
                log.warning("[NeighborhoodAgent] Places API failed: %s", exc)

        # ── 3. BLS local unemployment ─────────────────────────────────────────
        bls_key = env_keys.get("bls_key", "").strip().rstrip(".")
        emp_score = 65.0   # neutral ~3.5% unemployment
        emp_src   = "neutral"

        if bls_key:
            try:
                emp = svc_bls.get_employment(zip_code, bls_key)
                if emp:
                    local_rate = emp.get("current_rate") or 0
                    if local_rate > 0:
                        emp_score = _employment_score(local_rate)
                        emp_src   = "bls"
                        print(f"[NeighborhoodAgent] BLS unemployment={local_rate}%  "
                              f"emp_score={emp_score:.1f}")
            except Exception as exc:
                log.warning("[NeighborhoodAgent] BLS lookup failed: %s", exc)

        # ── 4. Composite score ────────────────────────────────────────────────
        score = (
            _W_POVERTY    * p_score
            + _W_INCOME   * i_score
            + _W_WALK     * walk_score
            + _W_EMPLOYMENT * emp_score
        )
        score = max(0.0, min(100.0, score))

        print(f"[NeighborhoodAgent] poverty={p_score:.1f}  income={i_score:.1f}  "
              f"walk={walk_score:.1f}({walk_src})  employment={emp_score:.1f}({emp_src})  "
              f"-> score={score:.1f}")

        return {**state, "neighborhood_score": round(score, 2)}

    except Exception as exc:
        log.error("[NeighborhoodAgent] Unexpected error: %s", exc, exc_info=True)
        return {**state, "neighborhood_score": 50.0}
