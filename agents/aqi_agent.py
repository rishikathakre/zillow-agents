"""
aqi_agent.py — Air quality score (0-100).

Loads data/aqi.csv (columns: zip_code, aqi_value, pm25, ozone).
Score = 100 - min(aqi_value, 100), so a perfect AQI of 0 → score 100,
and AQI ≥ 100 → score 0.

Stores the result in state["aqi_score"].
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from state import AgentState

DATA_DIR = Path(__file__).parent.parent / "data"
AQI_CSV  = DATA_DIR / "aqi.csv"


def aqi_agent(state: AgentState) -> AgentState:
    """
    LangGraph node: populates state["aqi_score"].

    Expected CSV schema
    -------------------
    aqi.csv : zip_code (str), aqi_value (float), pm25 (float), ozone (float)
    """
    zip_code = state.get("zip_code", "")
    print(f"\n[AQIAgent] Calculating air quality score for ZIP: {zip_code}")

    try:
        df = pd.read_csv(AQI_CSV, dtype={"zip_code": str})

        row = df[df["zip_code"] == str(zip_code)]
        if row.empty:
            print(f"[AQIAgent] No AQI data found for ZIP {zip_code}.")
            return {**state, "aqi_score": None}

        aqi_value = pd.to_numeric(row["aqi_value"].values[0], errors="coerce")
        if pd.isna(aqi_value):
            print("[AQIAgent] aqi_value is missing or non-numeric.")
            return {**state, "aqi_score": None}

        score = 100.0 - min(float(aqi_value), 100.0)
        score = max(0.0, min(100.0, score))

        print(f"[AQIAgent] aqi_value={aqi_value:.1f}  score={score:.1f}")
        return {**state, "aqi_score": round(score, 2)}

    except FileNotFoundError:
        print(f"[AQIAgent] CSV not found: {AQI_CSV} — returning neutral score 50.0")
        return {**state, "aqi_score": 50.0}
    except Exception as exc:
        print(f"[AQIAgent] Unexpected error: {exc}")
        return {**state, "aqi_score": None}
