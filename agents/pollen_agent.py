"""
pollen_agent.py -- Real pollen / allergen comfort score (0-100).

Data source
-----------
services/pollen.py -> Google Pollen API v1

Scoring formula
---------------
  raw_avg = mean(tree_index, grass_index, weed_index)   # 0-100 Google scale
  score   = max(0, 100 - raw_avg)
  Higher score = lower pollen burden = more comfortable environment.

Google Pollen category -> typical index value
  None / Very Low  ->   0–10
  Low              ->  10–30
  Moderate         ->  30–60
  High             ->  60–80
  Very High        ->  80–100
"""
from __future__ import annotations

import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from services import pollen as svc_pollen
from state import AgentState

log = logging.getLogger(__name__)


def pollen_agent(state: AgentState) -> AgentState:
    zip_code = state.get("zip_code", "")
    lat      = state.get("lat", 0.0)
    lon      = state.get("lon", 0.0)
    env_keys = state.get("env_keys", {})
    print(f"\n[PollenAgent] Fetching real pollen data for ZIP: {zip_code} "
          f"({lat:.3f}, {lon:.3f})")

    google_key = env_keys.get("google", "")

    if not google_key:
        print("[PollenAgent] No Google Maps API key -- using neutral 50.0")
        return {**state, "pollen_score": 50.0}

    if not (lat and lon):
        print("[PollenAgent] No coordinates -- using neutral 50.0")
        return {**state, "pollen_score": 50.0}

    try:
        result = svc_pollen.get_pollen(lat, lon, google_key)

        if not result:
            print(f"[PollenAgent] No pollen data returned -- using neutral 50.0")
            return {**state, "pollen_score": 50.0}

        tree  = result.get("tree")  or 0
        grass = result.get("grass") or 0
        weed  = result.get("weed")  or 0

        raw_avg = (tree + grass + weed) / 3.0
        score   = max(0.0, min(100.0, 100.0 - raw_avg))

        print(f"[PollenAgent] tree={tree} ({result.get('tree_category')})  "
              f"grass={grass} ({result.get('grass_category')})  "
              f"weed={weed} ({result.get('weed_category')})  "
              f"avg={raw_avg:.1f}  score={score:.1f}  "
              f"source={result.get('source')}")

        return {**state, "pollen_score": round(score, 2)}

    except Exception as exc:
        log.error("[PollenAgent] Unexpected error: %s", exc, exc_info=True)
        return {**state, "pollen_score": 50.0}
