"""OpenWeatherMap -- current weather, 5-day forecast, AQI, AQI history."""
from __future__ import annotations
import logging
from collections import Counter
from datetime import datetime, timedelta
from typing import Any

import requests

from . import cache

log = logging.getLogger(__name__)
OWM = "https://api.openweathermap.org/data/2.5"

# OWM 1-5 AQI index -> approximate EPA 0-500
_OWM_TO_EPA = {1: 25, 2: 75, 3: 125, 4: 175, 5: 250}

# OWM main condition -> friendly label
_COND_MAP = {
    "Clear":        "Clear",
    "Clouds":       "Cloudy",
    "Rain":         "Rain",
    "Drizzle":      "Light Rain",
    "Snow":         "Snow",
    "Thunderstorm": "Thunderstorm",
    "Mist":         "Fog",
    "Fog":          "Fog",
    "Haze":         "Haze",
    "Smoke":        "Smoke",
    "Dust":         "Windy",
    "Sand":         "Windy",
    "Ash":          "Overcast",
    "Squall":       "Windy",
    "Tornado":      "Thunderstorm",
}


def get_weather_by_coords(lat: float, lon: float, api_key: str) -> dict[str, Any] | None:
    """
    Same as get_full_weather but uses lat/lon directly (more accurate when
    property coordinates are already known from Zillow data).
    """
    ck = f"owm_coords:{lat:.3f}:{lon:.3f}"
    cached = cache.get(ck)
    if cached is not None:
        return cached

    try:
        # 1 -- current weather by lat/lon
        cw = requests.get(f"{OWM}/weather", params={
            "lat": lat, "lon": lon, "appid": api_key, "units": "imperial",
        }, timeout=6)
        cw.raise_for_status()
        cwd = cw.json()

        cond_main  = cwd["weather"][0]["main"]
        cond_label = _COND_MAP.get(cond_main, cond_main)
        owm_icon   = cwd["weather"][0]["icon"]

        current = {
            "zip_code":       "",
            "city":           cwd.get("name", ""),
            "state":          cwd.get("sys", {}).get("country", "US"),
            "lat":            lat,
            "lon":            lon,
            "temp_f":         round(cwd["main"]["temp"]),
            "feels_like_f":   round(cwd["main"]["feels_like"]),
            "temp_min_f":     round(cwd["main"]["temp_min"]),
            "temp_max_f":     round(cwd["main"]["temp_max"]),
            "humidity_pct":   cwd["main"]["humidity"],
            "pressure_hpa":   cwd["main"]["pressure"],
            "wind_mph":       round(cwd["wind"]["speed"]),
            "wind_deg":       cwd["wind"].get("deg", 0),
            "visibility_m":   cwd.get("visibility", 10000),
            "condition":      cond_label,
            "condition_raw":  cond_main,
            "icon":           owm_icon,
            "icon_url":       f"https://openweathermap.org/img/wn/{owm_icon}@2x.png",
            "sunrise":        cwd["sys"].get("sunrise"),
            "sunset":         cwd["sys"].get("sunset"),
            "source":         "openweathermap",
        }

        # 2 -- forecast
        fc = requests.get(f"{OWM}/forecast", params={
            "lat": lat, "lon": lon, "appid": api_key, "units": "imperial", "cnt": 40,
        }, timeout=6)
        fc.raise_for_status()
        forecast_7day = _parse_forecast(fc.json())

        # 3 -- air quality
        air_quality = _get_air_quality(lat, lon, api_key) or {}

        result = {
            **current,
            "forecast_7day": forecast_7day,
            "air_quality":   air_quality,
            "annual":        _annual_estimate(""),
        }
        cache.set(ck, result, ttl_seconds=1800)
        return result
    except Exception as exc:
        log.warning("OWM coords weather error for (%s, %s): %s", lat, lon, exc)
        return None


def get_full_weather(zip_code: str, api_key: str) -> dict[str, Any] | None:
    """
    Return a complete weather object matching our schema:
      temp_f, feels_like_f, humidity_pct, wind_mph,
      condition, icon_url, forecast_7day[], annual{},
      air_quality{}, source='openweathermap'
    Returns None on any error (caller falls back to mock).
    """
    ck = f"owm_full:{zip_code}"
    cached = cache.get(ck)
    if cached is not None:
        return cached

    try:
        # 1 -- current weather
        cw = requests.get(f"{OWM}/weather", params={
            "zip": f"{zip_code},us", "appid": api_key, "units": "imperial",
        }, timeout=6)
        cw.raise_for_status()
        cwd = cw.json()
        coord = cwd.get("coord", {})
        lat, lon = coord.get("lat"), coord.get("lon")

        cond_main = cwd["weather"][0]["main"]
        cond_label = _COND_MAP.get(cond_main, cond_main)
        owm_icon = cwd["weather"][0]["icon"]

        current = {
            "zip_code":       zip_code,
            "city":           cwd.get("name", ""),
            "state":          cwd.get("sys", {}).get("country", "US"),
            "lat":            lat,
            "lon":            lon,
            "temp_f":         round(cwd["main"]["temp"]),
            "feels_like_f":   round(cwd["main"]["feels_like"]),
            "temp_min_f":     round(cwd["main"]["temp_min"]),
            "temp_max_f":     round(cwd["main"]["temp_max"]),
            "humidity_pct":   cwd["main"]["humidity"],
            "pressure_hpa":   cwd["main"]["pressure"],
            "wind_mph":       round(cwd["wind"]["speed"]),
            "wind_deg":       cwd["wind"].get("deg", 0),
            "visibility_m":   cwd.get("visibility", 10000),
            "condition":      cond_label,
            "condition_raw":  cond_main,
            "icon":           owm_icon,
            "icon_url":       f"https://openweathermap.org/img/wn/{owm_icon}@2x.png",
            "sunrise":        cwd["sys"].get("sunrise"),
            "sunset":         cwd["sys"].get("sunset"),
            "source":         "openweathermap",
        }

        # 2 -- 5-day / 3-hour forecast -> daily
        fc = requests.get(f"{OWM}/forecast", params={
            "zip": f"{zip_code},us", "appid": api_key, "units": "imperial", "cnt": 40,
        }, timeout=6)
        fc.raise_for_status()
        forecast_7day = _parse_forecast(fc.json())

        # 3 -- air quality (needs lat/lon)
        air_quality = {}
        if lat and lon:
            air_quality = _get_air_quality(lat, lon, api_key) or {}

        result = {
            **current,
            "forecast_7day": forecast_7day,
            "air_quality":   air_quality,
            "annual":        _annual_estimate(zip_code),
        }
        cache.set(ck, result, ttl_seconds=1800)   # 30 min cache
        return result
    except Exception as exc:
        log.warning("OWM full weather error for %s: %s", zip_code, exc)
        return None


def get_aqi_history(lat: float, lon: float, api_key: str, days: int = 30) -> list[dict]:
    """Last N days of daily AQI readings."""
    ck = f"owm_aqi_hist:{lat:.3f}:{lon:.3f}:{days}"
    cached = cache.get(ck)
    if cached is not None:
        return cached

    try:
        end = int(datetime.now().timestamp())
        start = int((datetime.now() - timedelta(days=days)).timestamp())
        resp = requests.get("http://api.openweathermap.org/data/2.5/air_pollution/history", params={
            "lat": lat, "lon": lon, "appid": api_key, "start": start, "end": end,
        }, timeout=8)
        resp.raise_for_status()
        data = resp.json()

        days_map: dict[str, list[int]] = {}
        for item in data.get("list", []):
            d = datetime.fromtimestamp(item["dt"]).strftime("%m-%d")
            aqi = _OWM_TO_EPA.get(item["main"]["aqi"], 50)
            days_map.setdefault(d, []).append(aqi)

        result = [{"day": k, "aqi": round(sum(v) / len(v))} for k, v in sorted(days_map.items())]
        cache.set(ck, result, ttl_seconds=3600)
        return result
    except Exception as exc:
        log.warning("OWM AQI history error: %s", exc)
        return []


# ── Private helpers ───────────────────────────────────────────────────────────

def _get_air_quality(lat: float, lon: float, api_key: str) -> dict | None:
    try:
        resp = requests.get("http://api.openweathermap.org/data/2.5/air_pollution", params={
            "lat": lat, "lon": lon, "appid": api_key,
        }, timeout=5)
        resp.raise_for_status()
        d = resp.json()["list"][0]
        comp = d["components"]
        owm_idx = d["main"]["aqi"]
        epa_aqi = _OWM_TO_EPA.get(owm_idx, 50)

        cat, rec = _aqi_category(epa_aqi)
        return {
            "aqi_value":   epa_aqi,
            "owm_index":   owm_idx,
            "category":    cat,
            "recommendation": rec,
            "pollutants": {
                "pm25":  round(comp.get("pm2_5", 0), 1),
                "pm10":  round(comp.get("pm10", 0), 1),
                "no2":   round(comp.get("no2", 0), 1),
                "ozone": round(comp.get("o3", 0), 1),
                "co":    round(comp.get("co", 0) / 1000, 2),
                "so2":   round(comp.get("so2", 0), 1),
                "nh3":   round(comp.get("nh3", 0), 1),
            },
            "source": "openweathermap",
        }
    except Exception as exc:
        log.warning("OWM air quality error: %s", exc)
        return None


def _parse_forecast(data: dict) -> list[dict]:
    days: dict[str, dict] = {}
    for item in data.get("list", []):
        dt = datetime.fromtimestamp(item["dt"])
        dk = dt.strftime("%Y-%m-%d")
        if dk not in days:
            days[dk] = {
                "day": dt.strftime("%a"), "date": dt.strftime("%b %d"),
                "temps": [], "conditions": [], "icons": [],
            }
        days[dk]["temps"].append(item["main"]["temp"])
        days[dk]["conditions"].append(item["weather"][0]["main"])
        days[dk]["icons"].append(item["weather"][0]["icon"])

    result = []
    for dk, d in list(days.items())[:7]:
        icon = Counter(d["icons"]).most_common(1)[0][0]
        cond = Counter(d["conditions"]).most_common(1)[0][0]
        result.append({
            "day":      d["day"],
            "date":     d["date"],
            "hi":       round(max(d["temps"])),
            "lo":       round(min(d["temps"])),
            "condition": _COND_MAP.get(cond, cond),
            "icon":     icon,
            "icon_url": f"https://openweathermap.org/img/wn/{icon}@2x.png",
        })
    return result


def _aqi_category(aqi: int) -> tuple[str, str]:
    cats = [
        (50,  "Good",                        "Air quality is satisfactory and poses little or no risk."),
        (100, "Moderate",                    "Air quality is acceptable. Unusually sensitive people should consider limiting outdoor exertion."),
        (150, "Unhealthy for Sensitive Groups", "Sensitive groups may experience health effects. The general public is less likely to be affected."),
        (200, "Unhealthy",                   "Everyone may begin to experience health effects. Sensitive groups may experience more serious effects."),
        (300, "Very Unhealthy",              "Health alert: everyone may experience more serious health effects."),
    ]
    for ceiling, label, rec in cats:
        if aqi <= ceiling:
            return label, rec
    return "Hazardous", "Health warning of emergency conditions. Everyone is affected."


def _annual_estimate(zip_code: str) -> dict:
    """Rough annual stats -- filled with real NOAA normals once available."""
    import random
    rng = random.Random(hash(zip_code))
    return {
        "sunny_days": rng.randint(200, 300),
        "rain_in":    round(rng.uniform(10, 55), 1),
        "snow_in":    round(rng.uniform(0, 40), 1),
        "heat_days":  rng.randint(5, 120),
    }
