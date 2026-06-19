"""Bureau of Labor Statistics (BLS) API v2 -- local area unemployment data."""
from __future__ import annotations
import logging
from typing import Any

import requests

from . import cache

log = logging.getLogger(__name__)
BLS_URL = "https://api.bls.gov/publicAPI/v2/timeseries/data/"

# National seasonally-adjusted unemployment rate
NATIONAL_SERIES = "LNS14000000"

# ZIP 3-prefix -> (series_id, area_label)
# Series format: LAUCN{state_fips_2}{county_fips_3}0000000003
ZIP_TO_BLS: dict[str, tuple[str, str]] = {
    "300": ("LAUCN240330000000003", "Prince George's County, MD"),
    "207": ("LAUCN240330000000003", "Prince George's County, MD"),  # more MD ZIPs
    "208": ("LAUCN240310000000003", "Montgomery County, MD"),
    "100": ("LAUCN360610000000003", "New York County, NY"),
    "101": ("LAUCN360610000000003", "New York County, NY"),
    "102": ("LAUCN360610000000003", "New York County, NY"),
    "110": ("LAUCN360810000000003", "Queens County, NY"),
    "112": ("LAUCN360470000000003", "Kings County (Brooklyn), NY"),
    "113": ("LAUCN360850000000003", "Richmond County (Staten Island), NY"),
    "900": ("LAUCN060370000000003", "Los Angeles County, CA"),
    "901": ("LAUCN060370000000003", "Los Angeles County, CA"),
    "902": ("LAUCN060370000000003", "Los Angeles County, CA"),
    "906": ("LAUCN060370000000003", "Los Angeles County, CA"),
    "940": ("LAUCN060750000000003", "San Francisco County, CA"),
    "941": ("LAUCN060750000000003", "San Francisco County, CA"),
    "945": ("LAUCN060010000000003", "Alameda County, CA"),
    "981": ("LAUCN530330000000003", "King County, WA"),
    "980": ("LAUCN530330000000003", "King County, WA"),
    "802": ("LAUCN080310000000003", "Denver County, CO"),
    "800": ("LAUCN080010000000003", "Adams County, CO"),
    "606": ("LAUCN170310000000003", "Cook County, IL"),
    "604": ("LAUCN170310000000003", "Cook County, IL"),
    "787": ("LAUCN484530000000003", "Travis County, TX"),
    "786": ("LAUCN484530000000003", "Travis County, TX"),
    "770": ("LAUCN482010000000003", "Harris County, TX"),
    "331": ("LAUCN120860000000003", "Miami-Dade County, FL"),
    "332": ("LAUCN120860000000003", "Miami-Dade County, FL"),
    "303": ("LAUCN131210000000003", "Fulton County, GA"),
    "302": ("LAUCN131210000000003", "Fulton County, GA"),
    "852": ("LAUCN040130000000003", "Maricopa County, AZ"),
    "850": ("LAUCN040130000000003", "Maricopa County, AZ"),
    "191": ("LAUCN421010000000003", "Philadelphia County, PA"),
    "282": ("LAUCN371190000000003", "Mecklenburg County, NC"),
    "372": ("LAUCN470370000000003", "Davidson County, TN"),
    "971": ("LAUCN410510000000003", "Multnomah County, OR"),
    "891": ("LAUCN320030000000003", "Clark County, NV"),
}


def get_employment(zip_code: str, bls_key: str) -> dict[str, Any] | None:
    """
    Returns:
      current_rate: float (unemployment %)
      national_rate: float
      area_label: str
      series_id: str
      trend: list[{year, period, periodName, value}] -- last 24 months
      source: "bls"
    """
    # Strip trailing period or whitespace from key (common typo)
    bls_key = bls_key.strip().rstrip(".")

    ck = f"bls:{zip_code[:3]}"
    cached = cache.get(ck)
    if cached is not None:
        return cached

    prefix = zip_code[:3]
    local_series, area_label = ZIP_TO_BLS.get(
        prefix,
        (NATIONAL_SERIES, "United States (national)")
    )

    def _bls_request(include_key: bool) -> dict | None:
        """Make BLS API request, optionally with registration key."""
        payload: dict = {
            "seriesid":  [local_series, NATIONAL_SERIES],
            "startyear": "2023",
            "endyear":   "2025",
        }
        if include_key and bls_key:
            payload["registrationkey"] = bls_key
        try:
            resp = requests.post(BLS_URL, json=payload, timeout=10)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            log.warning("BLS request failed (key=%s): %s", include_key, e)
            return None

    try:
        # Try with key first, fall back to public access (lower rate limits)
        data = _bls_request(include_key=True)
        if data and data.get("status") == "REQUEST_SUCCEEDED":
            pass  # good
        else:
            log.info("BLS registered key failed -- trying public access")
            data = _bls_request(include_key=False)
            if not data:
                return None

        if data.get("status") != "REQUEST_SUCCEEDED":
            log.warning("BLS API status: %s -- %s",
                        data.get("status"), data.get("message", ""))
            return None

        series_list = data.get("Results", {}).get("series", [])
        local_data: list[dict] = []
        national_data: list[dict] = []

        for s in series_list:
            sid = s.get("seriesID", "")
            points = s.get("data", [])
            if sid == local_series:
                local_data = points
            elif sid == NATIONAL_SERIES:
                national_data = points

        def _latest_rate(data_list: list) -> float:
            # BLS returns newest first
            for entry in data_list:
                try:
                    return float(entry["value"])
                except (KeyError, ValueError):
                    continue
            return 0.0

        def _trend(data_list: list, n: int = 24) -> list[dict]:
            out = []
            for entry in reversed(data_list[:n]):  # oldest first
                try:
                    out.append({
                        "year":       entry.get("year", ""),
                        "period":     entry.get("periodName", entry.get("period", "")),
                        "value":      float(entry.get("value", 0)),
                    })
                except ValueError:
                    continue
            return out

        current_rate  = _latest_rate(local_data) or _latest_rate(national_data)
        national_rate = _latest_rate(national_data)
        trend         = _trend(local_data or national_data)

        result = {
            "current_rate":  current_rate,
            "national_rate": national_rate,
            "area_label":    area_label,
            "series_id":     local_series,
            "trend":         trend,
            "source":        "bls",
        }
        cache.set(ck, result, ttl_seconds=86_400)   # 24 h
        return result

    except requests.exceptions.HTTPError as exc:
        log.warning("BLS HTTP error: %s", exc)
        return None
    except Exception as exc:
        log.warning("BLS error for %s: %s", zip_code, exc)
        return None
