"""AQI data: EPA AirNow (by ZIP) + OpenWeatherMap (by lat/lon), merged."""
from __future__ import annotations
import logging
from typing import Any

import requests

from . import cache

log = logging.getLogger(__name__)

AIRNOW_BASE = "https://www.airnowapi.org/aq/observation/zipCode/current/"


def get_aqi(zip_code: str, lat: float, lon: float, airnow_key: str = "", owm_key: str = "") -> dict[str, Any]:
    """
    Return merged AQI data with both EPA official values and OWM pollutant breakdown.
    Falls back gracefully if either API is unavailable.
    """
    ck = f"aqi:{zip_code}"
    cached = cache.get(ck)
    if cached is not None:
        return cached

    airnow_data = _fetch_airnow(zip_code, airnow_key) if airnow_key else None
    owm_data = _fetch_owm_aqi(lat, lon, owm_key) if owm_key and lat and lon else None

    result = _merge(airnow_data, owm_data, zip_code)
    cache.set(ck, result, ttl_seconds=3600)
    return result


def _fetch_airnow(zip_code: str, api_key: str) -> dict | None:
    try:
        resp = requests.get(AIRNOW_BASE, params={
            "format": "application/json",
            "zipCode": zip_code,
            "distance": 25,
            "API_KEY": api_key,
        }, timeout=6)
        resp.raise_for_status()
        observations = resp.json()
        if not observations:
            return None

        # Pick the worst (highest AQI) reading
        best = max(observations, key=lambda o: o.get("AQI", 0))
        return {
            "aqi_value":      int(best.get("AQI", 0)),
            "category":       best.get("Category", {}).get("Name", ""),
            "pollutant":      best.get("ParameterName", ""),
            "reporting_area": best.get("ReportingArea", ""),
            "date_observed":  best.get("DateObserved", ""),
            "source":         "airnow",
        }
    except Exception as exc:
        log.warning("AirNow error for %s: %s", zip_code, exc)
        return None


def _fetch_owm_aqi(lat: float, lon: float, api_key: str) -> dict | None:
    try:
        resp = requests.get("http://api.openweathermap.org/data/2.5/air_pollution", params={
            "lat": lat, "lon": lon, "appid": api_key,
        }, timeout=6)
        resp.raise_for_status()
        item = resp.json()["list"][0]
        comp = item["components"]
        owm_idx = item["main"]["aqi"]
        epa_aqi = {1: 25, 2: 75, 3: 125, 4: 175, 5: 250}.get(owm_idx, 50)
        return {
            "aqi_value": epa_aqi,
            "owm_index": owm_idx,
            "pollutants": {
                "pm25":  round(comp.get("pm2_5", 0), 1),
                "pm10":  round(comp.get("pm10", 0), 1),
                "no2":   round(comp.get("no2", 0), 1),
                "ozone": round(comp.get("o3", 0), 1),
                "co":    round(comp.get("co", 0) / 1000, 2),
                "so2":   round(comp.get("so2", 0), 1),
            },
            "source": "openweathermap",
        }
    except Exception as exc:
        log.warning("OWM AQI error: %s", exc)
        return None


def _merge(airnow: dict | None, owm: dict | None, zip_code: str) -> dict[str, Any]:
    """
    Strategy:
    - Use AirNow's official AQI number + category (most authoritative)
    - Use OWM's pollutant breakdown (more granular)
    - Fall back gracefully
    """
    cats = [
        (50,  "Good",                           "Air quality is satisfactory and poses little or no risk."),
        (100, "Moderate",                        "Air quality is acceptable. Some pollutants may affect very sensitive groups."),
        (150, "Unhealthy for Sensitive Groups",  "Members of sensitive groups may experience health effects."),
        (200, "Unhealthy",                       "Everyone may begin to experience health effects."),
        (300, "Very Unhealthy",                  "Health alert: everyone may experience more serious health effects."),
    ]

    def category_for(aqi_val: int):
        for ceiling, label, rec in cats:
            if aqi_val <= ceiling:
                return label, rec
        return "Hazardous", "Health warning of emergency conditions. Everyone is affected."

    # Official AQI from AirNow preferred; OWM EPA-mapped as fallback
    aqi_value = (airnow or {}).get("aqi_value") or (owm or {}).get("aqi_value") or 50
    cat_label, rec = category_for(aqi_value)

    # Pollutants from OWM preferred (more complete)
    pollutants = (owm or {}).get("pollutants") or {}

    sources = []
    if airnow:
        sources.append("airnow")
    if owm:
        sources.append("openweathermap")

    return {
        "aqi_value":          int(aqi_value),
        "category":           (airnow or {}).get("category") or cat_label,
        "health_recommendation": rec,
        "pollutant_primary":  (airnow or {}).get("pollutant", "PM2.5"),
        "reporting_area":     (airnow or {}).get("reporting_area", zip_code),
        "pollutants":         pollutants,
        "national_avg":       65,
        "sources":            sources or ["mock"],
        "trend":              [],   # populated separately by caller via OWM history
    }
