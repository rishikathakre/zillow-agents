"""
forecast_agent.py -- Real 12-month price appreciation forecast (0-100).

Data sources
------------
1. Census ACS 2019 vs 2022 median home values -> historical 3-yr appreciation rate
2. BLS unemployment trend -> economic momentum signal
3. Linear extrapolation of historical rate with economic adjustment

Scoring formula
---------------
  base_annual_rate = Census 3-yr CAGR (or state/national fallback)
  econ_adj = if local unemployment < national: +1%, if higher: -1%
  projected_12mo_growth = base_annual_rate + econ_adj
  score = clamp((projected_12mo_growth - (-5%)) / 20% * 100, 0, 100)
"""
from __future__ import annotations

import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from services import census as svc_census
from services import bls as svc_bls
from state import AgentState

log = logging.getLogger(__name__)

# National long-run average home price appreciation ~4%/yr
NATIONAL_ANNUAL_RATE = 4.0

_MIN_PCT = -5.0   # -> score 0
_MAX_PCT = 15.0   # -> score 100


def _pct_to_score(pct: float) -> float:
    return max(0.0, min(100.0, (pct - _MIN_PCT) / (_MAX_PCT - _MIN_PCT) * 100))


def forecast_agent(state: AgentState) -> AgentState:
    zip_code = state.get("zip_code", "")
    env_keys = state.get("env_keys", {})
    print(f"\n[ForecastAgent] Forecasting price appreciation for ZIP: {zip_code}")

    try:
        # ── 1. Census ACS appreciation trend ─────────────────────────────────
        census = svc_census.get_acs_data(zip_code)
        annual_rate = census.get("annual_appreciation_pct")

        if annual_rate is not None:
            mhv_2019 = census.get("median_home_value_2019")
            mhv_now  = census.get("median_home_value")
            print(f"[ForecastAgent] Census historical rate: {annual_rate:+.2f}%/yr "
                  f"(${mhv_2019:,} -> ${mhv_now:,})")
        else:
            # Fall back to national long-run average
            annual_rate = NATIONAL_ANNUAL_RATE
            print(f"[ForecastAgent] No local trend data -- using national avg {annual_rate}%/yr")

        # ── 2. BLS employment adjustment ──────────────────────────────────────
        bls_key = env_keys.get("bls_key", "").strip().rstrip(".")
        econ_adj = 0.0
        if bls_key:
            try:
                emp = svc_bls.get_employment(zip_code, bls_key)
                if emp:
                    local_rate    = emp.get("current_rate", 0) or 0
                    national_rate = emp.get("national_rate", 0) or 0
                    if local_rate > 0 and national_rate > 0:
                        # Lower unemployment -> positive economic momentum
                        if local_rate < national_rate - 0.5:
                            econ_adj = +1.5
                        elif local_rate > national_rate + 0.5:
                            econ_adj = -1.5
                        print(f"[ForecastAgent] BLS: local={local_rate}% "
                              f"national={national_rate}% -> adj={econ_adj:+.1f}%")
            except Exception as exc:
                log.warning("[ForecastAgent] BLS lookup failed: %s", exc)

        # ── 3. Project 12-month forward ───────────────────────────────────────
        projected = annual_rate + econ_adj
        # Smooth extreme historical values: revert toward mean for forecasting
        projected = projected * 0.70 + NATIONAL_ANNUAL_RATE * 0.30

        score = _pct_to_score(projected)

        print(f"[ForecastAgent] hist_rate={annual_rate:+.1f}%  "
              f"econ_adj={econ_adj:+.1f}%  "
              f"projected_12mo={projected:+.2f}%  score={score:.1f}")

        return {**state, "forecast_score": round(score, 2)}

    except Exception as exc:
        log.error("[ForecastAgent] Unexpected error: %s", exc, exc_info=True)
        return {**state, "forecast_score": 50.0}
