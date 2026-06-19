import requests
import os
import logging

log = logging.getLogger(__name__)
RENTCAST_KEY = os.getenv("RENTCAST_API_KEY", "") or os.getenv("RENT_CAST_API_KEY", "")
BASE = "https://api.rentcast.io/v1"

def get_listings(zip_code: str, limit: int = 20) -> list:
    if not RENTCAST_KEY:
        log.warning("RENTCAST_API_KEY not set")
        return []
    try:
        r = requests.get(
            f"{BASE}/listings/sale",
            headers={"X-Api-Key": RENTCAST_KEY},
            params={
                "zipCode": zip_code,
                "limit": limit,
                "status": "Active"
            },
            timeout=15
        )
        if r.status_code == 200:
            data = r.json()
            log.info(f"RentCast returned {len(data)} listings")
            return data
        else:
            log.error(f"RentCast error {r.status_code}: {r.text[:200]}")
            return []
    except Exception as e:
        log.error(f"RentCast exception: {e}")
        return []

def get_market_data(zip_code: str) -> dict:
    if not RENTCAST_KEY:
        return {}
    try:
        r = requests.get(
            f"{BASE}/markets",
            headers={"X-Api-Key": RENTCAST_KEY},
            params={"zipCode": zip_code},
            timeout=15
        )
        if r.status_code == 200:
            return r.json()
        return {}
    except Exception as e:
        log.error(f"RentCast market error: {e}")
        return {}

def map_listing(item: dict) -> dict:
    # Map RentCast fields to our app schema
    address = item.get("addressLine1", "")
    city    = item.get("city", "")
    state   = item.get("state", "")
    zip_c   = str(item.get("zipCode", ""))
    full    = f"{address}, {city}, {state} {zip_c}".strip()
    return {
        "id":            item.get("id", ""),
        "address":       address,
        "full_address":  full,
        "city":          city,
        "state":         state,
        "zip_code":      zip_c,
        "price":         item.get("price", 0) or 0,
        "beds":          item.get("bedrooms", 0) or 0,
        "baths":         item.get("bathrooms", 0) or 0,
        "sqft":          item.get("squareFootage", 0) or 0,
        "year_built":    item.get("yearBuilt", 0) or 0,
        "property_type": item.get("propertyType", "Single Family"),
        "lat":           item.get("latitude", 0) or 0,
        "lon":           item.get("longitude", 0) or 0,
        "days_on_market": item.get("daysOnMarket", 0) or 0,
        "monthly_rent":  item.get("rentZestimate", 0) or 0,
        "source":        "rentcast",
    }
