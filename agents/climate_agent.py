"""
climate_agent.py -- Real climate & flood risk score (0-100).

Data sources
------------
1. FEMA NFHL (free, no key) -> flood zone classification
2. State-level wildfire hazard index (USFS-derived heuristics)
3. State-level heat burden index (NOAA NCEI-derived heuristics)

Scoring formula
---------------
  flood_score    = FLOOD_ZONE_SCORES[fema_zone]        (X->90, AE/A->20, VE/V->5)
  wildfire_score = 100 - STATE_WILDFIRE[state]
  heat_score     = 100 - STATE_HEAT[state]
  insurance_score = 100 if insurance == "Optional" else 55 if "Recommended" else 20

  climate_risk_score = (
      0.40 * flood_score
    + 0.25 * insurance_score
    + 0.20 * wildfire_score
    + 0.15 * heat_score
  )

Higher score = lower climate/disaster risk = better for long-term investment.
"""
from __future__ import annotations

import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from services import fema as svc_fema
from services import census as svc_census
from state import AgentState

log = logging.getLogger(__name__)

# ── FEMA flood zone -> base flood score (0-100, higher = safer) ───────────────
FLOOD_ZONE_SCORES: dict[str, float] = {
    "X":   90.0,   # Minimal / no risk
    "C":   85.0,   # Minimal risk
    "B":   70.0,   # Moderate risk
    "D":   60.0,   # Undetermined
    "AR":  30.0,   # Reduced risk (levee in progress)
    "A99": 30.0,   # Protected by levee
    "A":   20.0,   # High risk -- 1% annual chance
    "AE":  20.0,
    "AH":  20.0,
    "AO":  20.0,
    "V":    5.0,   # Very high -- coastal velocity
    "VE":   5.0,
}

# ── State wildfire hazard (0-100 index; higher = more wildfire risk) ──────────
STATE_WILDFIRE: dict[str, float] = {
    "CA": 80, "OR": 65, "WA": 55, "CO": 60, "AZ": 65, "NV": 58,
    "NM": 60, "MT": 62, "ID": 55, "WY": 50, "UT": 55, "TX": 40,
    "FL": 35, "GA": 30, "SC": 28, "NC": 26, "VA": 22, "TN": 22,
    "AL": 25, "MS": 25, "LA": 20, "OK": 38, "AR": 28, "MO": 18,
    "KY": 20, "WV": 22, "MD": 15, "DE": 12, "NJ": 15, "CT": 12,
    "RI": 10, "MA": 12, "NH": 15, "VT": 13, "ME": 18, "NY": 10,
    "PA": 15, "OH": 10, "IN": 10, "IL": 10, "MI": 12, "WI": 14,
    "MN": 16, "IA": 10, "ND": 15, "SD": 20, "NE": 18, "KS": 22,
}
DEFAULT_WILDFIRE = 25.0

# ── State heat burden (0-100 index; higher = more heat stress) ────────────────
STATE_HEAT: dict[str, float] = {
    "AZ": 92, "NV": 82, "TX": 72, "FL": 68, "LA": 66, "MS": 62,
    "AL": 58, "GA": 52, "SC": 48, "AR": 52, "OK": 58, "NM": 60,
    "CA": 40, "TN": 42, "NC": 36, "VA": 32, "MO": 42, "KY": 38,
    "IN": 28, "IL": 27, "OH": 22, "PA": 22, "MD": 28, "NJ": 24,
    "NY": 18, "CT": 15, "MA": 14, "RI": 13, "NH": 12, "VT": 10,
    "ME": 10, "MI": 16, "WI": 14, "MN": 12, "IA": 20, "ND": 15,
    "SD": 22, "NE": 28, "KS": 35, "WY": 25, "MT": 18, "ID": 20,
    "UT": 48, "CO": 32, "WA": 10, "OR": 15, "HI": 30, "AK": 2,
}
DEFAULT_HEAT = 30.0

# ── Sub-score weights ─────────────────────────────────────────────────────────
_W_FLOOD     = 0.40
_W_INSURANCE = 0.25
_W_WILDFIRE  = 0.20
_W_HEAT      = 0.15


def _insurance_score(insurance: str) -> float:
    if insurance == "Optional":   return 100.0
    if insurance == "Recommended": return 55.0
    if insurance == "Required":   return 20.0
    return 55.0


def _extract_state(census_name: str) -> str:
    """Extract 2-letter state abbreviation from Census ACS NAME field.
    E.g. 'ZCTA5 20745; Maryland' -> 'MD'"""
    STATE_ABBR = {
        "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR",
        "California": "CA", "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE",
        "Florida": "FL", "Georgia": "GA", "Hawaii": "HI", "Idaho": "ID",
        "Illinois": "IL", "Indiana": "IN", "Iowa": "IA", "Kansas": "KS",
        "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
        "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS",
        "Missouri": "MO", "Montana": "MT", "Nebraska": "NE", "Nevada": "NV",
        "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
        "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK",
        "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
        "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT",
        "Vermont": "VT", "Virginia": "VA", "Washington": "WA", "West Virginia": "WV",
        "Wisconsin": "WI", "Wyoming": "WY", "District of Columbia": "DC",
    }
    for name, abbr in STATE_ABBR.items():
        if name in census_name:
            return abbr
    return ""


def climate_agent(state: AgentState) -> AgentState:
    zip_code = state.get("zip_code", "")
    lat      = state.get("lat", 0.0)
    lon      = state.get("lon", 0.0)
    print(f"\n[ClimateAgent] Calculating climate risk for ZIP: {zip_code} ({lat:.3f}, {lon:.3f})")

    try:
        # ── 1. FEMA flood zone (free, no key) ─────────────────────────────────
        fema = {}
        if lat and lon:
            fema = svc_fema.get_flood_zone(lat, lon)
        fema_zone  = fema.get("flood_zone", "X")
        fema_risk  = fema.get("risk", "Low")
        insurance  = fema.get("insurance", "Optional")
        fema_src   = fema.get("source", "mock")

        flood_score = FLOOD_ZONE_SCORES.get(fema_zone, FLOOD_ZONE_SCORES.get(fema_zone[:2], 60.0))
        ins_score   = _insurance_score(insurance)

        print(f"[ClimateAgent] FEMA zone={fema_zone} risk={fema_risk} "
              f"insurance={insurance} flood_score={flood_score:.0f} "
              f"source={fema_src}")

        # ── 2. State-based wildfire + heat heuristics ──────────────────────────
        census = svc_census.get_acs_data(zip_code)
        census_name = census.get("name", "")
        st = _extract_state(census_name)

        wildfire_risk = STATE_WILDFIRE.get(st, DEFAULT_WILDFIRE)
        heat_risk     = STATE_HEAT.get(st, DEFAULT_HEAT)
        wildfire_score = max(0.0, 100.0 - wildfire_risk)
        heat_score     = max(0.0, 100.0 - heat_risk)

        print(f"[ClimateAgent] state={st or 'unknown'}  "
              f"wildfire_risk={wildfire_risk:.0f}  heat_risk={heat_risk:.0f}  "
              f"wildfire_score={wildfire_score:.0f}  heat_score={heat_score:.0f}")

        # ── 3. Composite score ─────────────────────────────────────────────────
        composite = (
            _W_FLOOD     * flood_score
            + _W_INSURANCE * ins_score
            + _W_WILDFIRE  * wildfire_score
            + _W_HEAT      * heat_score
        )
        composite = max(0.0, min(100.0, composite))

        print(f"[ClimateAgent] flood={flood_score:.1f}  ins={ins_score:.1f}  "
              f"wildfire={wildfire_score:.1f}  heat={heat_score:.1f}  "
              f"-> score={composite:.1f}")

        return {**state, "climate_risk_score": round(composite, 2)}

    except Exception as exc:
        log.error("[ClimateAgent] Unexpected error: %s", exc, exc_info=True)
        return {**state, "climate_risk_score": 50.0}
