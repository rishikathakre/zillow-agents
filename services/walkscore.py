"""Walk Score API -- walk, transit, bike scores."""
from __future__ import annotations
import logging
from typing import Any

import requests

from . import cache

log = logging.getLogger(__name__)
WS_URL = "https://api.walkscore.com/score"


def get_walk_scores(address: str, lat: float, lon: float, api_key: str) -> dict[str, Any] | None:
    """
    Returns:
      walk_score: int (0-100)
      walk_description: str ("Walker's Paradise" etc)
      transit_score: int
      transit_description: str
      bike_score: int
      bike_description: str
      ws_link: str (link to full page)
      source: "walkscore"
    """
    ck = f"walkscore:{lat:.3f}:{lon:.3f}"
    cached = cache.get(ck)
    if cached is not None:
        return cached

    try:
        resp = requests.get(WS_URL, params={
            "format":   "json",
            "address":  address,
            "lat":      lat,
            "lon":      lon,
            "transit":  1,
            "bike":     1,
            "wsapikey": api_key,
        }, timeout=6)
        resp.raise_for_status()
        d = resp.json()

        if d.get("status") != 1:
            log.warning("Walk Score status %s for %s", d.get("status"), address)
            return None

        transit = d.get("transit") or {}
        bike    = d.get("bike") or {}

        result = {
            "walk_score":          d.get("walkscore", 0),
            "walk_description":    d.get("description", ""),
            "transit_score":       transit.get("score", 0),
            "transit_description": transit.get("description", ""),
            "bike_score":          bike.get("score", 0),
            "bike_description":    bike.get("description", ""),
            "ws_link":             d.get("ws_link", ""),
            "source":              "walkscore",
        }
        cache.set(ck, result, ttl_seconds=604_800)   # 7 days
        return result
    except Exception as exc:
        log.warning("Walk Score error for %s: %s", address, exc)
        return None
