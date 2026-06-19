"""Google Pollen API -- real pollen index by lat/lon."""
from __future__ import annotations
import logging
from typing import Any

import requests

from . import cache

log = logging.getLogger(__name__)
POLLEN_URL = "https://pollen.googleapis.com/v1/forecast:lookup"

# Pollen index 0-5 -> label
INDEX_LABELS = {0: "None", 1: "Very Low", 2: "Low", 3: "Moderate", 4: "High", 5: "Very High"}
INDEX_VALUES = {0: 0, 1: 15, 2: 35, 3: 60, 4: 85, 5: 120}   # approx index 0-120 equiv


def get_pollen(lat: float, lon: float, api_key: str) -> dict[str, Any] | None:
    """
    Returns:
      tree: int (0-120 equiv scale)
      grass: int
      weed: int
      tree_category: str ("None" … "Very High")
      grass_category: str
      weed_category: str
      plant_species: list[str]
      health_recs: list[str]
      daily_forecast: list of 5 days [{date, tree, grass, weed}]
      monthly_tree: list[12]  (estimated seasonal monthly values)
      monthly_grass: list[12]
      monthly_weed: list[12]
      source: "google_pollen"
    """
    ck = f"pollen:{lat:.3f}:{lon:.3f}"
    cached = cache.get(ck)
    if cached is not None:
        return cached

    try:
        resp = requests.get(POLLEN_URL, params={
            "key": api_key,
            "location.longitude": lon,
            "location.latitude": lat,
            "days": 5,
            "languageCode": "en",
        }, timeout=8)
        resp.raise_for_status()
        data = resp.json()

        daily_raw = data.get("dailyInfo", [])
        if not daily_raw:
            return None

        today = daily_raw[0]
        types = {pt["code"]: pt for day in daily_raw for pt in day.get("pollenTypeInfo", [])}

        def _idx(code: str) -> int:
            t = types.get(code, {})
            cat = t.get("indexInfo", {})
            return INDEX_VALUES.get(cat.get("value", 0), 0)

        def _label(code: str) -> str:
            t = types.get(code, {})
            cat = t.get("indexInfo", {})
            return cat.get("category", "None")

        tree_val   = _idx("TREE")
        grass_val  = _idx("GRASS")
        weed_val   = _idx("WEED")

        # Plant species
        species = []
        for pt in today.get("pollenTypeInfo", []):
            for plant in pt.get("plantDescription", {}).get("plants", []):
                if isinstance(plant, dict):
                    species.append(plant.get("displayName", ""))
                elif isinstance(plant, str):
                    species.append(plant)

        # Health recs
        recs = []
        for pt in today.get("pollenTypeInfo", []):
            recs.extend(pt.get("healthRecommendations", []))

        # 5-day forecast
        daily_forecast = []
        for day in daily_raw:
            d = {}
            for pt in day.get("pollenTypeInfo", []):
                code = pt["code"]
                val = INDEX_VALUES.get(pt.get("indexInfo", {}).get("value", 0), 0)
                d[code.lower()] = val
            daily_forecast.append({
                "date": f"{day.get('date', {}).get('month','')}/{day.get('date', {}).get('day','')}",
                "tree":  d.get("tree", 0),
                "grass": d.get("grass", 0),
                "weed":  d.get("weed", 0),
            })

        # Monthly seasonal estimates (Google doesn't give history; extrapolate from index)
        monthly_tree  = _seasonal_monthly(tree_val, peak_month=3)   # Apr peak
        monthly_grass = _seasonal_monthly(grass_val, peak_month=5)  # Jun peak
        monthly_weed  = _seasonal_monthly(weed_val, peak_month=8)   # Sep peak

        result = {
            "tree":          tree_val,
            "grass":         grass_val,
            "weed":          weed_val,
            "tree_category":  _label("TREE"),
            "grass_category": _label("GRASS"),
            "weed_category":  _label("WEED"),
            "plant_species": [s for s in species if s][:10],
            "health_recs":   recs[:3],
            "daily_forecast": daily_forecast,
            "monthly_tree":   monthly_tree,
            "monthly_grass":  monthly_grass,
            "monthly_weed":   monthly_weed,
            "source":        "google_pollen",
        }
        cache.set(ck, result, ttl_seconds=43200)   # 12 h
        return result
    except Exception as exc:
        log.warning("Google Pollen API error: %s", exc)
        return None


def _seasonal_monthly(peak_val: int, peak_month: int) -> list[int]:
    """Generate estimated monthly values (0–120) with a seasonal bell curve."""
    import math
    months = list(range(12))
    result = []
    for m in months:
        dist = min(abs(m - peak_month), 12 - abs(m - peak_month))
        factor = math.exp(-0.5 * (dist / 2.0) ** 2)
        result.append(round(peak_val * factor))
    return result
