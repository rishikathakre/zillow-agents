"""
neighborhood_agent.py — Weighted neighbourhood quality score (0-100).

Merges data/schools.csv, data/crime.csv, and data/walkability.csv on zip_code,
then computes:
    score = 0.40 * school_score + 0.30 * safety_score + 0.30 * walk_score

where school_score and walk_score are already 0-100, and
safety_score = 100 - crime_index  (so lower crime → higher score).

Stores the result in state["neighborhood_score"].
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from state import AgentState

DATA_DIR       = Path(__file__).parent.parent / "data"
SCHOOLS_CSV    = DATA_DIR / "schools.csv"
CRIME_CSV      = DATA_DIR / "crime.csv"
WALKABILITY_CSV = DATA_DIR / "walkability.csv"


def neighborhood_agent(state: AgentState) -> AgentState:
    """
    LangGraph node: populates state["neighborhood_score"].

    Expected CSV schemas
    --------------------
    schools.csv    : zip_code, school_score   (0-100)
    crime.csv      : zip_code, crime_index    (0-100, higher = more crime)
    walkability.csv: zip_code, walk_score     (0-100)
    """
    zip_code = state.get("zip_code", "")
    print(f"\n[NeighborhoodAgent] Calculating neighbourhood score for ZIP: {zip_code}")

    try:
        schools_df    = pd.read_csv(SCHOOLS_CSV,    dtype={"zip_code": str})
        crime_df      = pd.read_csv(CRIME_CSV,      dtype={"zip_code": str})
        walkability_df = pd.read_csv(WALKABILITY_CSV, dtype={"zip_code": str})

        # Merge all three on zip_code
        merged = (
            schools_df
            .merge(crime_df,       on="zip_code", how="outer")
            .merge(walkability_df, on="zip_code", how="outer")
        )

        row = merged[merged["zip_code"] == str(zip_code)]
        if row.empty:
            print(f"[NeighborhoodAgent] No data found for ZIP {zip_code}.")
            return {**state, "neighborhood_score": None}

        school_score = pd.to_numeric(row["school_score"].values[0],  errors="coerce")
        crime_index  = pd.to_numeric(row["crime_index"].values[0],   errors="coerce")
        walk_score   = pd.to_numeric(row["walk_score"].values[0],    errors="coerce")

        missing = [
            name for name, val in [
                ("school_score", school_score),
                ("crime_index",  crime_index),
                ("walk_score",   walk_score),
            ]
            if pd.isna(val)
        ]
        if missing:
            print(f"[NeighborhoodAgent] Missing fields: {missing}. Skipping.")
            return {**state, "neighborhood_score": None}

        safety_score = 100.0 - float(crime_index)
        score = (
            0.40 * float(school_score)
            + 0.30 * safety_score
            + 0.30 * float(walk_score)
        )
        score = max(0.0, min(100.0, score))

        print(
            f"[NeighborhoodAgent] school={school_score:.1f}  "
            f"safety={safety_score:.1f}  walk={walk_score:.1f}  "
            f"-> score={score:.1f}"
        )
        return {**state, "neighborhood_score": round(score, 2)}

    except FileNotFoundError as exc:
        print(f"[NeighborhoodAgent] CSV not found: {exc.filename} — returning neutral score 50.0")
        return {**state, "neighborhood_score": 50.0}
    except Exception as exc:
        print(f"[NeighborhoodAgent] Unexpected error: {exc}")
        return {**state, "neighborhood_score": None}
