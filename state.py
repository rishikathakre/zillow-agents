"""
state.py — Shared AgentState for the Zillow multi-agent pipeline.

All agents read from and write to this state as it flows through the LangGraph.
Each field is populated by a dedicated specialist agent; the coordinator_agent
reads all scored fields to produce the final_report.
"""

from __future__ import annotations

from typing import Optional
from typing_extensions import TypedDict


class AgentState(TypedDict):
    """
    Shared state that travels through every node in the LangGraph pipeline.

    Fields
    ------
    zip_code : str
        Target ZIP code to analyse (e.g. "90210").  Provided by the user at
        the start of the run and used by every agent to scope its data query.

    price_score : Optional[float]
        0–10 score produced by price_agent reflecting how favourable current
        property prices are for an investor (higher = better value / more
        upside potential).

    neighborhood_score : Optional[float]
        0–10 score produced by neighborhood_agent summarising quality-of-life
        indicators such as school ratings, crime rates, walkability, and
        amenity density.

    rental_yield : Optional[float]
        Gross annual rental yield (%) produced by rental_agent, calculated as
        (annual rent / property price) × 100.

    forecast_score : Optional[float]
        0–10 score produced by forecast_agent representing expected price
        appreciation over the next 12–24 months based on historical trends and
        market signals.

    aqi_score : Optional[float]
        0–10 air-quality score produced by neighborhood_agent (or a dedicated
        env agent); derived from EPA AQI data — higher means cleaner air.

    pollen_score : Optional[float]
        0–10 pollen / allergen score; higher means lower pollen burden,
        indicating a more comfortable environment for residents.

    airbnb_score : Optional[float]
        0–10 short-term rental viability score produced by rental_agent,
        reflecting Airbnb occupancy rates and average nightly rates in the area.

    climate_risk_score : Optional[float]
        0–10 climate-risk score (higher = lower risk) produced by
        forecast_agent, aggregating flood, wildfire, hurricane, and extreme-
        heat risk indices for the ZIP code.

    final_report : Optional[str]
        Narrative investment report synthesised by coordinator_agent from all
        the scored fields above.  None until the coordinator node runs.

    messages : list
        Accumulated LangChain message history (HumanMessage / AIMessage
        objects) used by agents that maintain conversational context or
        tool-call traces.
    """

    # ── Input ──────────────────────────────────────────────────────────────────
    zip_code: str

    # ── Specialist agent outputs ───────────────────────────────────────────────
    price_score:        Optional[float]
    neighborhood_score: Optional[float]
    rental_yield:       Optional[float]
    forecast_score:     Optional[float]
    aqi_score:          Optional[float]
    pollen_score:       Optional[float]
    airbnb_score:       Optional[float]
    climate_risk_score: Optional[float]

    # ── Final output ───────────────────────────────────────────────────────────
    final_report: Optional[str]

    # ── Message history ────────────────────────────────────────────────────────
    messages: list
