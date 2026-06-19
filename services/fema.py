"""FEMA NFHL flood zone lookup -- free, no API key required."""
from __future__ import annotations
import logging
from typing import Any

import requests

from . import cache

log = logging.getLogger(__name__)

# FEMA periodically migrates ArcGIS endpoints -- try in order
FEMA_URLS = [
    "https://msc.fema.gov/arcgis/rest/services/NFHL/MapServer/identify",
    "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/identify",
    "https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer/identify",
]

FLOOD_ZONE_META = {
    # High-risk zones
    "A":   {"risk": "High",        "label": "Special Flood Hazard Area",        "insurance": "Required"},
    "AE":  {"risk": "High",        "label": "High-risk flood zone (1% annual)", "insurance": "Required"},
    "AH":  {"risk": "High",        "label": "Shallow flooding zone",            "insurance": "Required"},
    "AO":  {"risk": "High",        "label": "Sheet-flow flooding zone",         "insurance": "Required"},
    "AR":  {"risk": "High",        "label": "Reduced risk (levee in progress)", "insurance": "Required"},
    "A99": {"risk": "High",        "label": "Protected by levee",               "insurance": "Required"},
    "V":   {"risk": "Very High",   "label": "Coastal high-velocity zone",       "insurance": "Required"},
    "VE":  {"risk": "Very High",   "label": "Coastal high-velocity (BFE)",      "insurance": "Required"},
    # Moderate/Low-risk zones
    "B":   {"risk": "Moderate",    "label": "Moderate flood risk",              "insurance": "Recommended"},
    "C":   {"risk": "Low",         "label": "Minimal flood risk",               "insurance": "Optional"},
    "X":   {"risk": "Low",         "label": "Minimal or no flood risk",         "insurance": "Optional"},
    "D":   {"risk": "Undetermined","label": "Possible flood risk",              "insurance": "Recommended"},
}

_MOCK = {
    "flood_zone": "X",
    "risk":       "Low",
    "label":      "Flood data temporarily unavailable -- defaulting to minimal risk",
    "insurance":  "Optional",
    "sfha":       False,
    "source":     "mock",
}


def get_flood_zone(lat: float, lon: float) -> dict[str, Any]:
    """
    Returns:
      flood_zone: str (e.g. "AE", "X")
      risk: str ("High" / "Moderate" / "Low" / "Very High" / "Undetermined")
      label: str (human-readable description)
      insurance: str ("Required" / "Recommended" / "Optional")
      sfha: bool (Special Flood Hazard Area)
      source: "fema_nfhl" | "mock"
    """
    ck = f"fema:{lat:.4f}:{lon:.4f}"
    cached = cache.get(ck)
    if cached is not None:
        return cached

    delta      = 0.01
    map_extent = f"{lon - delta},{lat - delta},{lon + delta},{lat + delta}"

    params = {
        "geometry":       f"{lon},{lat}",
        "geometryType":   "esriGeometryPoint",
        "sr":             4326,
        "layers":         "all:28",     # Flood Hazard Areas layer
        "tolerance":      2,
        "mapExtent":      map_extent,
        "imageDisplay":   "800,800,96",
        "returnGeometry": "false",
        "f":              "json",
    }

    for url in FEMA_URLS:
        try:
            resp = requests.get(url, params=params, timeout=10)
            if resp.status_code == 404:
                log.debug("FEMA 404 on %s -- trying next URL", url)
                continue
            resp.raise_for_status()
            data = resp.json()

            results   = data.get("results", [])
            flood_zone = "X"   # default minimal risk
            for r in results:
                attrs = r.get("attributes", {})
                zone  = (attrs.get("FLD_ZONE") or attrs.get("ZONE_") or "").strip().upper()
                if zone:
                    flood_zone = zone
                    break

            meta   = FLOOD_ZONE_META.get(flood_zone, FLOOD_ZONE_META["X"])
            result = {
                "flood_zone": flood_zone,
                "risk":       meta["risk"],
                "label":      meta["label"],
                "insurance":  meta["insurance"],
                "sfha":       flood_zone.startswith(("A", "V")),
                "source":     "fema_nfhl",
            }
            cache.set(ck, result, ttl_seconds=2_592_000)   # 30 days
            return result

        except Exception as exc:
            log.debug("FEMA error on %s for (%s, %s): %s", url, lat, lon, exc)
            continue

    log.warning("FEMA: all endpoints failed for (%s, %s)", lat, lon)
    return _MOCK
