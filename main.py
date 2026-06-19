"""
main.py -- Entry point for the Zillow multi-agent investment analysis system.

Usage
-----
    python main.py            # analyses ZIP 10001 (default)
    python main.py 90210      # analyses any ZIP code
"""

from __future__ import annotations

import sys
from pathlib import Path

from dotenv import load_dotenv, dotenv_values

ENV_PATH = Path(__file__).parent / ".env"
load_dotenv(ENV_PATH)

from langgraph.graph import END, StateGraph

from agents.price_agent        import price_agent
from agents.neighborhood_agent import neighborhood_agent
from agents.rental_agent       import rental_agent
from agents.forecast_agent     import forecast_agent
from agents.aqi_agent          import aqi_agent
from agents.pollen_agent       import pollen_agent
from agents.climate_agent      import climate_agent
from agents.airbnb_agent       import airbnb_agent
from agents.coordinator        import coordinator_agent
from services import census as svc_census
from state import AgentState

BANNER = """
+--------------------------------------------------------------+
|          ZILLOW MULTI-AGENT INVESTMENT ANALYSER              |
|  Price | Neighbourhood | Rental | Forecast | AQI | Pollen   |
|  Climate | Airbnb | Coordinator                              |
+--------------------------------------------------------------+
"""

DEFAULT_ZIP = "10001"


def build_graph() -> StateGraph:
    """Construct and compile the 8-node LangGraph pipeline."""
    g = StateGraph(AgentState)

    g.add_node("price",        price_agent)
    g.add_node("neighborhood", neighborhood_agent)
    g.add_node("rental",       rental_agent)
    g.add_node("forecast",     forecast_agent)
    g.add_node("aqi",          aqi_agent)
    g.add_node("pollen",       pollen_agent)
    g.add_node("climate",      climate_agent)
    g.add_node("airbnb",       airbnb_agent)
    g.add_node("coordinator",  coordinator_agent)

    g.set_entry_point("price")
    g.add_edge("price",        "neighborhood")
    g.add_edge("neighborhood", "rental")
    g.add_edge("rental",       "forecast")
    g.add_edge("forecast",     "aqi")
    g.add_edge("aqi",          "pollen")
    g.add_edge("pollen",       "climate")
    g.add_edge("climate",      "airbnb")
    g.add_edge("airbnb",       "coordinator")
    g.add_edge("coordinator",  END)

    return g.compile()


def main() -> None:
    zip_code = sys.argv[1].strip() if len(sys.argv) >= 2 else DEFAULT_ZIP

    print(BANNER)
    print(f"Analysing ZIP code: {zip_code}\n")

    # Load API keys
    env = dotenv_values(ENV_PATH)
    env_keys = {
        "openai":        env.get("OPENAI_API_KEY", ""),
        "airnow":        env.get("AIRNOW_API_KEY", ""),
        "openweather":   env.get("OPENWEATHER_API_KEY", ""),
        "google":        env.get("GOOGLE_MAPS_API_KEY", ""),
        "rapidapi_key":  env.get("RAPIDAPI_KEY", ""),
        "rapidapi_host": env.get("RAPIDAPI_HOST", "zillow-property-data.p.rapidapi.com"),
        "bls_key":       env.get("BLS_API_KEY", "").strip().rstrip("."),
        "walkscore":     env.get("WALKSCORE_API_KEY", ""),
    }

    # Geocode the ZIP
    try:
        lat, lon = svc_census.geocode_zip(zip_code, env_keys["openweather"])
        print(f"Geocoded {zip_code} -> ({lat:.4f}, {lon:.4f})")
    except Exception as exc:
        lat, lon = 0.0, 0.0
        print(f"Geocoding failed for {zip_code}: {exc}")

    initial_state: AgentState = {
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

    app          = build_graph()
    final_state  = app.invoke(initial_state)

    print("\n" + "=" * 60)
    print("PIPELINE COMPLETE")
    print("=" * 60)

    report = final_state.get("final_report")
    if report:
        print(report)
    else:
        print("No report generated -- check that your CSV files are in data/")


if __name__ == "__main__":
    main()
