"""
aqi_agent.py -- Real air quality score (0-100) from AirNow + OpenWeatherMap.

Data source
-----------
services/aqi.py -> AirNow API (primary) + OpenWeatherMap Air Pollution (fallback)

Scoring formula
---------------
  score = max(0, 100 - aqi_value)
  AQI   0–50  -> score 100–50  (Good / Moderate)
  AQI  50–100 -> score 50–0   (Moderate -> Unhealthy for Sensitive)
  AQI 100+    -> score 0       (Unhealthy and above)
"""
from __future__ import annotations

import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from services import aqi as svc_aqi
from state import AgentState

log = logging.getLogger(__name__)


def aqi_agent(state: AgentState) -> AgentState:
    zip_code = state.get("zip_code", "")
    lat      = state.get("lat", 0.0)
    lon      = state.get("lon", 0.0)
    env_keys = state.get("env_keys", {})
    print(f"\n[AQIAgent] Fetching real AQI data for ZIP: {zip_code} "
          f"({lat:.3f}, {lon:.3f})")

    airnow_key = env_keys.get("airnow", "")
    owm_key    = env_keys.get("openweather", "")

    try:
        result = svc_aqi.get_aqi(zip_code, lat, lon, airnow_key, owm_key)

        if not result:
            print(f"[AQIAgent] No AQI data returned -- using neutral 50.0")
            return {**state, "aqi_score": 50.0}

        aqi_value = result.get("aqi_value") or 0
        category  = result.get("category", "Unknown")
        sources   = result.get("sources", [])
        pollutants = result.get("pollutants", {})

        score = max(0.0, min(100.0, 100.0 - float(aqi_value)))

        print(f"[AQIAgent] AQI={aqi_value} ({category})  "
              f"PM2.5={pollutants.get('pm25')} ug/m3  "
              f"O3={pollutants.get('ozone')} ug/m3  "
              f"sources={sources}  score={score:.1f}")

        return {**state, "aqi_score": round(score, 2)}

    except Exception as exc:
        log.error("[AQIAgent] Unexpected error: %s", exc, exc_info=True)
        return {**state, "aqi_score": 50.0}
