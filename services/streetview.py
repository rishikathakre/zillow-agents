import os
import requests
from urllib.parse import quote

GOOGLE_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")
BASE_URL = "https://maps.googleapis.com/maps/api/streetview"
META_URL = "https://maps.googleapis.com/maps/api/streetview/metadata"

def photo_exists(address: str) -> bool:
    if not GOOGLE_KEY or not address:
        return False
    try:
        r = requests.get(
            META_URL,
            params={"location": address, "key": GOOGLE_KEY},
            timeout=8
        )
        return r.json().get("status") == "OK"
    except Exception:
        return False

def get_photo_url(address: str,
                  size: str = "800x500",
                  heading: int = 0) -> str:
    if not GOOGLE_KEY or not address:
        return ""
    return (
        f"{BASE_URL}?size={size}"
        f"&location={quote(address)}"
        f"&heading={heading}"
        f"&pitch=10&fov=90"
        f"&key={GOOGLE_KEY}"
    )

def get_photo_urls(address: str, count: int = 5) -> list:
    if not GOOGLE_KEY or not address:
        return []
    headings = [0, 90, 180, 270, 45]
    return [
        get_photo_url(address, heading=headings[i])
        for i in range(min(count, len(headings)))
    ]
