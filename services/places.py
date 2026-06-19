"""Google Places API (New) v1 -- nearby schools, hospitals, amenities.

Uses POST https://places.googleapis.com/v1/places:searchNearby
Falls back to legacy Nearby Search if v1 returns 403.
"""
from __future__ import annotations
import logging
import math
from typing import Any

import requests

from . import cache

log = logging.getLogger(__name__)

# New Places API v1
PLACES_V1_URL = "https://places.googleapis.com/v1/places:searchNearby"
# Legacy fallback
PLACES_LEGACY_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"

CATEGORIES = {
    "schools":     "school",
    "hospitals":   "hospital",
    "grocery":     "grocery_or_supermarket",
    "parks":       "park",
    "restaurants": "restaurant",
    "pharmacies":  "pharmacy",
    "gyms":        "gym",
    "transit":     "transit_station",
    "cafes":       "cafe",
    "banks":       "bank",
}

CATEGORY_ICONS = {
    "schools":     "🏫",
    "hospitals":   "🏥",
    "grocery":     "🛒",
    "parks":       "🌳",
    "restaurants": "🍽️",
    "pharmacies":  "💊",
    "gyms":        "🏋️",
    "transit":     "🚇",
    "cafes":       "☕",
    "banks":       "🏦",
}

# Walk score weights: (points_per_place, max_points)
WALK_WEIGHTS = {
    "grocery":     (3.0, 15.0),
    "restaurants": (0.5, 10.0),
    "schools":     (2.0, 10.0),
    "parks":       (1.0, 10.0),
    "transit":     (2.0, 15.0),
    "pharmacies":  (1.0,  5.0),
    "gyms":        (1.0,  5.0),
    "cafes":       (0.5,  5.0),
    "banks":       (0.5,  5.0),
}
WALK_SCORE_MAX = sum(m for _, m in WALK_WEIGHTS.values())   # 85 pts -> normalize to 100


def get_nearby_places(lat: float, lon: float, api_key: str,
                      radius_m: int = 2000) -> dict[str, Any] | None:
    """
    Returns dict keyed by category, each with a list of places.
    Also includes summary counts + nearest distance, and computed walk_scores.
    """
    ck = f"places_v2:{lat:.3f}:{lon:.3f}:{radius_m}"
    cached = cache.get(ck)
    if cached is not None:
        return cached

    try:
        results: dict[str, list] = {}
        for cat, place_type in CATEGORIES.items():
            places = _fetch_nearby(lat, lon, api_key, place_type, radius_m)
            results[cat] = [_map_place(p, lat, lon) for p in places[:8]]

        # Summary counts + nearest distance
        summary = {}
        for cat, places in results.items():
            if places:
                nearest = min(p["distance_mi"] for p in places)
                summary[cat] = {
                    "icon":    CATEGORY_ICONS.get(cat, "📍"),
                    "count":   len(places),
                    "nearest": round(nearest, 1),
                    "label":   cat.replace("_", " ").title(),
                }

        # Compute walkability from actual distances
        walk_scores = compute_walk_score(results)

        out = {
            "places":      results,
            "summary":     summary,
            "walk_scores": walk_scores,
            "source":      "google_places",
        }
        cache.set(ck, out, ttl_seconds=604_800)   # 7 days
        return out
    except Exception as exc:
        log.warning("Google Places error: %s", exc)
        return None


def get_schools(lat: float, lon: float, api_key: str) -> list[dict] | None:
    """Detailed school list within 3 km, sorted by distance."""
    ck = f"schools_v2:{lat:.3f}:{lon:.3f}"
    cached = cache.get(ck)
    if cached is not None:
        return cached

    try:
        raw = _fetch_nearby(lat, lon, api_key, "school", radius_m=3000)
        schools = []
        for p in raw[:10]:
            types = p.get("types", [])
            school_type = "University" if "university" in types else "Public"
            p_lat = p.get("lat", lat)
            p_lon = p.get("lon", lon)
            schools.append({
                "name":     p.get("name", ""),
                "type":     school_type,
                "grades":   "K-12",
                "rating":   round(p.get("rating", 0), 1),
                "distance": _distance_mi(lat, lon, p_lat, p_lon),
                "address":  p.get("address", ""),
                "place_id": p.get("place_id", ""),
            })
        schools.sort(key=lambda s: s["distance"])
        cache.set(ck, schools, ttl_seconds=604_800)
        return schools
    except Exception as exc:
        log.warning("Google Places schools error: %s", exc)
        return None


def compute_walk_score(places_data: dict[str, list]) -> dict[str, Any]:
    """
    Compute walkability scores from nearby places data.

    Walk Score formula:
      For each category, count places within 0.5 mi, apply weight per place,
      cap at category max, sum all, normalize to 0-100.

    Transit Score:
      Count transit stops within 0.25 mi × 10, capped at 100.

    Returns dict with walk_score, transit_score, bike_score + descriptions.
    """
    total_points = 0.0

    for cat, (ppp, max_pts) in WALK_WEIGHTS.items():
        places_in_cat = places_data.get(cat, [])
        within_half_mi = [p for p in places_in_cat if p.get("distance_mi", 99) <= 0.5]
        pts = min(len(within_half_mi) * ppp, max_pts)
        total_points += pts

    walk_score = min(100, round(total_points / WALK_SCORE_MAX * 100))

    # Transit score: stops within 0.25 mi
    transit_places = places_data.get("transit", [])
    nearby_transit = [p for p in transit_places if p.get("distance_mi", 99) <= 0.25]
    transit_score = min(100, len(nearby_transit) * 10)

    # Bike score: composite estimate
    bike_score = min(100, round(walk_score * 0.7 + transit_score * 0.2))

    def _walk_label(s: int) -> str:
        if s >= 90: return "Walker's Paradise"
        if s >= 70: return "Very Walkable"
        if s >= 50: return "Somewhat Walkable"
        if s >= 25: return "Some Errands on Foot"
        return "Car-Dependent"

    def _transit_label(s: int) -> str:
        if s >= 70: return "Excellent Transit"
        if s >= 50: return "Excellent Transit"
        if s >= 25: return "Some Transit"
        return "Minimal Transit"

    def _bike_label(s: int) -> str:
        if s >= 70: return "Very Bikeable"
        if s >= 50: return "Bikeable"
        return "Some Infrastructure"

    return {
        "walk_score":          walk_score,
        "transit_score":       transit_score,
        "bike_score":          bike_score,
        "walk_description":    _walk_label(walk_score),
        "transit_description": _transit_label(transit_score),
        "bike_description":    _bike_label(bike_score),
        "source":              "computed_from_places",
    }


# ── Private helpers ───────────────────────────────────────────────────────────

def _fetch_nearby(lat: float, lon: float, api_key: str,
                  place_type: str, radius_m: int) -> list[dict]:
    """Try new Places API v1 first, fall back to legacy Nearby Search."""
    result = _fetch_v1(lat, lon, api_key, place_type, radius_m)
    if result is not None:
        return result
    return _fetch_legacy(lat, lon, api_key, place_type, radius_m)


def _fetch_v1(lat: float, lon: float, api_key: str,
              place_type: str, radius_m: int) -> list[dict] | None:
    """Google Places API (New) v1 -- POST to places:searchNearby."""
    try:
        body = {
            "includedTypes":    [place_type],
            "maxResultCount":   8,
            "locationRestriction": {
                "circle": {
                    "center": {"latitude": lat, "longitude": lon},
                    "radius": float(radius_m),
                }
            },
        }
        headers = {
            "X-Goog-Api-Key":  api_key,
            "X-Goog-FieldMask": (
                "places.id,places.displayName,places.formattedAddress,"
                "places.location,places.rating,places.types,"
                "places.regularOpeningHours"
            ),
            "Content-Type": "application/json",
        }
        resp = requests.post(PLACES_V1_URL, json=body, headers=headers, timeout=8)

        # If New Places API not enabled, fall back
        if resp.status_code in (403, 404):
            log.debug("Places v1 %s for %s -- using legacy", resp.status_code, place_type)
            return None

        resp.raise_for_status()
        data = resp.json()
        places = []
        for p in data.get("places", []):
            loc = p.get("location", {})
            name_obj = p.get("displayName", {})
            name = (name_obj.get("text", "") if isinstance(name_obj, dict)
                    else str(name_obj))
            places.append({
                "name":     name,
                "address":  p.get("formattedAddress", ""),
                "rating":   p.get("rating", 0),
                "types":    p.get("types", []),
                "lat":      loc.get("latitude", lat),
                "lon":      loc.get("longitude", lon),
                "place_id": p.get("id", ""),
                "open_now": (
                    (p.get("regularOpeningHours") or {}).get("openNow")
                ),
            })
        return places
    except Exception as exc:
        log.debug("Places v1 error for %s: %s", place_type, exc)
        return None


def _fetch_legacy(lat: float, lon: float, api_key: str,
                  place_type: str, radius_m: int) -> list[dict]:
    """Google Places Nearby Search (legacy) -- GET request."""
    try:
        resp = requests.get(PLACES_LEGACY_URL, params={
            "location": f"{lat},{lon}",
            "radius":   radius_m,
            "type":     place_type,
            "key":      api_key,
        }, timeout=8)
        resp.raise_for_status()
        data = resp.json()
        if data.get("status") not in ("OK", "ZERO_RESULTS"):
            log.warning("Places legacy status: %s", data.get("status"))
            return []
        places = []
        for p in data.get("results", []):
            loc = p.get("geometry", {}).get("location", {})
            places.append({
                "name":     p.get("name", ""),
                "address":  p.get("vicinity", ""),
                "rating":   p.get("rating", 0),
                "types":    p.get("types", []),
                "lat":      loc.get("lat", lat),
                "lon":      loc.get("lng", lon),
                "place_id": p.get("place_id", ""),
                "open_now": p.get("opening_hours", {}).get("open_now"),
            })
        return places
    except Exception as exc:
        log.warning("Places legacy error for %s: %s", place_type, exc)
        return []


def _map_place(p: dict, ref_lat: float, ref_lon: float) -> dict:
    return {
        "name":        p.get("name", ""),
        "distance_mi": _distance_mi(ref_lat, ref_lon,
                                    p.get("lat", ref_lat), p.get("lon", ref_lon)),
        "rating":      p.get("rating", 0),
        "address":     p.get("address", ""),
        "lat":         p.get("lat", ref_lat),
        "lon":         p.get("lon", ref_lon),
        "open_now":    p.get("open_now"),
        "place_id":    p.get("place_id", ""),
    }


def _distance_mi(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 3958.8
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2))
         * math.sin(dlon / 2) ** 2)
    return round(R * 2 * math.asin(math.sqrt(max(0, a))), 2)
