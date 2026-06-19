from __future__ import annotations

import asyncio
import json
import logging
import math
import random
import re
import time
import uuid
import requests
from base64 import b64decode, b64encode
from datetime import datetime, date
from pathlib import Path
from typing import Any
from urllib.error import URLError
from urllib.request import Request, urlopen

from dotenv import dotenv_values, set_key
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import Column, Float, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from generate_pdf import build_pdf_report
from main import build_graph
from state import AgentState

# ── Real-Data Services ────────────────────────────────────────────────────────
from services import weather as svc_weather
from services import aqi as svc_aqi
from services import pollen as svc_pollen
from services import places as svc_places
from services import walkscore as svc_walkscore
from services import fema as svc_fema
from services import bls as svc_bls
from services import census as svc_census
from services import rentcast as svc_rentcast
from services import zillow_csv as svc_zillow_csv

HOUSE_PHOTOS_POOL = [
    "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800",
    "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800",
    "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800",
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800",
    "https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=800",
    "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
    "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800",
    "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800",
    "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800",
]

def _pick_photo(addr: str, lid: str = "", size: str = "800x500") -> str:
    idx = abs(hash(addr + lid)) % len(HOUSE_PHOTOS_POOL)
    return HOUSE_PHOTOS_POOL[idx]

def _pick_photos(addr: str, lid: str = "", n: int = 5) -> list:
    base = abs(hash(addr + lid)) % len(HOUSE_PHOTOS_POOL)
    return [HOUSE_PHOTOS_POOL[(base + i) % len(HOUSE_PHOTOS_POOL)] 
            for i in range(n)]

log = logging.getLogger(__name__)


ROOT = Path(__file__).parent
ENV_PATH = ROOT / ".env"
CACHE_PATH = ROOT / "data" / "analysis_cache.json"
DB_PATH = ROOT / "analyses.db"

DEFAULT_WEIGHTS: dict[str, float] = {
    "price_score": 0.25,
    "neighborhood_score": 0.20,
    "rental_yield": 0.15,
    "forecast_score": 0.15,
    "aqi_score": 0.10,
    "pollen_score": 0.05,
    "airbnb_score": 0.05,
    "climate_risk_score": 0.05,
}

SCORE_LABELS: dict[str, str] = {
    "price_score": "Price Momentum",
    "neighborhood_score": "Neighborhood Quality",
    "rental_yield": "Rental Yield",
    "forecast_score": "12-Month Forecast",
    "aqi_score": "Air Quality (AQI)",
    "pollen_score": "Pollen Index",
    "airbnb_score": "Airbnb STR Yield",
    "climate_risk_score": "Climate Risk",
}

AQI_CATEGORY = [
    (50, "Good", "Air quality is satisfactory and poses little or no risk."),
    (100, "Moderate", "Air quality is acceptable. Some pollutants may affect sensitive groups."),
    (150, "Unhealthy for Sensitive Groups", "Members of sensitive groups may experience health effects."),
    (200, "Unhealthy", "Everyone may begin to experience health effects."),
    (300, "Very Unhealthy", "Health alert: everyone may experience more serious health effects."),
]

MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]

# ── ZIP / City Knowledge Base ─────────────────────────────────────────────────

ZIP_DATA: dict[str, dict] = {
    "100": {"city": "New York", "state": "NY", "neighborhoods": ["Chelsea", "Midtown", "Hell's Kitchen", "Murray Hill", "Gramercy"], "lat": 40.748, "lon": -73.996, "price_range": (750000, 3500000), "climate": "northeast"},
    "101": {"city": "New York", "state": "NY", "neighborhoods": ["Upper West Side", "Upper East Side", "Harlem", "Morningside Heights"], "lat": 40.782, "lon": -73.965, "price_range": (850000, 4000000), "climate": "northeast"},
    "110": {"city": "New York", "state": "NY", "neighborhoods": ["Astoria", "Long Island City", "Jackson Heights", "Flushing"], "lat": 40.742, "lon": -73.921, "price_range": (450000, 1200000), "climate": "northeast"},
    "112": {"city": "Brooklyn", "state": "NY", "neighborhoods": ["Williamsburg", "Park Slope", "DUMBO", "Bushwick", "Crown Heights"], "lat": 40.692, "lon": -73.990, "price_range": (600000, 2000000), "climate": "northeast"},
    "900": {"city": "Los Angeles", "state": "CA", "neighborhoods": ["Silver Lake", "Echo Park", "Los Feliz", "Highland Park"], "lat": 34.083, "lon": -118.260, "price_range": (700000, 1800000), "climate": "mediterranean"},
    "901": {"city": "Pasadena", "state": "CA", "neighborhoods": ["Old Town", "Arcadia", "San Marino", "Altadena"], "lat": 34.148, "lon": -118.144, "price_range": (800000, 2200000), "climate": "mediterranean"},
    "902": {"city": "Beverly Hills", "state": "CA", "neighborhoods": ["Beverly Hills", "Bel Air", "Holmby Hills", "Trousdale Estates"], "lat": 34.073, "lon": -118.400, "price_range": (2000000, 8000000), "climate": "mediterranean"},
    "906": {"city": "Malibu", "state": "CA", "neighborhoods": ["Malibu", "Pacific Palisades", "Point Dume", "Zuma Beach"], "lat": 34.025, "lon": -118.780, "price_range": (2500000, 12000000), "climate": "mediterranean"},
    "981": {"city": "Seattle", "state": "WA", "neighborhoods": ["Capitol Hill", "Queen Anne", "Fremont", "Belltown", "South Lake Union"], "lat": 47.620, "lon": -122.349, "price_range": (550000, 1400000), "climate": "pacific_northwest"},
    "980": {"city": "Seattle", "state": "WA", "neighborhoods": ["Ballard", "Wallingford", "Phinney Ridge", "Green Lake"], "lat": 47.664, "lon": -122.382, "price_range": (700000, 1600000), "climate": "pacific_northwest"},
    "802": {"city": "Denver", "state": "CO", "neighborhoods": ["LoDo", "RiNo", "Capitol Hill", "Cherry Creek", "Highlands"], "lat": 39.742, "lon": -104.991, "price_range": (400000, 950000), "climate": "high_plains"},
    "800": {"city": "Denver", "state": "CO", "neighborhoods": ["Aurora", "Lakewood", "Englewood", "Centennial"], "lat": 39.711, "lon": -104.834, "price_range": (350000, 750000), "climate": "high_plains"},
    "606": {"city": "Chicago", "state": "IL", "neighborhoods": ["River North", "Lincoln Park", "Wicker Park", "Lakeview", "Bucktown"], "lat": 41.893, "lon": -87.637, "price_range": (350000, 900000), "climate": "midwest"},
    "604": {"city": "Chicago", "state": "IL", "neighborhoods": ["The Loop", "Gold Coast", "Streeterville", "Old Town"], "lat": 41.878, "lon": -87.633, "price_range": (400000, 1200000), "climate": "midwest"},
    "787": {"city": "Austin", "state": "TX", "neighborhoods": ["East Austin", "South Congress", "Travis Heights", "Mueller"], "lat": 30.268, "lon": -97.745, "price_range": (450000, 1100000), "climate": "south_central"},
    "786": {"city": "Austin", "state": "TX", "neighborhoods": ["Hyde Park", "Brentwood", "Rosedale", "Crestview"], "lat": 30.307, "lon": -97.742, "price_range": (500000, 1300000), "climate": "south_central"},
    "770": {"city": "Houston", "state": "TX", "neighborhoods": ["Montrose", "The Heights", "Midtown", "River Oaks", "Midtown"], "lat": 29.753, "lon": -95.367, "price_range": (300000, 800000), "climate": "gulf_coast"},
    "331": {"city": "Miami", "state": "FL", "neighborhoods": ["Brickell", "Wynwood", "Design District", "Downtown"], "lat": 25.762, "lon": -80.190, "price_range": (450000, 1500000), "climate": "subtropical"},
    "331": {"city": "Miami Beach", "state": "FL", "neighborhoods": ["South Beach", "Mid-Beach", "Bal Harbour", "Surfside"], "lat": 25.790, "lon": -80.130, "price_range": (600000, 3000000), "climate": "subtropical"},
    "332": {"city": "Coral Gables", "state": "FL", "neighborhoods": ["Coral Gables", "Coconut Grove", "South Miami", "Pinecrest"], "lat": 25.722, "lon": -80.268, "price_range": (700000, 2500000), "climate": "subtropical"},
    "303": {"city": "Atlanta", "state": "GA", "neighborhoods": ["Inman Park", "Virginia-Highland", "Candler Park", "Little Five Points"], "lat": 33.768, "lon": -84.352, "price_range": (350000, 900000), "climate": "southeast"},
    "302": {"city": "Atlanta", "state": "GA", "neighborhoods": ["Buckhead", "Midtown", "Old Fourth Ward", "Poncey-Highland"], "lat": 33.843, "lon": -84.374, "price_range": (400000, 1200000), "climate": "southeast"},
    "941": {"city": "San Francisco", "state": "CA", "neighborhoods": ["Mission District", "Castro", "Noe Valley", "Bernal Heights"], "lat": 37.760, "lon": -122.422, "price_range": (1200000, 3500000), "climate": "mediterranean"},
    "940": {"city": "San Francisco", "state": "CA", "neighborhoods": ["Pacific Heights", "Russian Hill", "North Beach", "Chinatown"], "lat": 37.800, "lon": -122.430, "price_range": (1500000, 5000000), "climate": "mediterranean"},
    "852": {"city": "Phoenix", "state": "AZ", "neighborhoods": ["Arcadia", "Biltmore", "Paradise Valley", "Old Town Scottsdale"], "lat": 33.493, "lon": -111.926, "price_range": (450000, 1400000), "climate": "desert"},
    "850": {"city": "Phoenix", "state": "AZ", "neighborhoods": ["Downtown", "Midtown", "Encanto", "Roosevelt Row"], "lat": 33.448, "lon": -112.074, "price_range": (280000, 650000), "climate": "desert"},
    "191": {"city": "Philadelphia", "state": "PA", "neighborhoods": ["Rittenhouse Square", "Fishtown", "Fairmount", "Graduate Hospital"], "lat": 39.952, "lon": -75.165, "price_range": (280000, 750000), "climate": "northeast"},
    "282": {"city": "Charlotte", "state": "NC", "neighborhoods": ["Dilworth", "Plaza Midwood", "NoDa", "South End"], "lat": 35.226, "lon": -80.843, "price_range": (320000, 750000), "climate": "southeast"},
    "372": {"city": "Nashville", "state": "TN", "neighborhoods": ["East Nashville", "Germantown", "12 South", "Hillsboro Village"], "lat": 36.162, "lon": -86.782, "price_range": (400000, 950000), "climate": "southeast"},
    "971": {"city": "Portland", "state": "OR", "neighborhoods": ["Pearl District", "Alberta Arts District", "Hawthorne", "Division"], "lat": 45.523, "lon": -122.676, "price_range": (450000, 1000000), "climate": "pacific_northwest"},
    "891": {"city": "Las Vegas", "state": "NV", "neighborhoods": ["Summerlin", "Henderson", "Spring Valley", "Green Valley"], "lat": 36.175, "lon": -115.137, "price_range": (350000, 850000), "climate": "desert"},
    "300": {"city": "Oxon Hill", "state": "MD", "neighborhoods": ["Oxon Hill", "Fort Washington", "Temple Hills", "Camp Springs"], "lat": 38.803, "lon": -76.988, "price_range": (280000, 550000), "climate": "mid_atlantic"},
}

# Exact 5-digit overrides for demo ZIPs whose 3-digit prefix isn't in ZIP_DATA
ZIP_5DIGIT: dict[str, dict] = {
    "20001": {"city": "Washington",   "state": "DC", "neighborhoods": ["Shaw", "U Street", "Columbia Heights", "NoMa"], "lat": 38.9172, "lon": -77.0130, "price_range": (400000, 1100000), "climate": "mid_atlantic"},
    "20740": {"city": "College Park", "state": "MD", "neighborhoods": ["College Park", "Hollywood", "Old Town"], "lat": 38.9807, "lon": -76.9369, "price_range": (280000, 560000), "climate": "mid_atlantic"},
    "20745": {"city": "Oxon Hill",    "state": "MD", "neighborhoods": ["Oxon Hill", "Forest Heights", "National Harbor"], "lat": 38.8029, "lon": -76.9894, "price_range": (260000, 520000), "climate": "mid_atlantic"},
    "20770": {"city": "Greenbelt",    "state": "MD", "neighborhoods": ["Greenbelt", "Old Greenbelt", "Berwyn Heights"], "lat": 38.9954, "lon": -76.8755, "price_range": (270000, 530000), "climate": "mid_atlantic"},
    "20783": {"city": "Hyattsville",  "state": "MD", "neighborhoods": ["Hyattsville", "Langley Park", "Chillum"], "lat": 38.9551, "lon": -76.9550, "price_range": (270000, 540000), "climate": "mid_atlantic"},
    "22201": {"city": "Arlington",    "state": "VA", "neighborhoods": ["Courthouse", "Clarendon", "Ballston", "Rosslyn"], "lat": 38.8816, "lon": -77.0910, "price_range": (450000, 1100000), "climate": "mid_atlantic"},
}

STREET_TYPES = ["St", "Ave", "Blvd", "Dr", "Ln", "Way", "Pl", "Ct", "Rd", "Ter"]
STREET_PREFIXES = [
    "Oak", "Maple", "Cedar", "Pine", "Elm", "Willow", "Birch", "Walnut",
    "Sunset", "Sunrise", "Spring", "Summer", "Winter", "Autumn", "Lake",
    "River", "Hill", "Valley", "Park", "Garden", "Forest", "Meadow",
    "Highland", "Lakeside", "Hillcrest", "Fairview", "Greenwood",
    "Maplewood", "Westfield", "Eastview", "Northgate", "Southbrook",
]
PROPERTY_TYPES_LIST = ["Single Family", "Single Family", "Single Family", "Condo", "Condo", "Townhouse", "Multi-Family"]

CLIMATE_PROFILES: dict[str, dict] = {
    "northeast": {"temp_f": (28, 82), "humidity": (55, 75), "sunny_days": 224, "rain_in": 46, "snow_in": 28, "heat_days": 8},
    "mediterranean": {"temp_f": (48, 85), "humidity": (55, 70), "sunny_days": 284, "rain_in": 15, "snow_in": 0, "heat_days": 15},
    "pacific_northwest": {"temp_f": (35, 78), "humidity": (70, 85), "sunny_days": 152, "rain_in": 38, "snow_in": 6, "heat_days": 5},
    "high_plains": {"temp_f": (18, 90), "humidity": (35, 55), "sunny_days": 300, "rain_in": 14, "snow_in": 55, "heat_days": 30},
    "midwest": {"temp_f": (15, 88), "humidity": (60, 80), "sunny_days": 195, "rain_in": 36, "snow_in": 38, "heat_days": 20},
    "south_central": {"temp_f": (38, 98), "humidity": (55, 75), "sunny_days": 228, "rain_in": 33, "snow_in": 0, "heat_days": 90},
    "gulf_coast": {"temp_f": (45, 95), "humidity": (70, 88), "sunny_days": 204, "rain_in": 50, "snow_in": 0, "heat_days": 100},
    "subtropical": {"temp_f": (58, 92), "humidity": (70, 85), "sunny_days": 248, "rain_in": 62, "snow_in": 0, "heat_days": 110},
    "southeast": {"temp_f": (32, 92), "humidity": (60, 80), "sunny_days": 215, "rain_in": 50, "snow_in": 2, "heat_days": 45},
    "desert": {"temp_f": (38, 108), "humidity": (20, 40), "sunny_days": 299, "rain_in": 8, "snow_in": 0, "heat_days": 140},
    "mid_atlantic": {"temp_f": (25, 90), "humidity": (58, 75), "sunny_days": 208, "rain_in": 42, "snow_in": 20, "heat_days": 25},
}

WEATHER_CONDITIONS = ["Sunny", "Partly Cloudy", "Cloudy", "Light Rain", "Clear", "Overcast", "Breezy"]
WEATHER_ICONS = {"Sunny": "☀️", "Partly Cloudy": "⛅", "Cloudy": "☁️", "Light Rain": "🌧️", "Clear": "🌙", "Overcast": "🌫️", "Breezy": "💨"}

SCHOOL_PREFIXES = ["Jefferson", "Lincoln", "Washington", "Roosevelt", "Kennedy", "Franklin", "Madison", "Adams", "Jackson", "Wilson", "Riverside", "Lakeside", "Hillcrest", "Westview", "Northview", "Eastview", "Sunset", "Greenwood", "Oakwood", "Maplewood"]
SCHOOL_SUFFIXES_E = ["Elementary", "Primary Academy", "Elementary School"]
SCHOOL_SUFFIXES_M = ["Middle School", "Academy", "Preparatory School"]
SCHOOL_SUFFIXES_H = ["High School", "Academy", "Preparatory Academy", "STEM Academy"]

AMENITY_TYPES = [
    ("🏥", "Nearest Hospital"),
    ("🛒", "Nearest Grocery"),
    ("🌳", "Nearest Park"),
    ("🍽️", "Restaurants nearby"),
    ("☕", "Coffee Shops"),
    ("💊", "Pharmacies"),
    ("🏋️", "Fitness Centers"),
    ("📚", "Public Library"),
]

# ── SQLAlchemy Setup ──────────────────────────────────────────────────────────

class Base(DeclarativeBase):
    pass


class AnalysisRecord(Base):
    __tablename__ = "analyses"
    id = Column(String, primary_key=True)
    user_email = Column(String, index=True)
    zip_code = Column(String)
    address = Column(String)
    date = Column(String)
    overall_score = Column(Float)
    recommendation = Column(String)
    data_json = Column(Text)


engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Mock Auth ─────────────────────────────────────────────────────────────────

def _create_token(user: dict) -> str:
    return b64encode(json.dumps(user).encode()).decode()


def _decode_token(token: str) -> dict | None:
    try:
        return json.loads(b64decode(token.encode()).decode())
    except Exception:
        return None


def get_current_user(authorization: str = Header(default="")) -> dict:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = _decode_token(authorization[7:])
    if not user or "email" not in user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user


def get_optional_user(authorization: str = Header(default="")) -> dict | None:
    if not authorization.startswith("Bearer "):
        return None
    return _decode_token(authorization[7:])


# ── FastAPI App ───────────────────────────────────────────────────────────────

app = FastAPI(title="PropIQ API", version="2.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_graph = None
_zip_cache: dict[str, dict[str, Any]] = {}
_listings_cache: dict[str, list[dict]] = {}


# ── Pydantic Models ───────────────────────────────────────────────────────────

class AuthRequest(BaseModel):
    name: str = ""
    email: str
    password: str


class AnalyzeRequest(BaseModel):
    zip_code: str
    address: str = ""
    asking_price: float = 0
    estimated_value: float = 0
    estimated_rent: float = 0
    bedrooms: int = 3
    bathrooms: float = 2.0
    sqft: int = 1600
    property_type: str = "Single Family"
    year_built: int = 2000
    weights: dict[str, float] = Field(default_factory=lambda: DEFAULT_WEIGHTS.copy())
    force_refresh: bool = False


class PdfRequest(BaseModel):
    property_details: dict[str, Any]
    scores: dict[str, Any]
    report_text: str
    recommendation: str
    weighted_total: float
    user_name: str = "PropIQ User"


class EnvKeysRequest(BaseModel):
    openai_key:      str | None = None
    airnow_key:      str | None = None
    openweather_key: str | None = None
    rentcast_key:    str | None = None
    google_maps_key: str | None = None
    walkscore_key:   str | None = None
    bls_key:         str | None = None


class ZillowUrlRequest(BaseModel):
    url: str


# ── Helpers ───────────────────────────────────────────────────────────────────

def _load_cache() -> None:
    global _zip_cache
    if CACHE_PATH.exists():
        try:
            _zip_cache = json.loads(CACHE_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            _zip_cache = {}


def _save_cache() -> None:
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    CACHE_PATH.write_text(json.dumps(_zip_cache, indent=2), encoding="utf-8")


def _get_graph():
    global _graph
    if _graph is None:
        _graph = build_graph()
    return _graph


# ── Listing Photo Pool ────────────────────────────────────────────────────────
HOUSE_PHOTOS = [
    "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80",
    "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80",
    "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800&q=80",
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80",
    "https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=800&q=80",
    "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&q=80",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80",
    "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800&q=80",
    "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800&q=80",
    "https://images.unsplash.com/photo-1567496898669-ee935f5f647a?w=800&q=80",
    "https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=800&q=80",
    "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80",
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
    "https://images.unsplash.com/photo-1588880331179-bc9b93a8cb5e?w=800&q=80",
    "https://images.unsplash.com/photo-1599427303058-f04cbcf4756f?w=800&q=80",
    "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=800&q=80",
    "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&q=80",
    "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80",
]


def _assign_photos(listing: dict) -> None:
    """Assign photo URLs to a listing. Uses Unsplash pool as deterministic fallback.
    Always assigns Unsplash photos — Street View requires API key authorization."""
    seed = listing.get("address", "") + listing.get("id", "")
    idx = hash(seed) % len(HOUSE_PHOTOS)
    listing["photo_url"] = HOUSE_PHOTOS[idx]
    listing["photo_urls"] = [HOUSE_PHOTOS[(idx + i) % len(HOUSE_PHOTOS)] for i in range(5)]


def _rng(seed_str: str, salt: int = 0) -> random.Random:
    # Use hash() for much better distribution — sum(ord()) gives nearly
    # identical seeds for "100010" vs "100011" → nearly identical scores.
    seed = hash(seed_str) + salt
    return random.Random(seed)


def _normalize_weights(weights: dict[str, float] | None) -> dict[str, float]:
    merged = DEFAULT_WEIGHTS.copy()
    if weights:
        for key, value in weights.items():
            if key in merged:
                merged[key] = max(0.0, float(value))
    total = sum(merged.values())
    if total <= 0:
        return DEFAULT_WEIGHTS.copy()
    return {key: value / total for key, value in merged.items()}


def _recommendation(score: float) -> str:
    if score >= 70:
        return "BUY"
    if score >= 40:
        return "HOLD"
    return "PASS"


def _compute_weighted_total(
    scores: dict[str, float], weights: dict[str, float]
) -> tuple[float, list[dict[str, Any]]]:
    normalized = _normalize_weights(weights)
    rows: list[dict[str, Any]] = []
    total = 0.0
    for key, weight in normalized.items():
        score = float(scores.get(key, 0.0))
        weighted = score * weight
        total += weighted
        rows.append({
            "key": key,
            "label": SCORE_LABELS.get(key, key),
            "score": round(score, 1),
            "weight": round(weight, 4),
            "weighted_score": round(weighted, 2),
        })
    return round(total, 1), rows


def _zip_info(zip_code: str) -> dict:
    """Return location metadata for a ZIP code.

    Fast path: hardcoded ZIP_DATA dict for major cities.
    Real fallback: OWM (city name) + Census ACS (state + home value).
    Last resort: generic placeholder so nothing ever crashes.
    """
    if zip_code in ZIP_5DIGIT:
        return ZIP_5DIGIT[zip_code]
    prefix = zip_code[:3]
    if prefix in ZIP_DATA:
        return ZIP_DATA[prefix]

    # Real lookup -- OWM gives city name, Census ACS gives state + price data
    try:
        env     = dotenv_values(ENV_PATH)
        owm_key = env.get("OPENWEATHER_API_KEY", "")
        loc     = svc_census.get_zip_location(zip_code, owm_key)
        city    = loc.get("city", "")
        state   = loc.get("state", "")
        lat     = loc.get("lat") or 38.9
        lon     = loc.get("lon") or -77.0

        if city:
            census = svc_census.get_acs_data(zip_code)
            mhv    = census.get("median_home_value") or 300_000
            low    = max(50_000,  int(mhv * 0.50))
            high   = max(low + 100_000, int(mhv * 2.50))
            return {
                "city":          city,
                "state":         state or "US",
                "neighborhoods": [city],
                "lat":           lat,
                "lon":           lon,
                "price_range":   (low, high),
                "climate":       "mid_atlantic",
            }
    except Exception as exc:
        log.warning("_zip_info real lookup failed for %s: %s", zip_code, exc)

    return {
        "city":          f"ZIP {zip_code}",
        "state":         "US",
        "neighborhoods": ["Downtown", "Midtown", "Uptown"],
        "lat":           38.9,
        "lon":           -77.0,
        "price_range":   (200_000, 600_000),
        "climate":       "mid_atlantic",
    }



# ── Mock Score / Data Generators ──────────────────────────────────────────────

def _mock_scores(zip_code: str) -> dict[str, float]:
    rng = _rng(zip_code)
    return {
        "price_score": round(rng.uniform(45, 82), 1),
        "neighborhood_score": round(rng.uniform(42, 88), 1),
        "rental_yield": round(rng.uniform(40, 84), 1),
        "forecast_score": round(rng.uniform(38, 80), 1),
        "aqi_score": round(rng.uniform(35, 92), 1),
        "pollen_score": round(rng.uniform(30, 85), 1),
        "airbnb_score": round(rng.uniform(28, 90), 1),
        "climate_risk_score": round(rng.uniform(32, 89), 1),
    }


def _aqi_detail(zip_code: str, aqi_score: float) -> dict[str, Any]:
    rng = _rng(zip_code, salt=11)
    aqi_value = max(5, min(300, int((100 - aqi_score) * 2.0)))
    pm25 = round(rng.uniform(3, 35), 1)
    ozone = rng.randint(20, 80)
    no2 = rng.randint(5, 60)
    co = round(rng.uniform(0.2, 4.0), 1)
    so2 = rng.randint(1, 25)
    category = "Good"
    recommendation = "Air quality is satisfactory and poses little or no risk."
    for ceiling, label, rec in AQI_CATEGORY:
        if aqi_value <= ceiling:
            category = label
            recommendation = rec
            break
    else:
        category = "Hazardous"
        recommendation = "Health warning of emergency conditions. Everyone is affected."
    return {"aqi_value": aqi_value, "pm25": pm25, "ozone": ozone, "no2": no2, "co": co, "so2": so2, "category": category, "health_recommendation": recommendation}


def _mock_aqi_trend(zip_code: str, aqi_score: float) -> list[dict[str, Any]]:
    rng = _rng(zip_code, salt=7)
    baseline = max(20, min(150, int((100 - aqi_score) * 1.5)))
    today = datetime.now()
    trend = []
    for i in range(30):
        day_offset = 29 - i
        d = date(today.year, today.month, max(1, today.day - day_offset))
        reading = max(5, baseline + rng.randint(-20, 20))
        trend.append({"date": d.strftime("%Y-%m-%d"), "aqi": reading})
    return trend


def _pollen_calendar(zip_code: str, pollen_score: float) -> dict[str, Any]:
    rng = _rng(zip_code, salt=13)
    base = max(0, min(10, int((100 - pollen_score) / 10)))
    spring_peak = rng.randint(2, 4)
    monthly: dict[str, int] = {}
    for i, m in enumerate(MONTHS):
        dist = min(abs(i - spring_peak), abs(i - (spring_peak + 6)))
        level = max(0, min(10, base + rng.randint(-1, 1) + (5 if dist <= 1 else 2 if dist <= 2 else 0)))
        monthly[m] = level
    levels = [
        ("tree_level", "High" if pollen_score < 40 else "Moderate" if pollen_score < 70 else "Low"),
        ("grass_level", "Moderate" if pollen_score < 60 else "Low"),
        ("weed_level", "Low"),
    ]
    worst_idx = sorted(range(12), key=lambda i: monthly[MONTHS[i]], reverse=True)[:2]
    worst_months = [MONTH_NAMES[i] for i in sorted(worst_idx)]
    best_idx = sorted(range(12), key=lambda i: monthly[MONTHS[i]])[:2]
    best_months = [MONTH_NAMES[i] for i in sorted(best_idx)]
    return {"monthly": monthly, "worst_months": worst_months, "best_months": best_months, **dict(levels)}


def _climate_details(zip_code: str, climate_score: float) -> dict[str, Any]:
    rng = _rng(zip_code, salt=17)
    flood_risk = max(5, min(95, int((100 - climate_score) + rng.randint(-10, 10))))
    wildfire = max(0, min(100, rng.randint(5, 60)))
    heat_days = rng.randint(5, 60)
    wind_risk = rng.randint(10, 70)
    flood_zones = ["X", "X", "X", "AE", "AE", "A", "VE", "D"]
    flood_zone = flood_zones[rng.randint(0, len(flood_zones) - 1)]
    withdrawn = ["State Farm", "Allstate", "Farmers"]
    insurance_available = rng.random() > 0.25
    insurance_note = "Standard insurance available" if insurance_available else f"{withdrawn[rng.randint(0, 2)]} has withdrawn from this market"
    return {"flood_risk_score": flood_risk, "flood_zone": flood_zone, "wildfire_risk_score": wildfire, "heat_days_per_year": heat_days, "wind_risk_score": wind_risk, "insurance_available": insurance_available, "insurance_note": insurance_note}


def _market_intelligence(zip_code: str, price_score: float) -> dict[str, Any]:
    rng = _rng(zip_code, salt=19)
    zi = _zip_info(zip_code)
    low, high = zi["price_range"]
    base_price = rng.randint(low, high)
    trend_months = []
    dom_months = []
    today = datetime.now()
    price = base_price
    for i in range(24):
        month_ago = 23 - i
        m = (today.month - month_ago - 1) % 12
        y = today.year - ((today.month - month_ago - 1) // 12 + (1 if (today.month - month_ago - 1) < 0 else 0))
        label = f"{MONTH_NAMES[m][:3]} {y}"
        price = int(price * (1 + rng.uniform(-0.01, 0.025)))
        trend_months.append({"month": label, "price": price})
        if i >= 12:
            dom_months.append({"month": label, "days": rng.randint(12, 65)})
    nearby = []
    base_zip = int(zip_code) if zip_code.isdigit() else 10001
    for offset in [-2, -1, 1, 2, 3]:
        nearby.append({"zip": str(base_zip + offset).zfill(5), "price_per_sqft": rng.randint(180, 550)})
    city_yield = round(rng.uniform(4.5, 7.5), 1)
    national_yield = round(rng.uniform(4.0, 6.5), 1)
    this_yield = round(rng.uniform(max(3.5, city_yield - 1.5), city_yield + 2.0), 1)
    employment_growth = round(rng.uniform(-0.5, 4.5), 1)
    gentrification = rng.randint(20, 90)
    summaries = [
        f"Median home prices in {zi['city']} have appreciated {round(rng.uniform(2, 12), 1)}% year-over-year.",
        f"Days on market averaged {rng.randint(18, 55)} days -- {'below' if rng.random() > 0.5 else 'above'} the national average.",
        f"Rental demand remains {'strong' if this_yield > city_yield else 'moderate'} with gross yields of {this_yield}%.",
    ]
    return {"median_price_trend": trend_months, "days_on_market": dom_months, "price_per_sqft": rng.randint(150, 600), "nearby_zips_comparison": nearby, "gentrification_score": gentrification, "employment_growth_pct": employment_growth, "market_summary": summaries, "rental_comparison": {"this_zip": this_yield, "city_avg": city_yield, "national_avg": national_yield}}


def _neighborhood_details(zip_code: str, neighborhood_score: float) -> dict[str, Any]:
    rng = _rng(zip_code, salt=23)
    school = round(rng.uniform(3.0, 9.5), 1)
    crime = rng.randint(10, 85)
    walk = rng.randint(25, 98)
    transit = rng.randint(15, 90)
    bike = rng.randint(10, 85)
    trajectory = rng.choices(["rising", "stable", "declining"], weights=[0.4, 0.4, 0.2])[0]
    return {"school_rating": school, "school_trend": "up" if rng.random() > 0.45 else "down", "crime_index": crime, "crime_trend": "improving" if rng.random() > 0.4 else "worsening", "walk_score": walk, "transit_score": transit, "bike_score": bike, "grocery_stores": rng.randint(2, 20), "hospitals": rng.randint(1, 8), "parks": rng.randint(3, 30), "restaurants": rng.randint(10, 120), "population": rng.randint(15000, 120000), "median_age": rng.randint(28, 52), "median_income": rng.randint(38000, 140000), "trajectory": trajectory}


def _schools_detail(zip_code: str, city: str) -> list[dict[str, Any]]:
    rng = _rng(zip_code, salt=29)
    schools = []
    types = [("Elementary", SCHOOL_SUFFIXES_E), ("Middle", SCHOOL_SUFFIXES_M), ("High", SCHOOL_SUFFIXES_H), ("Elementary", SCHOOL_SUFFIXES_E), ("Middle", SCHOOL_SUFFIXES_M)]
    for i, (grade, suffixes) in enumerate(types):
        prefix = SCHOOL_PREFIXES[rng.randint(0, len(SCHOOL_PREFIXES) - 1)]
        suffix = suffixes[rng.randint(0, len(suffixes) - 1)]
        schools.append({
            "name": f"{prefix} {suffix}",
            "type": "Public",
            "grade": grade,
            "rating": round(rng.uniform(3.5, 9.5), 1),
            "distance_mi": round(rng.uniform(0.2, 2.8), 1),
            "enrollment": rng.randint(280, 1800),
        })
    return sorted(schools, key=lambda s: s["distance_mi"])


def _amenities_detail(zip_code: str) -> list[dict[str, Any]]:
    rng = _rng(zip_code, salt=37)
    amenities = []
    for icon, label in AMENITY_TYPES:
        if "nearby" in label.lower() or "shops" in label.lower() or "centers" in label.lower():
            amenities.append({"icon": icon, "label": label, "value": rng.randint(4, 60), "unit": "nearby"})
        else:
            amenities.append({"icon": icon, "label": label, "value": round(rng.uniform(0.1, 3.5), 1), "unit": "mi"})
    return amenities


def _property_metrics(payload: AnalyzeRequest, scores: dict[str, float], weighted_total: float, aqi_detail: dict) -> dict[str, Any]:
    asking_price = float(payload.asking_price or 0)
    estimated_value = float(payload.estimated_value or 0)
    estimated_rent = float(payload.estimated_rent or 0)
    annual_rent = estimated_rent * 12
    gross_rental_yield = (annual_rent / asking_price * 100) if asking_price else 0.0
    airbnb_factor = max(0.6, float(scores.get("airbnb_score", 50.0)) / 60)
    str_yield = gross_rental_yield * airbnb_factor
    estimated_return = (gross_rental_yield * 0.45 + max(0.0, (estimated_value - asking_price) / asking_price * 100) + weighted_total * 0.03 if asking_price else weighted_total * 0.03)
    return {
        "estimated_annual_return_pct": round(estimated_return, 1),
        "gross_rental_yield_pct": round(gross_rental_yield, 1),
        "str_yield_pct": round(str_yield, 1),
        "ltr_yield_pct": round(gross_rental_yield, 1),
        "aqi_health_category": aqi_detail["category"],
        "pollen_worst_months": [],
    }


def _build_report_text(zip_code: str, overall: float, recommendation: str, scores: dict[str, float]) -> str:
    zi = _zip_info(zip_code)
    strongest = max(scores.items(), key=lambda item: item[1])
    weakest = min(scores.items(), key=lambda item: item[1])
    return (
        f"{zi['city']}, {zi['state']} (ZIP {zip_code}) scores {overall:.1f}/100 with a {recommendation} recommendation. "
        f"The strongest factor is {SCORE_LABELS.get(strongest[0], strongest[0])} at {strongest[1]:.1f}/100. "
        f"The main risk is {SCORE_LABELS.get(weakest[0], weakest[0])} at {weakest[1]:.1f}/100, "
        f"deserving closer review before committing capital. "
        f"Overall, this market suits investors balancing yield with environmental and neighborhood trade-offs. "
        f"Due diligence on local zoning, insurance availability, and STR regulations is advised."
    )


# ── Listings Generator ────────────────────────────────────────────────────────

def _geocode_city_query(query: str) -> tuple[str, str, str]:
    """Resolve a city-name query to (zip_code, city, state) using real geocoding.

    Chain:
      1. Cache (30-day SQLite)
      2. OWM /geo/1.0/direct -- city name + state from our existing API key
      3. Zippopotam.us        -- free ZIP lookup by city+state, no key needed
      4. Absolute last resort: "10001", "New York", "NY"
    Returns (zip_code, city, state).
    """
    from services import cache as _svc_cache
    q = query.strip()

    # 1. Cache
    ck = f"city_geocode:{q.lower()}"
    cached = _svc_cache.get(ck)
    if cached:
        return cached["zip_code"], cached["city"], cached["state"]

    # Parse "City, ST" or "City, State" format
    city_raw, state_raw = q, ""
    if "," in q:
        parts = [p.strip() for p in q.split(",", 1)]
        city_raw = parts[0]
        state_raw = parts[1].strip() if len(parts) > 1 else ""

    city, state, zip_code = city_raw, state_raw, ""

    # 2. OWM /geo/1.0/direct -- resolve city name + get proper state name
    env = dotenv_values(ENV_PATH)
    owm_key = env.get("OPENWEATHER_API_KEY", "")
    if owm_key:
        try:
            owm_q = f"{city_raw},{state_raw},US" if state_raw else f"{city_raw},US"
            resp = requests.get(
                "https://api.openweathermap.org/geo/1.0/direct",
                params={"q": owm_q, "limit": 1, "appid": owm_key},
                timeout=5,
            )
            if resp.status_code == 200:
                results = resp.json()
                if results:
                    d = results[0]
                    city = d.get("name", city_raw)
                    # Strip census-type suffixes that break Zippopotam lookups
                    for suffix in (" CDP", " city", " town", " village", " borough", " township"):
                        if city.lower().endswith(suffix.lower()):
                            city = city[:-len(suffix)].strip()
                            break
                    state_full = d.get("state", state_raw)
                    # Convert full state name to abbreviation
                    state = svc_census._STATE_NAME_TO_ABBR.get(state_full, state_raw)
                    if not state and len(state_full) == 2:
                        state = state_full.upper()
                    log.info("OWM city geocode: '%s' -> %s, %s", q, city, state)
        except Exception as exc:
            log.warning("OWM city geocode failed for '%s': %s", q, exc)

    # 3. Zippopotam.us -- free ZIP lookup by city + state, covers all US cities
    if state:
        try:
            # Zippopotam uses state abbreviation in URL
            st = state if len(state) == 2 else state_raw
            resp = requests.get(
                f"https://api.zippopotam.us/us/{st}/{city}",
                timeout=6,
            )
            if resp.status_code == 200:
                data = resp.json()
                places = data.get("places", [])
                if places:
                    zip_code = places[0].get("post code", "")
                    city = places[0].get("place name", city)
                    log.info("Zippopotam: '%s' -> %s, %s (%s)", q, city, state, zip_code)
        except Exception as exc:
            log.warning("Zippopotam failed for '%s': %s", q, exc)

    # If still no ZIP, try Zippopotam with just the city name (no state filter)
    if not zip_code:
        try:
            resp = requests.get(
                f"https://api.zippopotam.us/us/{city_raw.lower().replace(' ', '-')}",
                timeout=6,
            )
            if resp.status_code == 200:
                data = resp.json()
                places = data.get("places", [])
                if places:
                    zip_code = places[0].get("post code", "")
                    city = places[0].get("place name", city_raw)
                    if not state:
                        state = places[0].get("state abbreviation", "")
                    log.info("Zippopotam (no-state): '%s' -> %s, %s (%s)", q, city, state, zip_code)
        except Exception as exc:
            log.warning("Zippopotam no-state failed for '%s': %s", q, exc)

    # Derive state from ZIP if still missing
    if zip_code and not state:
        state = svc_census._zip3_to_state(zip_code)

    if zip_code and len(zip_code) == 5 and zip_code.isdigit():
        _svc_cache.set(ck, {"zip_code": zip_code, "city": city, "state": state}, ttl_seconds=86_400 * 30)
        return zip_code, city, state

    log.warning("City geocode: all methods failed for '%s'", q)
    return "10001", "New York", "NY"


def _query_to_zip(query: str) -> tuple[str, str]:
    """Return (zip_code, display_name) from a search query.

    Handles:
      - 5-digit ZIP codes directly
      - Any US city/state via real geocoding (Nominatim -> Census)
      - Hardcoded ZIP_DATA fast-path for ~25 major cities
    """
    q = query.strip()

    # Direct ZIP code
    if re.match(r"^\d{5}$", q):
        zi = _zip_info(q)
        return q, f"{zi['city']}, {zi['state']} {q}"

    # Fast path: hardcoded major cities (avoids geocoding API call for common searches)
    # Parse state from query if present ("Portland, ME" -> city="portland", state="me")
    q_lower = q.lower()
    q_city_lower = q_lower.split(",")[0].strip()
    q_state_lower = q_lower.split(",")[1].strip().split()[0] if "," in q_lower else ""

    for prefix, info in ZIP_DATA.items():
        city_lower = info["city"].lower()
        info_state_lower = info["state"].lower()
        nbrs = [n.lower() for n in info["neighborhoods"]]

        # Exact city match (with optional state check to avoid false positives)
        city_matches = (q_city_lower == city_lower or
                        city_lower.startswith(q_city_lower) and len(q_city_lower) >= 5)
        state_ok = (not q_state_lower or
                    q_state_lower == info_state_lower or
                    q_state_lower == info["state"].lower())

        if city_matches and state_ok:
            zip_code = prefix + "01"
            return zip_code, f"{info['city']}, {info['state']}"
        if any(q_city_lower in n for n in nbrs) and state_ok:
            zip_code = prefix + "01"
            return zip_code, f"{info['city']}, {info['state']}"

    # Real geocoding fallback -- handles any US city, neighborhood, or address
    zip_code, city, state = _geocode_city_query(q)
    display = f"{city}, {state}" if state else city
    return zip_code, display


def _generate_listing(rng: random.Random, idx: int, zip_code: str, zi: dict) -> dict[str, Any]:
    """Generate one realistic mock listing."""
    prop_seed = int(zip_code) * 1000 + idx if zip_code.isdigit() else sum(ord(c) for c in zip_code) * 1000 + idx
    neighborhood = zi["neighborhoods"][rng.randint(0, len(zi["neighborhoods"]) - 1)]
    street_num = rng.randint(100, 9999)
    street_name = STREET_PREFIXES[rng.randint(0, len(STREET_PREFIXES) - 1)]
    street_type = STREET_TYPES[rng.randint(0, len(STREET_TYPES) - 1)]
    address = f"{street_num} {street_name} {street_type}"
    full_address = f"{address}, {zi['city']}, {zi['state']} {zip_code}"

    prop_type = PROPERTY_TYPES_LIST[rng.randint(0, len(PROPERTY_TYPES_LIST) - 1)]
    low, high = zi["price_range"]
    price = rng.randint(low, high)
    sqft = rng.randint(800, 3800)
    beds = rng.randint(1, 5)
    baths = rng.choice([1.0, 1.5, 2.0, 2.0, 2.5, 3.0, 3.5, 4.0])
    year_built = rng.randint(1950, 2023)
    price_per_sqft = round(price / sqft)
    estimated_rent = round(price * rng.uniform(0.004, 0.008) / 100) * 100
    estimated_value = round(price * rng.uniform(0.95, 1.12) / 1000) * 1000

    # Mock scores for this property (seeded by address for consistency)
    scores = _mock_scores(zip_code + str(idx))
    total, _ = _compute_weighted_total(scores, DEFAULT_WEIGHTS)
    rec = _recommendation(total)

    # AQI for this ZIP
    aqi_detail = _aqi_detail(zip_code, scores["aqi_score"])

    photo_urls = []   # no stock photos -- real listings use Zillow CDN photos
    lat_jitter = rng.uniform(-0.015, 0.015)
    lon_jitter = rng.uniform(-0.015, 0.015)

    return {
        "id": f"{zip_code}-{idx:03d}",
        "address": address,
        "full_address": full_address,
        "neighborhood": neighborhood,
        "city": zi["city"],
        "state": zi["state"],
        "zip_code": zip_code,
        "price": price,
        "price_per_sqft": price_per_sqft,
        "estimated_value": estimated_value,
        "estimated_rent": estimated_rent,
        "beds": beds,
        "baths": baths,
        "sqft": sqft,
        "year_built": year_built,
        "property_type": prop_type,
        "lat": zi["lat"] + lat_jitter,
        "lon": zi["lon"] + lon_jitter,
        "photo_url": photo_urls[0],
        "photo_urls": photo_urls,
        "monthly_rent": estimated_rent,
        "pollen_level": round(rng.uniform(30, 90), 0),
        "climate_score": scores.get("climate_risk_score", 50.0),
        "propiq_score": round(total, 1),
        "recommendation": rec,
        "aqi_value": aqi_detail["aqi_value"],
        "aqi_category": aqi_detail["category"],
        "scores": scores,
    }


_ZILLOW_CITY_PRICES: dict[tuple, list[dict]] = {}
_ZILLOW_ZIP_MEDIANS: dict[str, int] = {}
_CSV_PRICES_LOADED = False


def _load_zillow_csv_data() -> None:
    global _CSV_PRICES_LOADED, _ZILLOW_CITY_PRICES, _ZILLOW_ZIP_MEDIANS
    if _CSV_PRICES_LOADED:
        return
    _CSV_PRICES_LOADED = True
    import csv as _csv

    price_csv = ROOT / "data" / "zillow_price.csv"
    if price_csv.exists():
        with price_csv.open(newline="", encoding="utf-8") as f:
            for row in _csv.DictReader(f):
                key = (row["city"].lower().strip(), row["state"].lower().strip())
                try:
                    _ZILLOW_CITY_PRICES.setdefault(key, []).append({
                        "price":         int(row["price"]),
                        "sqft":          int(row["sqft"]),
                        "beds":          int(row["beds"]),
                        "baths":         float(row["baths"]),
                        "property_type": row.get("property_type", "Single Family"),
                    })
                except (ValueError, KeyError):
                    pass

    zip_csv = ROOT / "data" / "zillow.csv"
    if zip_csv.exists():
        with zip_csv.open(newline="", encoding="utf-8") as f:
            reader = _csv.DictReader(f)
            date_cols = [c for c in (reader.fieldnames or []) if c != "RegionName"]
            if date_cols:
                latest = sorted(date_cols)[-1]
                for row in reader:
                    zc = str(row["RegionName"]).zfill(5)
                    try:
                        _ZILLOW_ZIP_MEDIANS[zc] = int(float(row[latest]))
                    except (ValueError, TypeError):
                        pass


def _csv_price_pool(city: str, state: str, zip_code: str) -> list[dict]:
    """Return price rows from Zillow Research CSVs for city+state or ZIP median."""
    _load_zillow_csv_data()
    key = (city.lower().strip(), state.lower().strip())
    if _ZILLOW_CITY_PRICES.get(key):
        return _ZILLOW_CITY_PRICES[key]
    median = _ZILLOW_ZIP_MEDIANS.get(zip_code, 0)
    if median > 0:
        rng2 = _rng(zip_code, salt=191)
        return [
            {
                "price":         max(50_000, int(median * rng2.uniform(0.65, 1.40))),
                "sqft":          rng2.randint(800, 2800),
                "beds":          rng2.randint(1, 4),
                "baths":         rng2.choice([1.0, 1.5, 2.0, 2.5, 3.0]),
                "property_type": rng2.choice(["Single Family", "Condo", "Townhouse"]),
            }
            for _ in range(24)
        ]
    return []


def _make_illustrative_listing(rng: random.Random, idx: int, zip_code: str,
                                zi: dict, price_pool: list[dict]) -> dict[str, Any]:
    """One illustrative listing: correct city name, CSV-sourced price."""
    neighborhood = zi["neighborhoods"][rng.randint(0, len(zi["neighborhoods"]) - 1)]
    address      = f"{rng.randint(100, 9999)} {STREET_PREFIXES[rng.randint(0, len(STREET_PREFIXES)-1)]} {STREET_TYPES[rng.randint(0, len(STREET_TYPES)-1)]}"
    full_address = f"{address}, {zi['city']}, {zi['state']} {zip_code}"

    if price_pool:
        row   = price_pool[rng.randint(0, len(price_pool) - 1)]
        price = max(50_000, int(row["price"] * rng.uniform(0.92, 1.08)))
        sqft  = int(row["sqft"])
        beds  = int(row["beds"])
        baths = float(row["baths"])
        prop_type = row.get("property_type", "Single Family")
    else:
        low, high = zi["price_range"]
        price = rng.randint(low, high)
        sqft  = rng.randint(800, 3200)
        beds  = rng.randint(1, 5)
        baths = rng.choice([1.0, 1.5, 2.0, 2.5, 3.0])
        prop_type = PROPERTY_TYPES_LIST[rng.randint(0, len(PROPERTY_TYPES_LIST) - 1)]

    monthly_rent    = round(price * rng.uniform(0.004, 0.007) / 100) * 100
    estimated_value = round(price * rng.uniform(0.95, 1.10) / 1000) * 1000
    scores          = _mock_scores(zip_code + str(idx))
    total, _        = _compute_weighted_total(scores, DEFAULT_WEIGHTS)
    aqi_d           = _aqi_detail(zip_code, float(scores.get("aqi_score", 55)))

    return {
        "id":              f"{zip_code}-{idx:03d}",
        "address":         address,
        "full_address":    full_address,
        "neighborhood":    neighborhood,
        "city":            zi["city"],
        "state":           zi["state"],
        "zip_code":        zip_code,
        "price":           price,
        "price_per_sqft":  round(price / sqft) if sqft else 0,
        "estimated_value": estimated_value,
        "estimated_rent":  monthly_rent,
        "beds":            beds,
        "baths":           baths,
        "sqft":            sqft,
        "year_built":      rng.randint(1950, 2022),
        "property_type":   prop_type,
        "lat":             zi["lat"] + rng.uniform(-0.015, 0.015),
        "lon":             zi["lon"] + rng.uniform(-0.015, 0.015),
        "photo_url":       "",
        "photo_urls":      [],
        "monthly_rent":    monthly_rent,
        "pollen_level":    round(rng.uniform(30, 90), 0),
        "climate_score":   scores.get("climate_risk_score", 50.0),
        "propiq_score":    round(total, 1),
        "recommendation":  _recommendation(total),
        "aqi_value":       aqi_d["aqi_value"],
        "aqi_category":    aqi_d["category"],
        "scores":          scores,
        "source":          "illustrative",
    }


def _get_listings(query: str) -> list[dict[str, Any]]:
    cache_key = query.lower().strip()
    if cache_key in _listings_cache:
        return _listings_cache[cache_key]

    zip_code, display_name = _query_to_zip(query)
    zi = _zip_info(zip_code)
    rng = _rng(cache_key, salt=41)
    count = rng.randint(14, 20)
    listings = [_generate_listing(rng, i, zip_code, zi) for i in range(count)]
    _listings_cache[cache_key] = listings
    return listings


# ── Weather Generator ─────────────────────────────────────────────────────────

def _mock_weather(zip_code: str) -> dict[str, Any]:
    zi = _zip_info(zip_code)
    climate = CLIMATE_PROFILES.get(zi.get("climate", "mid_atlantic"), CLIMATE_PROFILES["mid_atlantic"])
    rng = _rng(zip_code, salt=53)
    month = datetime.now().month
    # seasonal temp adjustment
    season_adj = {1: -25, 2: -20, 3: -8, 4: 5, 5: 12, 6: 20, 7: 25, 8: 22, 9: 15, 10: 5, 11: -8, 12: -20}
    lo, hi = climate["temp_f"]
    mid = (lo + hi) / 2
    temp = int(mid + season_adj.get(month, 0) + rng.uniform(-5, 5))
    temp = max(lo - 5, min(hi + 5, temp))
    feels_like = temp + rng.randint(-5, 5)
    humidity = rng.randint(climate["humidity"][0], climate["humidity"][1])
    wind_mph = rng.randint(3, 22)
    condition = rng.choice(WEATHER_CONDITIONS)
    icon = WEATHER_ICONS.get(condition, "🌤️")

    # 7-day forecast
    forecast = []
    for i in range(7):
        day_temp_hi = temp + rng.randint(-5, 8)
        day_temp_lo = day_temp_hi - rng.randint(8, 18)
        cond = rng.choice(WEATHER_CONDITIONS)
        from datetime import timedelta
        day = date.today() + timedelta(days=i)
        forecast.append({
            "day": day.strftime("%a"),
            "date": day.strftime("%b %d"),
            "hi": day_temp_hi,
            "lo": day_temp_lo,
            "condition": cond,
            "icon": WEATHER_ICONS.get(cond, "🌤️"),
        })

    return {
        "zip_code": zip_code,
        "city": zi["city"],
        "state": zi["state"],
        "temp_f": temp,
        "feels_like_f": feels_like,
        "humidity_pct": humidity,
        "wind_mph": wind_mph,
        "condition": condition,
        "icon": icon,
        "forecast_7day": forecast,
        "annual": {
            "sunny_days": climate["sunny_days"] + rng.randint(-10, 10),
            "rain_inches": climate["rain_in"] + rng.randint(-3, 3),
            "snow_inches": climate["snow_in"] + rng.randint(-2, 2),
            "heat_days": climate["heat_days"] + rng.randint(-5, 5),
        },
        "climate_comfort_score": rng.randint(40, 92),
        "source": "mock",
    }


def _get_weather(zip_code: str, lat: float = 0.0, lon: float = 0.0) -> dict[str, Any]:
    """Get weather: prefer lat/lon (more accurate), fall back to zip, then mock."""
    env = dotenv_values(ENV_PATH)
    api_key = env.get("OPENWEATHER_API_KEY", "")
    if api_key:
        # Use lat/lon directly when we have real coordinates
        if lat and lon:
            result = svc_weather.get_weather_by_coords(lat, lon, api_key)
            if result:
                result["zip_code"] = zip_code  # patch zip in
                return result
        result = svc_weather.get_full_weather(zip_code, api_key)
        if result:
            return result
    return _mock_weather(zip_code)


# ── ZIP Analysis Pipeline ─────────────────────────────────────────────────────

def _initial_state(zip_code: str) -> AgentState:
    """Build the initial AgentState with geocoordinates and API keys pre-loaded."""
    env = dotenv_values(ENV_PATH)

    # Read all API keys once -- agents read from env_keys instead of re-loading .env
    env_keys = {
        "openai":        env.get("OPENAI_API_KEY", ""),
        "airnow":        env.get("AIRNOW_API_KEY", ""),
        "openweather":   env.get("OPENWEATHER_API_KEY", ""),
        "google":        env.get("GOOGLE_MAPS_API_KEY", ""),
        "bls_key":       env.get("BLS_API_KEY", "").strip().rstrip("."),
        "walkscore":     env.get("WALKSCORE_API_KEY", ""),
    }

    # Geocode the ZIP so all agents have real lat/lon
    owm_key = env_keys["openweather"]
    try:
        lat, lon = svc_census.geocode_zip(zip_code, owm_key)
        log.info(f"[InitialState] Geocoded {zip_code} -> ({lat:.4f}, {lon:.4f})")
    except Exception as exc:
        lat, lon = 0.0, 0.0
        log.warning(f"[InitialState] Geocoding failed for {zip_code}: {exc}")

    return {
        "zip_code":          zip_code,
        "lat":               lat,
        "lon":               lon,
        "env_keys":          env_keys,
        "price_score":        None,
        "neighborhood_score": None,
        "rental_yield":       None,
        "forecast_score":     None,
        "aqi_score":          None,
        "pollen_score":       None,
        "airbnb_score":       None,
        "climate_risk_score": None,
        "final_report":       None,
        "messages":           [],
    }


def _run_zip_pipeline(zip_code: str, force_refresh: bool = False) -> dict[str, Any]:
    log.info("=" * 60)
    log.info(f"PIPELINE START -- ZIP: {zip_code}  force_refresh={force_refresh}")
    log.info("=" * 60)

    if not force_refresh and zip_code in _zip_cache:
        log.info(f"PIPELINE CACHE HIT -- returning cached result for {zip_code}")
        return _zip_cache[zip_code]

    try:
        log.info("PIPELINE -- building LangGraph graph...")
        graph = _get_graph()
        log.info(f"PIPELINE -- graph built: {graph}")

        initial = _initial_state(zip_code)
        log.info(f"PIPELINE -- initial state keys: {list(initial.keys())}")

        log.info("PIPELINE -- invoking agent pipeline (this may take 30-60s)...")
        result = graph.invoke(initial)

        log.info("PIPELINE -- graph.invoke() returned successfully")
        log.info(f"PIPELINE -- result keys: {list(result.keys())}")

        scores = {key: round(float(result.get(key) or 0.0), 1) for key in DEFAULT_WEIGHTS}
        log.info(f"PIPELINE SUCCESS -- scores: {scores}")

        report_preview = (result.get("final_report") or "")[:200]
        log.info(f"PIPELINE -- final_report preview: {report_preview!r}")

        msgs = result.get("messages", [])
        log.info(f"PIPELINE -- {len(msgs)} messages in state")
        for i, m in enumerate(msgs):
            role = getattr(m, "type", getattr(m, "role", "?"))
            content_preview = str(getattr(m, "content", m))[:120]
            log.info(f"  msg[{i}] role={role}: {content_preview!r}")

        default_total, _ = _compute_weighted_total(scores, DEFAULT_WEIGHTS)
        report_text = result.get("final_report") or _build_report_text(zip_code, default_total, _recommendation(default_total), scores)
        source = "pipeline"

    except Exception as exc:
        log.error("=" * 60)
        log.error(f"PIPELINE FAILED -- {type(exc).__name__}: {exc}")
        log.error("PIPELINE -- falling back to mock scores", exc_info=True)
        log.error("=" * 60)
        scores = _mock_scores(zip_code)
        default_total, _ = _compute_weighted_total(scores, DEFAULT_WEIGHTS)
        report_text = _build_report_text(zip_code, default_total, _recommendation(default_total), scores)
        source = f"mock (pipeline failed: {type(exc).__name__}: {str(exc)[:100]}"

    log.info(f"PIPELINE DONE -- source={source!r}  total={default_total:.1f}")

    aqi_detail = _aqi_detail(zip_code, float(scores.get("aqi_score", 50.0)))
    zi = _zip_info(zip_code)
    payload = {
        "zip_code": zip_code,
        "city": zi["city"],
        "state": zi["state"],
        "scores": scores,
        "report_text": report_text,
        "recommendation": _recommendation(default_total),
        "weighted_total": default_total,
        "generated_at": datetime.now().isoformat(),
        "source": source,
        "aqi_trend": _mock_aqi_trend(zip_code, float(scores.get("aqi_score", 50.0))),
        "air_quality_detail": aqi_detail,
        "pollen_calendar": _pollen_calendar(zip_code, float(scores.get("pollen_score", 50.0))),
        "climate_details": _climate_details(zip_code, float(scores.get("climate_risk_score", 50.0))),
        "market_intelligence": _market_intelligence(zip_code, float(scores.get("price_score", 50.0))),
        "neighborhood_details": _neighborhood_details(zip_code, float(scores.get("neighborhood_score", 50.0))),
        "schools": _schools_detail(zip_code, zi["city"]),
        "amenities": _amenities_detail(zip_code),
    }
    _zip_cache[zip_code] = payload
    _save_cache()
    return payload


def _parse_zillow_listing(url: str) -> dict[str, Any]:
    req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    html = ""
    try:
        with urlopen(req, timeout=5) as response:
            html = response.read().decode("utf-8", errors="ignore")
    except (URLError, ValueError):
        html = ""
    address_match = re.search(r'"streetAddress":"([^"]+)"', html)
    price_match = re.search(r'"price":\{"value":([0-9]+)', html)
    if address_match or price_match:
        return {"address": address_match.group(1) if address_match else "", "asking_price": float(price_match.group(1)) if price_match else 0, "source": "scraped"}
    slug = url.rstrip("/").split("/")[-1]
    cleaned = re.sub(r"-\d+_zpid", "", slug).replace("-", " ").strip()
    return {"address": cleaned.title(), "asking_price": 0, "source": "parsed-from-url"}


# ── Startup ───────────────────────────────────────────────────────────────────

@app.on_event("startup")
def _startup() -> None:
    _load_cache()


# ── Auth ──────────────────────────────────────────────────────────────────────

@app.post("/api/auth/signup")
def signup(payload: AuthRequest) -> dict[str, Any]:
    if not payload.email or not payload.password:
        raise HTTPException(status_code=400, detail="Email and password required")
    name = payload.name or payload.email.split("@")[0]
    user = {"name": name, "email": payload.email}
    return {"token": _create_token(user), "user": user}


@app.post("/api/auth/login")
def login(payload: AuthRequest) -> dict[str, Any]:
    if not payload.email or not payload.password:
        raise HTTPException(status_code=400, detail="Email and password required")
    name = payload.name or payload.email.split("@")[0]
    user = {"name": name, "email": payload.email}
    return {"token": _create_token(user), "user": user}


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "version": "2.1.0"}


# ── Listings (NEW) ────────────────────────────────────────────────────────────

@app.get("/api/listings/{query}")
def get_listings(query: str) -> dict[str, Any]:
    env           = dotenv_values(ENV_PATH)

    # Resolve real city / state for this query (works for any US ZIP or city name)
    q_clean  = query.strip()
    is_zip   = q_clean.isdigit() and len(q_clean) == 5
    if is_zip:
        zip_code = q_clean
        zi       = _zip_info(zip_code)
        city     = zi["city"]
        state    = zi["state"]
        display_name = f"{city}, {state} {zip_code}"
    else:
        zip_code, display_name = _query_to_zip(q_clean)
        if "," in display_name:
            city  = display_name.split(",")[0].strip()
            state = display_name.split(",")[1].strip().split()[0] if len(display_name.split(",")) > 1 else ""
        else:
            city  = display_name
            state = svc_census._zip3_to_state(zip_code)

    # ── 1) Try RentCast API (real listings) ──────────────────────────────────
    real_listings: list[dict] = []
    try:
        raw_rc = svc_rentcast.get_listings(zip_code, limit=20)
        if raw_rc:
            for item in raw_rc:
                listing = svc_rentcast.map_listing(item)
                # Add Street View photos for real addresses
                full_addr = listing.get("full_address", "")
                listing["photo_url"]  = _pick_photos(full_addr)
                listing["photo_urls"] = _pick_photos(full_addr, listing.get("id",""), 5)

                # Add PropIQ scores
                scores = _mock_scores(zip_code + str(listing.get("id", "")))
                total, _ = _compute_weighted_total(scores, DEFAULT_WEIGHTS)
                aqi_d = _aqi_detail(zip_code, float(scores.get("aqi_score", 55)))
                listing.update({
                    "propiq_score":    round(total, 1),
                    "recommendation":  _recommendation(total),
                    "aqi_value":       aqi_d["aqi_value"],
                    "aqi_category":    aqi_d["category"],
                    "climate_score":   scores.get("climate_risk_score", 50.0),
                    "pollen_level":    round(random.Random(hash(str(listing.get("id","")))).uniform(20, 90), 0),
                    "monthly_rent":    listing.get("monthly_rent") or 0,
                    "scores":          scores,
                    "source":          "rentcast",
                })
                # Fill price from Zillow CSV if missing
                if not listing.get("price"):
                    listing["price"] = int(svc_zillow_csv.get_median_price(zip_code) or 0)
                if not listing.get("city"):  listing["city"]  = city
                if not listing.get("state"): listing["state"] = state
                _assign_photos(listing)
                real_listings.append(listing)
    except Exception as exc:
        log.warning("RentCast fetch failed for '%s': %s", query, exc)

    if real_listings:
        return {
            "query":        query,
            "zip_code":     zip_code,
            "display_name": display_name,
            "city":         city,
            "state":        state,
            "listings":     real_listings,
            "count":        len(real_listings),
            "source":       "rentcast",
            "rate_limited": False,
        }

    # (Zillow API removed — using RentCast + Street View now)

    # ── 3) Fallback: illustrative listings with Street View photos ───────────
    zi_base = _zip_info(zip_code)
    zi_illu = {**zi_base, "city": city, "state": state}
    price_pool   = _csv_price_pool(city, state, zip_code)
    illu_rng     = _rng(zip_code, salt=41)
    illu_count   = 12
    illustrative = [
        _make_illustrative_listing(illu_rng, i, zip_code, zi_illu, price_pool)
        for i in range(illu_count)
    ]
    # Assign photos (Unsplash fallback since Street View API is not yet authorized)
    for listing in illustrative:
        _assign_photos(listing)

    return {
        "query":        query,
        "zip_code":     zip_code,
        "display_name": display_name,
        "city":         city,
        "state":        state,
        "listings":     illustrative,
        "count":        illu_count,
        "source":       "illustrative",
    }


@app.get("/api/property/{property_id}")
def get_property(property_id: str) -> dict[str, Any]:
    """
    property_id is either:
      - "{zip}-{idx:03d}"  (mock-generated)
      - "{zpid}"           (real Zillow zpid -- all-numeric or long string)
    """
    env = dotenv_values(ENV_PATH)
    owm_key       = env.get("OPENWEATHER_API_KEY", "")
    airnow_key    = env.get("AIRNOW_API_KEY", "")
    google_key    = env.get("GOOGLE_MAPS_API_KEY", "")
    walkscore_key = env.get("WALKSCORE_API_KEY", "")
    bls_key       = env.get("BLS_API_KEY", "").strip().rstrip(".")

    # ── Determine if this is a real zpid or mock id ──────────────────────────
    parts = property_id.split("-")
    is_mock = len(parts) >= 2 and parts[0].isdigit() and len(parts[0]) <= 5
    zpid = property_id if not is_mock else None

    # ── Base listing ─────────────────────────────────────────────────────────
    listing: dict = {}

    if not listing:
        # Mock fallback
        if is_mock:
            zip_code = parts[0]
            idx = int(parts[1]) if len(parts) > 1 else 0
        else:
            zip_code = "10001"
            idx = 0
        zi = _zip_info(zip_code)
        rng = _rng(zip_code + str(idx), salt=41)
        listing = _generate_listing(rng, idx, zip_code, zi)

    zip_code = str(listing.get("zip_code") or "10001")
    lat  = listing.get("lat") or 0.0
    lon  = listing.get("lon") or 0.0
    addr = listing.get("address") or listing.get("full_address", "")

    # ── Photos -- only real listing photos; never fall back to stock images ──
    photos = (listing.get("photo_urls") or
              ([listing["photo_url"]] if listing.get("photo_url") else []))

    # ── Weather (real OWM by lat/lon if available, else mock) ────────────────
    weather = _get_weather(zip_code, lat=lat, lon=lon)

    # ── AQI -- real (AirNow + OWM) or mock ───────────────────────────────────
    real_aqi = svc_aqi.get_aqi(zip_code, lat, lon, airnow_key, owm_key)

    # AQI 30-day history
    aqi_trend: list[dict] = []
    if owm_key and lat and lon:
        aqi_trend = svc_weather.get_aqi_history(lat, lon, owm_key, days=30)
    if not aqi_trend:
        scores_for_trend = _mock_scores(zip_code)
        raw_trend = _mock_aqi_trend(zip_code, float(scores_for_trend.get("aqi_score", 55)))
        aqi_trend = [{"day": r["date"][-5:], "aqi": r["aqi"]} for r in raw_trend]

    # ── Pollen -- real Google or mock ─────────────────────────────────────────
    pollen_real = None
    if google_key and lat and lon:
        pollen_real = svc_pollen.get_pollen(lat, lon, google_key)

    if pollen_real:
        pollen_data = {
            "tree":          pollen_real["tree"],
            "grass":         pollen_real["grass"],
            "weed":          pollen_real["weed"],
            "tree_category": pollen_real.get("tree_category", ""),
            "grass_category":pollen_real.get("grass_category", ""),
            "weed_category": pollen_real.get("weed_category", ""),
            "plant_species": pollen_real.get("plant_species", []),
            "monthly_tree":  pollen_real["monthly_tree"],
            "monthly_grass": pollen_real["monthly_grass"],
            "monthly_weed":  pollen_real["monthly_weed"],
            "daily_forecast":pollen_real.get("daily_forecast", []),
            "source":        "google_pollen",
        }
    else:
        scores_p = _mock_scores(zip_code)
        pollen_cal = _pollen_calendar(zip_code, float(scores_p.get("pollen_score", 55)))
        monthly_map = pollen_cal.get("monthly", {})
        rng2 = _rng(zip_code, salt=97)
        mt = [monthly_map.get(m, 0) * rng2.randint(8, 14) for m in MONTHS]
        mg = [monthly_map.get(m, 0) * rng2.randint(6, 11) for m in MONTHS]
        mw = [monthly_map.get(m, 0) * rng2.randint(3, 8)  for m in MONTHS]
        pollen_data = {
            "tree": int(sum(mt) / 12), "grass": int(sum(mg) / 12), "weed": int(sum(mw) / 12),
            "monthly_tree": mt, "monthly_grass": mg, "monthly_weed": mw, "source": "mock",
        }

    # ── FEMA flood (always real -- free API) ──────────────────────────────────
    fema = svc_fema.get_flood_zone(lat, lon) if (lat and lon) else {"flood_zone": "X", "risk": "Low", "source": "mock"}

    # ── Places -- real Google or mock ─────────────────────────────────────────
    places_real = None
    real_schools: list[dict] = []
    real_walk: dict = {}

    if google_key and lat and lon:
        places_real = svc_places.get_nearby_places(lat, lon, google_key)
        real_schools = svc_places.get_schools(lat, lon, google_key) or []

    if walkscore_key and addr and lat and lon:
        real_walk = svc_walkscore.get_walk_scores(addr, lat, lon, walkscore_key) or {}

    # If no Walk Score API key, compute walkability from Google Places data
    if not real_walk and places_real:
        computed = (places_real.get("walk_scores") or
                    svc_places.compute_walk_score(places_real.get("places", {})))
        if computed:
            real_walk = computed

    # ── Schools data ─────────────────────────────────────────────────────────
    zi = _zip_info(zip_code)
    if real_schools:
        schools_data = {
            "schools": [{
                "name":     s.get("name", ""),
                "type":     s.get("type", "Public"),
                "grades":   s.get("grades", "K-12"),
                "rating":   s.get("rating", 0),
                "distance": s.get("distance", 0),
            } for s in real_schools[:6]],
            "district_score": round(_rng(zip_code, salt=103).uniform(50, 95), 0),
            "source": "google_places",
        }
    elif zillow_detail.get("schools"):
        schools_data = {"schools": zillow_detail["schools"], "district_score": 0, "source": "zillow"}
    else:
        mock_schools = _schools_detail(zip_code, zi["city"])
        schools_data = {
            "schools": [{"name": s["name"], "type": s["type"],
                         "grades": "K-5" if s["grade"] == "Elementary" else "6-8" if s["grade"] == "Middle" else "9-12",
                         "rating": s["rating"], "distance": s["distance_mi"]} for s in mock_schools],
            "district_score": round(_rng(zip_code, salt=103).uniform(50, 95), 0),
            "source": "mock",
        }

    # ── Walkability data ──────────────────────────────────────────────────────
    amenities_mock = _amenities_detail(zip_code)
    places_summary = (places_real or {}).get("summary", {})

    if real_walk:
        walk_score   = real_walk.get("walk_score", 60)
        transit_score = real_walk.get("transit_score", 50)
        bike_score   = real_walk.get("bike_score", 45)
        walk_source  = real_walk.get("source", "walkscore")
    elif zillow_detail.get("walk_score"):
        walk_score   = zillow_detail.get("walk_score", 60)
        transit_score = zillow_detail.get("transit_score", 50)
        bike_score   = zillow_detail.get("bike_score", 45)
        walk_source  = "zillow"
    else:
        nd = _neighborhood_details(zip_code, 60.0)
        walk_score   = nd.get("walk_score", 60)
        transit_score = nd.get("transit_score", 50)
        bike_score   = nd.get("bike_score", 45)
        walk_source  = "mock"

    # Amenities: prefer Google Places
    if places_summary:
        amenities_list = [
            {"icon": v["icon"], "type": v["label"], "count": v["count"], "distance": v["nearest"]}
            for v in places_summary.values()
        ]
    else:
        amenities_list = [
            {"icon": a["icon"], "type": a["label"], "count": a["value"], "distance": 1.0}
            for a in amenities_mock[:8]
        ]

    nd = _neighborhood_details(zip_code, 60.0)
    walkability_data = {
        "walk_score":    walk_score,
        "transit_score": transit_score,
        "bike_score":    bike_score,
        "walk_description":    real_walk.get("walk_description", ""),
        "transit_description": real_walk.get("transit_description", ""),
        "bike_description":    real_walk.get("bike_description", ""),
        "crime_index":   nd.get("crime_index", 40),
        "amenities":     amenities_list,
        "source":        walk_source,
    }

    # ── Climate / Flood ───────────────────────────────────────────────────────
    scores_c = _mock_scores(zip_code)
    climate_det = _climate_details(zip_code, float(scores_c.get("climate_risk_score", 55)))

    # Map FEMA zone to a flood score (0–100, higher = worse)
    fema_risk_map = {"Very High": 95, "High": 80, "Moderate": 50, "Low": 20, "Undetermined": 40}
    flood_score = fema_risk_map.get(fema.get("risk", "Low"), 30)

    climate_data = {
        "flood_score":    flood_score,
        "flood_zone":     fema.get("flood_zone", "X"),
        "flood_zone_label": fema.get("label", ""),
        "flood_insurance": fema.get("insurance", "Optional"),
        "sfha":           fema.get("sfha", False),
        "wildfire_score": climate_det["wildfire_risk_score"],
        "wind_score":     climate_det["wind_risk_score"],
        "heat_score":     min(95, climate_det["heat_days_per_year"] * 2),
        "sfha_pct":       round(_rng(zip_code, salt=101).uniform(2, 18), 1),
        "insurance_status": fema.get("insurance", "Optional") + " -- " + climate_det["insurance_note"],
        "fema_source":    fema.get("source", "mock"),
    }

    # ── Employment data -- BLS ─────────────────────────────────────────────────
    employment_data: dict = {}
    if bls_key and zip_code:
        employment_data = svc_bls.get_employment(zip_code, bls_key) or {}

    # ── Market data (mock for now; real from Zillow price history) ────────────
    price_score = float(scores_c.get("price_score", 55.0))
    market_det = _market_intelligence(zip_code, price_score)

    # Prefer Zillow real price history if available
    if zillow_detail.get("price_history"):
        price_history = [{"month": ph["date"][:7], "price": ph["price"]}
                         for ph in zillow_detail["price_history"] if ph.get("price")]
    else:
        price_history = [{"month": r["month"], "price": r["price"]} for r in market_det.get("median_price_trend", [])]

    nearby_zips = [{"zip": z["zip"], "price_per_sqft": z["price_per_sqft"]}
                   for z in market_det.get("nearby_zips_comparison", [])]

    market_data = {
        "price_history": price_history,
        "dom_history":   [{"month": r["month"], "days": r["days"]} for r in market_det.get("days_on_market", [])],
        "nearby_zips":   nearby_zips,
        "metrics": {
            "median_price":   price_history[-1]["price"] if price_history else 0,
            "price_per_sqft": market_det.get("price_per_sqft", 0),
            "dom":            market_det.get("days_on_market", [{}])[-1].get("days", 0) if market_det.get("days_on_market") else 0,
            "rental_yield":   market_det.get("rental_comparison", {}).get("this_zip", 0),
            "hoa_fee":        zillow_detail.get("hoa_fee", 0) or listing.get("hoa_fee", 0),
            "tax_annual":     zillow_detail.get("tax_annual_amount", 0),
            "zestimate":      zillow_detail.get("zestimate", 0) or listing.get("estimated_value", 0),
            "rent_zestimate": zillow_detail.get("rent_zestimate", 0) or listing.get("monthly_rent", 0),
        },
        "listing_url":  zillow_detail.get("listing_url", ""),
        "description":  zillow_detail.get("description", ""),
        "employment":   employment_data,
    }

    return {
        "listing":         listing,
        "photos":          photos,
        "zillow_detail":   {k: v for k, v in zillow_detail.items() if k not in ("photo_urls",)} if zillow_detail else {},
        "aqi_data": {
            "aqi_value":     real_aqi.get("aqi_value", 50),
            "category":      real_aqi.get("category", "Moderate"),
            "health_recommendation": real_aqi.get("health_recommendation", ""),
            "pollutants":    real_aqi.get("pollutants", {}),
            "national_avg":  65,
            "trend":         aqi_trend,
            "sources":       real_aqi.get("sources", ["mock"]),
        },
        "pollen_data":     pollen_data,
        "climate_data":    climate_data,
        "schools_data":    schools_data,
        "walkability_data":walkability_data,
        "market_data":     market_data,
        "weather":         weather,
    }


# ── Weather (NEW) ─────────────────────────────────────────────────────────────

@app.get("/api/weather/{zip_code}")
def get_weather_endpoint(zip_code: str, lat: float = 0.0, lon: float = 0.0) -> dict[str, Any]:
    return _get_weather(zip_code, lat=lat, lon=lon)


# ── Geocode (NEW) ─────────────────────────────────────────────────────────────

@app.get("/api/geocode/{query}")
def geocode(query: str) -> dict[str, Any]:
    zip_code, display_name = _query_to_zip(query)
    zi = _zip_info(zip_code)
    return {"zip_code": zip_code, "display_name": display_name, "city": zi["city"], "state": zi["state"], "lat": zi["lat"], "lon": zi["lon"]}


# ── ZIP Analysis ──────────────────────────────────────────────────────────────

@app.get("/api/zip/{zip_code}")
def get_zip(zip_code: str) -> dict[str, Any]:
    if zip_code in _zip_cache:
        return _zip_cache[zip_code]
    return _run_zip_pipeline(zip_code, force_refresh=False)


@app.post("/api/analyze")
def analyze(
    payload: AnalyzeRequest,
    db: Session = Depends(get_db),
    user: dict | None = Depends(get_optional_user),
) -> dict[str, Any]:
    zip_payload = _run_zip_pipeline(payload.zip_code, force_refresh=payload.force_refresh)
    weighted_total, score_rows = _compute_weighted_total(zip_payload["scores"], payload.weights)
    recommendation = _recommendation(weighted_total)
    aqi_detail = zip_payload.get("air_quality_detail", _aqi_detail(payload.zip_code, zip_payload["scores"].get("aqi_score", 50.0)))
    metrics = _property_metrics(payload, zip_payload["scores"], weighted_total, aqi_detail)
    pollen_cal = zip_payload.get("pollen_calendar", {})
    metrics["pollen_worst_months"] = pollen_cal.get("worst_months", [])
    zi = _zip_info(payload.zip_code)

    result: dict[str, Any] = {
        "zip_code": payload.zip_code,
        "city": zi["city"],
        "state": zi["state"],
        "address": payload.address,
        "scores": zip_payload["scores"],
        "score_rows": score_rows,
        "weighted_total": weighted_total,
        "recommendation": recommendation,
        "report_text": zip_payload["report_text"],
        "metrics": metrics,
        "generated_at": datetime.now().isoformat(),
        "aqi_trend": zip_payload.get("aqi_trend", []),
        "air_quality_detail": aqi_detail,
        "pollen_calendar": pollen_cal,
        "climate_details": zip_payload.get("climate_details", {}),
        "market_intelligence": zip_payload.get("market_intelligence", {}),
        "neighborhood_details": zip_payload.get("neighborhood_details", {}),
        "schools": zip_payload.get("schools", []),
        "amenities": zip_payload.get("amenities", []),
    }

    if user:
        record = AnalysisRecord(
            id=str(uuid.uuid4()),
            user_email=user["email"],
            zip_code=payload.zip_code,
            address=payload.address or f"ZIP {payload.zip_code}",
            date=result["generated_at"],
            overall_score=weighted_total,
            recommendation=recommendation,
            data_json=json.dumps(result),
        )
        db.add(record)
        db.commit()

    return result


# ── Agent Pipeline SSE Stream ──────────────────────────────────────────────────

@app.get("/api/analyze/stream/{zip_code}")
async def analyze_stream(zip_code: str):
    """SSE endpoint that runs each agent sequentially and emits progress events."""
    from agents.price_agent        import price_agent        as _pa
    from agents.neighborhood_agent import neighborhood_agent as _na
    from agents.rental_agent       import rental_agent       as _ra
    from agents.forecast_agent     import forecast_agent     as _fa
    from agents.aqi_agent          import aqi_agent          as _aqa
    from agents.pollen_agent       import pollen_agent       as _pla
    from agents.climate_agent      import climate_agent      as _ca
    from agents.airbnb_agent       import airbnb_agent       as _aba
    from agents.coordinator        import coordinator_agent  as _coa

    _STREAM_AGENTS = [
        ("price",        "Price Agent",        "Reading Zillow price history...",      _pa,  "price_score"),
        ("neighborhood", "Neighborhood Agent", "Querying Google Places & Census...",   _na,  "neighborhood_score"),
        ("rental",       "Rental Agent",       "Calculating gross rental yield...",    _ra,  "rental_yield"),
        ("forecast",     "Forecast Agent",     "Running ML regression model...",       _fa,  "forecast_score"),
        ("aqi",          "AQI Agent",          "Reading EPA AirNow data...",           _aqa, "aqi_score"),
        ("pollen",       "Pollen Agent",       "Reading Google Pollen API...",         _pla, "pollen_score"),
        ("climate",      "Climate Agent",      "Analyzing FEMA flood data...",         _ca,  "climate_risk_score"),
        ("airbnb",       "Airbnb Agent",       "Comparing STR vs LTR yield...",        _aba, "airbnb_score"),
        ("coordinator",  "Coordinator (GPT)",  "GPT-4o-mini writing report...",        _coa, "final_report"),
    ]

    async def generate():
        state = _initial_state(zip_code)
        loop  = asyncio.get_running_loop()

        for key, name, message, func, score_key in _STREAM_AGENTS:
            yield f"data: {json.dumps({'event': 'agent_start', 'agent': key, 'name': name, 'message': message})}\n\n"
            t0 = time.time()
            try:
                state = await loop.run_in_executor(None, func, state)
                dur   = round((time.time() - t0) * 1000)
                score = None
                if score_key != "final_report":
                    v = state.get(score_key)
                    score = round(float(v), 1) if v is not None else 0.0
                yield f"data: {json.dumps({'event': 'agent_complete', 'agent': key, 'name': name, 'score': score, 'duration_ms': dur})}\n\n"
            except Exception as exc:
                dur = round((time.time() - t0) * 1000)
                yield f"data: {json.dumps({'event': 'agent_error', 'agent': key, 'error': str(exc), 'duration_ms': dur})}\n\n"

        # Build the full analysis payload for the frontend
        scores = {k: round(float(state.get(k) or 0.0), 1) for k in DEFAULT_WEIGHTS}
        total, rows = _compute_weighted_total(scores, DEFAULT_WEIGHTS)
        rec    = _recommendation(total)
        zi     = _zip_info(zip_code)
        report = state.get("final_report") or _build_report_text(zip_code, total, rec, scores)

        analysis = {
            "zip_code":             zip_code,
            "city":                 zi["city"],
            "state":                zi["state"],
            "scores":               scores,
            "score_rows":           rows,
            "weighted_total":       total,
            "recommendation":       rec,
            "report_text":          report,
            "generated_at":         datetime.now().isoformat(),
            "air_quality_detail":   _aqi_detail(zip_code, float(scores.get("aqi_score", 50.0))),
            "pollen_calendar":      _pollen_calendar(zip_code, float(scores.get("pollen_score", 50.0))),
            "climate_details":      _climate_details(zip_code, float(scores.get("climate_risk_score", 50.0))),
            "market_intelligence":  _market_intelligence(zip_code, float(scores.get("price_score", 50.0))),
            "neighborhood_details": _neighborhood_details(zip_code, float(scores.get("neighborhood_score", 50.0))),
            "aqi_trend":            _mock_aqi_trend(zip_code, float(scores.get("aqi_score", 50.0))),
            "metrics":              {},
        }
        yield f"data: {json.dumps({'event': 'pipeline_complete', 'analysis': analysis})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── Analyses CRUD ─────────────────────────────────────────────────────────────

@app.get("/api/analyses")
def list_analyses(user: dict = Depends(get_current_user), db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    records = db.query(AnalysisRecord).filter(AnalysisRecord.user_email == user["email"]).order_by(AnalysisRecord.date.desc()).all()
    return [{"id": r.id, "address": r.address, "zip_code": r.zip_code, "date": r.date, "overall_score": r.overall_score, "recommendation": r.recommendation, "data": json.loads(r.data_json) if r.data_json else {}} for r in records]


@app.delete("/api/analyses/{record_id}")
def delete_analysis(record_id: str, user: dict = Depends(get_current_user), db: Session = Depends(get_db)) -> dict[str, str]:
    record = db.query(AnalysisRecord).filter(AnalysisRecord.id == record_id, AnalysisRecord.user_email == user["email"]).first()
    if not record:
        raise HTTPException(status_code=404, detail="Analysis not found")
    db.delete(record)
    db.commit()
    return {"status": "deleted"}


# ── PDF ───────────────────────────────────────────────────────────────────────

@app.post("/api/pdf")
def generate_pdf(payload: PdfRequest) -> StreamingResponse:
    pdf_bytes = build_pdf_report(
        property_details=payload.property_details,
        score_rows=payload.scores.get("score_rows", []),
        report_text=payload.report_text,
        recommendation=payload.recommendation,
        weighted_total=payload.weighted_total,
        user_name=payload.user_name,
        generated_at=payload.property_details.get("generated_at"),
    )
    return StreamingResponse(iter([pdf_bytes]), media_type="application/pdf", headers={"Content-Disposition": "attachment; filename=PropIQ-Report.pdf"})


# ── Settings / Keys ───────────────────────────────────────────────────────────

@app.post("/api/settings/keys")
@app.post("/api/account/keys")
def save_keys(payload: EnvKeysRequest) -> dict[str, str]:
    mapping = {
        "OPENAI_API_KEY":      payload.openai_key,
        "AIRNOW_API_KEY":      payload.airnow_key,
        "OPENWEATHER_API_KEY": payload.openweather_key,
        "GOOGLE_MAPS_API_KEY": payload.google_maps_key,
        "WALKSCORE_API_KEY":   payload.walkscore_key,
        "BLS_API_KEY":         payload.bls_key,
    }
    for env_name, value in mapping.items():
        if value is not None:
            set_key(str(ENV_PATH), env_name, value)
    return {"status": "saved"}


@app.get("/api/settings/keys")
@app.get("/api/account/keys")
def get_keys() -> dict[str, str]:
    values = dotenv_values(ENV_PATH)
    return {
        "openai_key":      values.get("OPENAI_API_KEY", ""),
        "airnow_key":      values.get("AIRNOW_API_KEY", ""),
        "openweather_key": values.get("OPENWEATHER_API_KEY", ""),
        "google_maps_key": values.get("GOOGLE_MAPS_API_KEY", ""),
        "walkscore_key":   values.get("WALKSCORE_API_KEY", ""),
        "bls_key":         values.get("BLS_API_KEY", ""),
    }


@app.post("/api/zillow/parse")
def parse_zillow_url(payload: ZillowUrlRequest) -> dict[str, Any]:
    if "zillow.com" not in payload.url:
        raise HTTPException(status_code=400, detail="Please provide a Zillow URL.")
    return _parse_zillow_listing(payload.url)
