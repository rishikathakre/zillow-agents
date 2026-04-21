"""
coordinator.py — LLM-powered coordinator agent.

Reads all 8 specialist scores from AgentState, computes a weighted composite
score, builds a concise prompt, and calls gpt-4o-mini to produce a 4-sentence
investment report with a BUY / HOLD / PASS recommendation.

Weighted composite
------------------
  25%  price_score
  20%  neighborhood_score
  15%  rental_yield
  10%  forecast_score
  10%  aqi_score
  10%  climate_risk_score
   5%  pollen_score
   5%  airbnb_score

Stores the narrative in state["final_report"].
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from state import AgentState

# Load .env from project root
load_dotenv(Path(__file__).parent.parent / ".env")

# ── Score weights ──────────────────────────────────────────────────────────────
WEIGHTS: dict[str, float] = {
    "price_score":        0.25,
    "neighborhood_score": 0.20,
    "rental_yield":       0.15,
    "forecast_score":     0.10,
    "aqi_score":          0.10,
    "climate_risk_score": 0.10,
    "pollen_score":       0.05,
    "airbnb_score":       0.05,
}

# ── Recommendation thresholds ──────────────────────────────────────────────────
_BUY_THRESHOLD  = 65.0
_PASS_THRESHOLD = 40.0


def _recommendation(composite: float) -> str:
    if composite >= _BUY_THRESHOLD:
        return "BUY"
    if composite >= _PASS_THRESHOLD:
        return "HOLD"
    return "PASS"


def _fmt(val: float | None) -> str:
    """Format a score for display; show N/A when missing."""
    return f"{val:.1f}/100" if val is not None else "N/A"


def _weighted_score(state: AgentState) -> tuple[float, float]:
    """
    Return (composite_score, effective_weight_sum).

    Missing scores are excluded and their weights redistributed proportionally
    so the composite always sits on a 0-100 scale.
    """
    present = {k: state.get(k) for k in WEIGHTS if state.get(k) is not None}
    if not present:
        return 0.0, 0.0

    weight_sum = sum(WEIGHTS[k] for k in present)
    composite  = sum(state[k] * WEIGHTS[k] for k in present) / weight_sum  # type: ignore[index]
    return composite, weight_sum


# ── System prompt ──────────────────────────────────────────────────────────────
_SYSTEM = (
    "You are a concise real-estate investment analyst. "
    "Given a set of data-driven scores and a composite rating for a ZIP code, "
    "write exactly 4 sentences: "
    "(1) state the composite score and recommendation, "
    "(2) highlight the strongest positive factor, "
    "(3) flag the biggest risk or weakness, "
    "(4) give a one-sentence action for an investor. "
    "Be specific — cite actual numbers. Do not use bullet points or headers."
)


def coordinator_agent(state: AgentState) -> AgentState:
    """LangGraph node: computes weighted score, calls LLM, stores final_report."""
    zip_code = state.get("zip_code", "unknown")
    print(f"\n[CoordinatorAgent] Compiling final report for ZIP: {zip_code}")

    composite, weight_sum = _weighted_score(state)
    rec = _recommendation(composite)

    score_lines = "\n".join(
        f"  {label:<22} {_fmt(state.get(key))}  (weight {int(w*100)}%)"
        for key, w in WEIGHTS.items()
        for label in [key.replace("_", " ").title()]
    )

    user_msg = (
        f"ZIP code: {zip_code}\n\n"
        f"Individual scores (0-100 scale):\n{score_lines}\n\n"
        f"Composite score : {composite:.1f}/100  "
        f"(based on {int(weight_sum*100)}% of available weights)\n"
        f"Recommendation  : {rec}\n\n"
        "Write the 4-sentence investment report now."
    )

    try:
        llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0,
            openai_api_key=os.getenv("OPENAI_API_KEY"),
        )
        response = llm.invoke([
            SystemMessage(content=_SYSTEM),
            HumanMessage(content=user_msg),
        ])
        report_body = response.content
    except Exception as exc:
        print(f"[CoordinatorAgent] LLM call failed: {exc}")
        # Fallback: plain-text summary without LLM
        report_body = (
            f"Composite investment score for ZIP {zip_code}: "
            f"{composite:.1f}/100 — {rec}. "
            f"(LLM unavailable: {exc})"
        )

    header = (
        f"=== INVESTMENT REPORT | ZIP {zip_code} ===\n"
        f"Composite Score : {composite:.1f}/100\n"
        f"Recommendation  : {rec}\n"
        f"{'-'*48}\n"
    )
    score_block = (
        f"\nComponent Scores\n{score_lines}\n"
        f"{'-'*48}\n"
    )
    final_report = header + score_block + "\n" + report_body

    print("\n" + final_report)
    return {**state, "final_report": final_report}
