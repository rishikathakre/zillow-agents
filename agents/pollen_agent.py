"""
pollen_agent.py — Pollen / allergen comfort score (0-100).

Loads data/pollen.csv (columns: zip_code, tree_pollen, grass_pollen, weed_pollen).
Raw pollen values are in grains/m³ (standard NAB scale).
Approximate NAB severity bands (tree/grass):
    0–14    Low
    15–89   Moderate
    90–499  High
    500+    Very High

Steps:
  1. Average the three pollen values into raw_avg.
  2. Normalise: raw_pollen_score = raw_avg / 500 * 100  (0 = clean, 100 = 500+ grains/m³)
  3. Invert: score = 100 - raw_pollen_score  (higher score = lower pollen burden)

Stores the result in state["pollen_score"].
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from state import AgentState

DATA_DIR   = Path(__file__).parent.parent / "data"
POLLEN_CSV = DATA_DIR / "pollen.csv"

# Normalisation ceiling in grains/m³ (NAB scale: 500+ = Very High)
_MAX_RAW = 500.0


def pollen_agent(state: AgentState) -> AgentState:
    """
    LangGraph node: populates state["pollen_score"].

    Expected CSV schema
    -------------------
    pollen.csv : zip_code (str), tree_pollen (float), grass_pollen (float),
                 weed_pollen (float)
    """
    zip_code = state.get("zip_code", "")
    print(f"\n[PollenAgent] Calculating pollen score for ZIP: {zip_code}")

    try:
        df = pd.read_csv(POLLEN_CSV, dtype={"zip_code": str})

        row = df[df["zip_code"] == str(zip_code)]
        if row.empty:
            print(f"[PollenAgent] No pollen data found for ZIP {zip_code}.")
            return {**state, "pollen_score": None}

        tree  = pd.to_numeric(row["tree_pollen"].values[0],  errors="coerce")
        grass = pd.to_numeric(row["grass_pollen"].values[0], errors="coerce")
        weed  = pd.to_numeric(row["weed_pollen"].values[0],  errors="coerce")

        values = [v for v in [tree, grass, weed] if not pd.isna(v)]
        if not values:
            print("[PollenAgent] All pollen values are missing.")
            return {**state, "pollen_score": None}

        raw_avg           = sum(values) / len(values)
        raw_pollen_score  = min(raw_avg / _MAX_RAW * 100, 100.0)
        score             = max(0.0, 100.0 - raw_pollen_score)

        print(
            f"[PollenAgent] tree={tree}  grass={grass}  weed={weed}  "
            f"avg={raw_avg:.2f}  score={score:.1f}"
        )
        return {**state, "pollen_score": round(score, 2)}

    except FileNotFoundError:
        print(f"[PollenAgent] CSV not found: {POLLEN_CSV} — returning neutral score 50.0")
        return {**state, "pollen_score": 50.0}
    except Exception as exc:
        print(f"[PollenAgent] Unexpected error: {exc}")
        return {**state, "pollen_score": None}
