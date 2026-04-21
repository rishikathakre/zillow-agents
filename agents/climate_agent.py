"""
climate_agent.py — Climate and flood risk score (0-100).

Loads data/climate.csv and computes a composite risk score from four
FEMA/climate data sources:

  sfha_pct     (float) — % of ZIP's land area designated FEMA Special Flood
                          Hazard Area (1% annual-chance flood, Zones A/AE/V/VE)
                          Source: FEMA National Flood Hazard Layer (NFHL)

  claim_rate   (float) — Average annual NFIP insurance claims per 1,000
                          residential properties (5-year rolling mean)
                          Source: FEMA NFIP Policy/Claims Statistics

  wildfire_risk (float) — 0-100 index of wildland-urban interface fire hazard
                           (0 = negligible, 100 = extreme)
                           Source: USFS Wildfire Hazard Potential dataset

  heat_risk    (float) — 0-100 index of extreme heat burden
                          (normalized annual days with heat index > 95°F)
                          Source: NOAA NCEI daily climate normals

Scoring formula
---------------
  flood_score    = max(0, 100 - sfha_pct * 2)   # 0% SFHA -> 100; >=50% -> 0
  claims_score   = max(0, 100 - claim_rate * 4)  # 0/1k  -> 100; >=25/1k -> 0
  wildfire_score = 100 - wildfire_risk
  heat_score     = 100 - heat_risk

  climate_risk_score = (
      0.40 * flood_score
    + 0.25 * claims_score
    + 0.20 * wildfire_score
    + 0.15 * heat_score
  )

Higher score = lower overall climate/disaster risk = more favourable for
long-term investment.

Stores the result in state["climate_risk_score"].
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from state import AgentState

DATA_DIR    = Path(__file__).parent.parent / "data"
CLIMATE_CSV = DATA_DIR / "climate.csv"

# Sub-score weights (must sum to 1.0)
_W_FLOOD    = 0.40
_W_CLAIMS   = 0.25
_W_WILDFIRE = 0.20
_W_HEAT     = 0.15


def _flood_score(sfha_pct: float) -> float:
    """0% SFHA -> 100 (safe); 50%+ SFHA -> 0 (extreme risk)."""
    return max(0.0, 100.0 - sfha_pct * 2.0)


def _claims_score(claim_rate: float) -> float:
    """0 claims/1k -> 100; 25+/1k -> 0."""
    return max(0.0, 100.0 - claim_rate * 4.0)


def climate_agent(state: AgentState) -> AgentState:
    """
    LangGraph node: populates state["climate_risk_score"].

    Expected CSV schema
    -------------------
    climate.csv : zip_code (str),
                  sfha_pct (float 0-100),
                  claim_rate (float, NFIP claims per 1k properties),
                  wildfire_risk (float 0-100),
                  heat_risk (float 0-100)
    """
    zip_code = state.get("zip_code", "")
    print(f"\n[ClimateAgent] Calculating climate risk score for ZIP: {zip_code}")

    try:
        df = pd.read_csv(CLIMATE_CSV, dtype={"zip_code": str})

        row = df[df["zip_code"] == str(zip_code)]
        if row.empty:
            print(f"[ClimateAgent] No climate data found for ZIP {zip_code}.")
            return {**state, "climate_risk_score": None}

        sfha_pct      = pd.to_numeric(row["sfha_pct"].values[0],      errors="coerce")
        claim_rate    = pd.to_numeric(row["claim_rate"].values[0],     errors="coerce")
        wildfire_risk = pd.to_numeric(row["wildfire_risk"].values[0],  errors="coerce")
        heat_risk     = pd.to_numeric(row["heat_risk"].values[0],      errors="coerce")

        missing = [
            name for name, val in [
                ("sfha_pct",      sfha_pct),
                ("claim_rate",    claim_rate),
                ("wildfire_risk", wildfire_risk),
                ("heat_risk",     heat_risk),
            ]
            if pd.isna(val)
        ]
        if missing:
            print(f"[ClimateAgent] Missing fields: {missing}. Skipping.")
            return {**state, "climate_risk_score": None}

        f_score  = _flood_score(float(sfha_pct))
        c_score  = _claims_score(float(claim_rate))
        wf_score = 100.0 - float(wildfire_risk)
        h_score  = 100.0 - float(heat_risk)

        composite = (
            _W_FLOOD    * f_score
            + _W_CLAIMS   * c_score
            + _W_WILDFIRE * wf_score
            + _W_HEAT     * h_score
        )
        composite = max(0.0, min(100.0, composite))

        print(
            f"[ClimateAgent] sfha={sfha_pct}%  claims={claim_rate}/1k  "
            f"wildfire={wildfire_risk}  heat={heat_risk}"
        )
        print(
            f"[ClimateAgent] flood={f_score:.1f}  claims={c_score:.1f}  "
            f"wildfire={wf_score:.1f}  heat={h_score:.1f}  "
            f"-> score={composite:.1f}"
        )
        return {**state, "climate_risk_score": round(composite, 2)}

    except FileNotFoundError:
        print(f"[ClimateAgent] CSV not found: {CLIMATE_CSV} — returning neutral score 50.0")
        return {**state, "climate_risk_score": 50.0}
    except Exception as exc:
        print(f"[ClimateAgent] Unexpected error: {exc}")
        return {**state, "climate_risk_score": None}
