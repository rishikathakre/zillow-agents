"""US Census Bureau ACS 5-year API + ZIP geocoding utilities.

Variables fetched
-----------------
B25077_001E  Median home value (owner-occupied units)
B25064_001E  Median gross rent
B19013_001E  Median household income
B01003_001E  Total population
B17001_002E  Population below poverty level
B17001_001E  Total population for poverty determination
NAME         Human-readable geography label

Appreciation is computed by comparing 2022 vs 2019 ACS median home values,
giving a 3-year real change that is annualised to a per-year figure.
"""
from __future__ import annotations

import logging
from typing import Any

import requests

from . import cache

log = logging.getLogger(__name__)

ACS_VARS = "B25077_001E,B25064_001E,B19013_001E,B01003_001E,B17001_002E,B17001_001E,NAME"
NATIONAL_MEDIAN_VALUE = 305_000   # ACS 2022 US median owner-occupied home value
NATIONAL_MEDIAN_RENT  =   1_340   # ACS 2022 US median gross rent


# ── ACS data ──────────────────────────────────────────────────────────────────

def get_acs_data(zip_code: str) -> dict[str, Any]:
    """Return Census ACS 5-year data for a ZIP code (ZCTA).

    Tries 2022 -> 2021 -> 2019 in order and also fetches the 2019 value for
    the same ZIP to compute a 3-year price appreciation rate.

    Returns a dict with keys:
      median_home_value, median_rent, median_income, population,
      poverty_rate, annual_appreciation_pct, appreciation_3yr_pct,
      median_home_value_2019, name, year, source
    """
    ck = f"census_acs:{zip_code}"
    cached = cache.get(ck)
    if cached is not None:
        log.info("Census ACS cache hit for %s", zip_code)
        return cached

    result: dict[str, Any] = {}

    # ── Step 1: fetch the most recent ACS year ─────────────────────────────────
    for year in ("2022", "2021", "2019"):
        try:
            url = f"https://api.census.gov/data/{year}/acs/acs5"
            resp = requests.get(url, params={
                "get": ACS_VARS,
                "for": f"zip code tabulation area:{zip_code}",
            }, timeout=12)
            resp.raise_for_status()
            data = resp.json()
            if len(data) < 2:
                log.debug("Census ACS %s: empty result for %s", year, zip_code)
                continue

            headers = data[0]
            values  = data[1]
            row     = dict(zip(headers, values))

            def _int(key: str) -> int | None:
                v = row.get(key)
                if v is None or str(v) in ("-666666666", "-888888888", "null", ""):
                    return None
                try:
                    return int(float(v))
                except (ValueError, TypeError):
                    return None

            mhv          = _int("B25077_001E")
            rent         = _int("B25064_001E")
            income       = _int("B19013_001E")
            pop          = _int("B01003_001E")
            pov_below    = _int("B17001_002E")
            pov_total    = _int("B17001_001E")
            poverty_rate = (
                round(pov_below / pov_total * 100, 1)
                if pov_below and pov_total else None
            )

            result = {
                "median_home_value": mhv,
                "median_rent":       rent,
                "median_income":     income,
                "population":        pop,
                "poverty_rate":      poverty_rate,
                "name":              row.get("NAME", ""),
                "year":              year,
                "source":            "census_acs",
            }
            log.info("Census ACS %s for %s: home=$%s rent=$%s income=$%s",
                     year, zip_code, mhv, rent, income)

            if mhv:
                break  # good enough data found

        except Exception as exc:
            log.warning("Census ACS %s failed for %s: %s", year, zip_code, exc)
            continue

    # ── Step 2: fetch 2019 value to compute appreciation ──────────────────────
    current_mhv = result.get("median_home_value")
    current_year = int(result.get("year", "2022"))

    if current_mhv and current_year > 2019:
        try:
            resp2019 = requests.get(
                "https://api.census.gov/data/2019/acs/acs5",
                params={
                    "get": "B25077_001E",
                    "for": f"zip code tabulation area:{zip_code}",
                },
                timeout=10,
            )
            d2019 = resp2019.json()
            if len(d2019) >= 2:
                v2019 = d2019[1][0]
                if v2019 and str(v2019) not in ("-666666666", "null", ""):
                    home_2019 = int(float(v2019))
                    years_elapsed = current_year - 2019
                    apprec_total = (current_mhv - home_2019) / home_2019 * 100
                    apprec_annual = apprec_total / years_elapsed

                    result["median_home_value_2019"] = home_2019
                    result["appreciation_3yr_pct"]   = round(apprec_total, 2)
                    result["annual_appreciation_pct"] = round(apprec_annual, 2)
                    log.info("Census appreciation for %s: %+.1f%%/yr (2019->%s)",
                             zip_code, apprec_annual, current_year)
        except Exception as exc:
            log.warning("Census 2019 comparison failed for %s: %s", zip_code, exc)

    if result:
        cache.set(ck, result, ttl_seconds=86_400 * 7)   # 7 days
    else:
        log.warning("Census ACS: no data found for ZIP %s", zip_code)

    return result


# ── Geocoding ─────────────────────────────────────────────────────────────────

def geocode_zip(zip_code: str, owm_key: str = "") -> tuple[float, float]:
    """Return (lat, lon) for a US ZIP code.

    Priority order:
      1. SQLite cache
      2. OpenWeatherMap ZIP geocoder (fast, accurate, uses our existing key)
      3. Census Geocoder (free, no key)
      4. Nominatim / OpenStreetMap (free, no key)
    Returns (0.0, 0.0) on complete failure.
    """
    ck = f"geocode_zip:{zip_code}"
    cached = cache.get(ck)
    if cached:
        return cached["lat"], cached["lon"]

    lat, lon = 0.0, 0.0

    # 1. OpenWeatherMap
    if owm_key:
        try:
            resp = requests.get(
                "https://api.openweathermap.org/geo/1.0/zip",
                params={"zip": f"{zip_code},US", "appid": owm_key},
                timeout=5,
            )
            if resp.status_code == 200:
                d = resp.json()
                lat = float(d.get("lat", 0))
                lon = float(d.get("lon", 0))
                log.info("OWM geocoder: %s -> %.4f, %.4f", zip_code, lat, lon)
        except Exception as exc:
            log.warning("OWM geocoder failed for %s: %s", zip_code, exc)

    # 2. Census Geocoder
    if not (lat and lon):
        try:
            resp = requests.get(
                "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress",
                params={
                    "address": f"{zip_code}",
                    "benchmark": "2020",
                    "format": "json",
                },
                timeout=8,
            )
            matches = resp.json().get("result", {}).get("addressMatches", [])
            if matches:
                coords = matches[0]["coordinates"]
                lat = float(coords["y"])
                lon = float(coords["x"])
                log.info("Census geocoder: %s -> %.4f, %.4f", zip_code, lat, lon)
        except Exception as exc:
            log.warning("Census geocoder failed for %s: %s", zip_code, exc)

    # 3. Nominatim (OpenStreetMap) -- rate-limit-friendly one-shot
    if not (lat and lon):
        try:
            resp = requests.get(
                "https://nominatim.openstreetmap.org/search",
                params={"postalcode": zip_code, "country": "US",
                        "format": "json", "limit": 1},
                headers={"User-Agent": "PropIQ/2.1 (propiq@example.com)"},
                timeout=8,
            )
            results = resp.json()
            if results:
                lat = float(results[0]["lat"])
                lon = float(results[0]["lon"])
                log.info("Nominatim geocoder: %s -> %.4f, %.4f", zip_code, lat, lon)
        except Exception as exc:
            log.warning("Nominatim geocoder failed for %s: %s", zip_code, exc)

    if lat and lon:
        cache.set(ck, {"lat": lat, "lon": lon}, ttl_seconds=86_400 * 30)

    return lat, lon


# ── ZIP location (city + state + coords) ─────────────────────────────────────

# ZIP 3-digit prefix -> state abbreviation (USPS SCF allocation, covers all 50 states)
def _zip3_to_state(zip_code: str) -> str:
    """Return 2-letter state code from first 3 digits of ZIP. O(1), no API needed."""
    try:
        p = int(zip_code[:3])
    except (ValueError, TypeError):
        return ""
    # Ranges from USPS Sectional Center Facility allocation
    if   0 < p < 5:   return "MA"   # 001-004 (Adjuntas/New England)
    if   5 <= p <= 9:  return "PR"   # Puerto Rico / VI
    if  10 <= p <= 27: return "MA"
    if  28 <= p <= 29: return "RI"
    if  30 <= p <= 38: return "NH"
    if  39 <= p <= 49: return "ME"
    if  50 <= p <= 59: return "VT"
    if  60 <= p <= 69: return "CT"
    if  70 <= p <= 89: return "NJ"
    if  90 <= p <= 98: return "AE"   # Armed Forces Europe
    if 100 <= p <= 149: return "NY"
    if 150 <= p <= 196: return "PA"
    if 197 <= p <= 199: return "DE"
    if 200 <= p <= 205: return "DC"
    if 206 <= p <= 219: return "MD"
    if 220 <= p <= 246: return "VA"
    if 247 <= p <= 268: return "WV"
    if 269 <= p <= 289: return "NC"
    if 290 <= p <= 299: return "SC"
    if 300 <= p <= 319: return "GA"
    if 320 <= p <= 349: return "FL"
    if 350 <= p <= 352: return "AL"
    if 354 <= p <= 369: return "AL"
    if 370 <= p <= 374: return "TN"
    if 375 == p:        return "TN"   # Memphis area (375xx)
    if 376 <= p <= 385: return "TN"
    if 386 <= p <= 397: return "MS"
    if 398 <= p <= 399: return "GA"
    if 400 <= p <= 418: return "KY"
    if 420 <= p <= 427: return "KY"
    if 430 <= p <= 458: return "OH"
    if 460 <= p <= 479: return "IN"
    if 480 <= p <= 499: return "MI"
    if 500 <= p <= 528: return "IA"
    if 530 <= p <= 549: return "WI"
    if 550 <= p <= 567: return "MN"
    if 570 <= p <= 577: return "SD"
    if 580 <= p <= 588: return "ND"
    if 590 <= p <= 599: return "MT"
    if 600 <= p <= 627: return "IL"
    if 628 <= p <= 629: return "IL"
    if 630 <= p <= 658: return "MO"
    if 660 <= p <= 679: return "KS"
    if 680 <= p <= 693: return "NE"
    if 700 <= p <= 714: return "LA"
    if 716 <= p <= 729: return "AR"
    if 730 <= p <= 731: return "OK"
    if 733 <= p <= 749: return "OK"
    if 750 <= p <= 799: return "TX"
    if 800 <= p <= 816: return "CO"
    if 820 <= p <= 831: return "WY"
    if 832 <= p <= 838: return "ID"
    if 840 <= p <= 847: return "UT"
    if 850 <= p <= 865: return "AZ"
    if 870 <= p <= 884: return "NM"
    if 885 <= p <= 885: return "TX"
    if 889 <= p <= 891: return "NV"
    if 893 <= p <= 898: return "NV"
    if 900 <= p <= 961: return "CA"
    if 967 <= p <= 968: return "HI"
    if 970 <= p <= 979: return "OR"
    if 980 <= p <= 994: return "WA"
    if 995 <= p <= 999: return "AK"
    return ""


_STATE_NAME_TO_ABBR: dict[str, str] = {
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


def get_zip_location(zip_code: str, owm_key: str = "") -> dict[str, Any]:
    """Return city, state, lat, lon for a US ZIP code.

    Priority:
      1. OWM ZIP geocoder    -- gives city + lat/lon fast (with API key)
      2. Nominatim (OSM)     -- gives city + state without any API key
    Result is cached 30 days.

    Returns dict with keys: city, state, lat, lon
    """
    ck = f"zip_location:{zip_code}"
    cached = cache.get(ck)
    if cached is not None:
        return cached

    city, state, lat, lon = "", "", 0.0, 0.0

    # 1. OWM: city name + coordinates in one call (fast, requires API key)
    if owm_key:
        try:
            resp = requests.get(
                "https://api.openweathermap.org/geo/1.0/zip",
                params={"zip": f"{zip_code},US", "appid": owm_key},
                timeout=5,
            )
            if resp.status_code == 200:
                d    = resp.json()
                city = d.get("name", "")
                lat  = float(d.get("lat", 0))
                lon  = float(d.get("lon", 0))
                log.info("OWM zip location: %s -> %s (%.4f, %.4f)", zip_code, city, lat, lon)
        except Exception as exc:
            log.warning("OWM zip location failed for %s: %s", zip_code, exc)

    # 2. Nominatim -- always call for state (OWM doesn't return state)
    #    Also fills city + lat/lon if OWM missed them.
    try:
        resp = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={"postalcode": zip_code, "country": "US",
                    "format": "json", "limit": 1, "addressdetails": 1},
            headers={"User-Agent": "PropIQ/2.1 (propiq@example.com)"},
            timeout=8,
        )
        results = resp.json()
        if results:
            addr = results[0].get("address", {})
            if not city:
                city = (addr.get("city") or addr.get("town") or
                        addr.get("village") or addr.get("hamlet") or "")
            # State: prefer "state_code" (short form like "MD"), then map full name
            st_code = addr.get("state_code", "")
            if st_code:
                state = st_code.split("-")[-1]   # "US-MD" -> "MD" or "MD" -> "MD"
            if not state:
                state = _STATE_NAME_TO_ABBR.get(addr.get("state", ""), "")
            if not (lat and lon):
                lat = float(results[0].get("lat", 0))
                lon = float(results[0].get("lon", 0))
            log.info("Nominatim zip: %s -> %s, %s (%.4f, %.4f)", zip_code, city, state, lat, lon)
    except Exception as exc:
        log.warning("Nominatim zip location failed for %s: %s", zip_code, exc)

    # Final fallback: derive state from ZIP prefix (pure Python, always works)
    if not state:
        state = _zip3_to_state(zip_code)
        if state:
            log.info("ZIP3 state fallback: %s -> %s", zip_code, state)

    result = {"city": city, "state": state, "lat": lat, "lon": lon}
    if city or lat:
        cache.set(ck, result, ttl_seconds=86_400 * 30)
    return result
