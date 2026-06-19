"""
state.py -- Shared AgentState for the PropIQ multi-agent pipeline.

All agents read from and write to this state as it flows through the LangGraph.
Each field is populated by a dedicated specialist agent; the coordinator_agent
reads all scored fields to produce the final_report.
"""

from __future__ import annotations

from typing import Optional
from typing_extensions import TypedDict


class AgentState(TypedDict):
    # ── Input ──────────────────────────────────────────────────────────────────
    zip_code: str
    lat:      float          # geocoded latitude  (0.0 = unknown)
    lon:      float          # geocoded longitude (0.0 = unknown)
    env_keys: dict           # API keys: openai, airnow, openweather, google,
                             #           rapidapi_key, rapidapi_host

    # ── Specialist agent outputs (0-100 scale) ─────────────────────────────────
    price_score:        Optional[float]   # price momentum + affordability
    neighborhood_score: Optional[float]   # schools + safety + walkability
    rental_yield:       Optional[float]   # gross annual rental yield score
    forecast_score:     Optional[float]   # projected 12-month appreciation
    aqi_score:          Optional[float]   # air quality (higher = cleaner)
    pollen_score:       Optional[float]   # allergen burden (higher = less pollen)
    airbnb_score:       Optional[float]   # short-term rental viability
    climate_risk_score: Optional[float]   # flood + climate risk (higher = safer)

    # ── Final output ───────────────────────────────────────────────────────────
    final_report: Optional[str]

    # ── Message history ────────────────────────────────────────────────────────
    messages: list
