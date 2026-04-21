"""
compare.py — Run the multi-agent pipeline for multiple ZIP codes and
print a side-by-side investment score comparison table.

Each ZIP runs the full 8-agent LangGraph pipeline (price, neighborhood,
rental, forecast, AQI, pollen, Airbnb, coordinator).  Per-agent output is
suppressed during batch mode for a clean table; run `python main.py <ZIP>`
to see the detailed reasoning for any single ZIP.

Usage
-----
    python compare.py                          # default: 10001 90210 60601 98101 77001
    python compare.py 10001 90210 60601        # custom ZIP list
"""

from __future__ import annotations

import contextlib
import sys
from io import StringIO
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

from main import build_graph
from state import AgentState

DEFAULT_ZIPS = ["10001", "90210", "60601", "98101", "77001"]

# (state key, display label)
SCORE_FIELDS: list[tuple[str, str]] = [
    ("price_score",        "Price Momentum"),
    ("neighborhood_score", "Neighborhood"),
    ("rental_yield",       "Rental Yield"),
    ("forecast_score",     "12-mo Forecast"),
    ("aqi_score",          "Air Quality"),
    ("pollen_score",       "Pollen Burden"),
    ("climate_risk_score", "Climate/Flood Risk"),
    ("airbnb_score",       "Airbnb STR"),
]

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


def _weighted_composite(state: AgentState) -> float | None:
    present = {k: state.get(k) for k in WEIGHTS if state.get(k) is not None}
    if not present:
        return None
    weight_sum = sum(WEIGHTS[k] for k in present)
    return sum(state[k] * WEIGHTS[k] for k in present) / weight_sum  # type: ignore[index]


def _recommendation(score: float | None) -> str:
    if score is None:
        return "N/A"
    if score >= 65.0:
        return "BUY"
    if score >= 40.0:
        return "HOLD"
    return "PASS"


def _fmt_score(val: float | None) -> str:
    return f"{val:5.1f}" if val is not None else "  N/A"


def _run_zip(app, zip_code: str) -> AgentState:
    """Invoke the full pipeline for one ZIP, suppressing stdout."""
    initial: AgentState = {
        "zip_code":           zip_code,
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
    buf = StringIO()
    with contextlib.redirect_stdout(buf):
        result = app.invoke(initial)
    return result


def _print_table(zips: list[str], results: dict[str, AgentState]) -> None:
    col_w   = 12   # width of each ZIP column
    label_w = 20   # width of the score label column
    total_w = label_w + col_w * len(zips)

    def divider(char: str = "-") -> str:
        return char * total_w

    def row(label: str, values: list[str]) -> str:
        return f"{label:<{label_w}}" + "".join(f"{v:>{col_w}}" for v in values)

    print()
    print("=" * total_w)
    print(f"{'INVESTMENT SCORE COMPARISON':^{total_w}}")
    print("=" * total_w)
    print(row("", zips))
    print(divider())

    for field, label in SCORE_FIELDS:
        vals = [_fmt_score(results[z].get(field)) for z in zips]
        print(row(label, vals))

    print(divider())

    # Composite score
    composites = {z: _weighted_composite(results[z]) for z in zips}
    print(row("COMPOSITE (wtd)", [_fmt_score(composites[z]) for z in zips]))

    # Recommendation
    recs = {z: _recommendation(composites[z]) for z in zips}
    print(row("RECOMMENDATION", [f"{recs[z]:>5}" for z in zips]))

    print("=" * total_w)

    # Weight legend
    print()
    print("Weights: Price 25% | Neighborhood 20% | Rental 15% | Forecast 10%")
    print("         AQI 10%   | Climate 10%       | Pollen 5%  | Airbnb 5%")
    print("Scores 0-100 (higher = better).  BUY >=65 | HOLD 40-64 | PASS <40")
    print()


def main() -> None:
    zips = [z.strip() for z in sys.argv[1:]] if len(sys.argv) > 1 else DEFAULT_ZIPS

    print("\nBuilding LangGraph pipeline...")
    app = build_graph()

    results: dict[str, AgentState] = {}
    for zip_code in zips:
        print(f"  Analyzing ZIP {zip_code}...", end="", flush=True)
        results[zip_code] = _run_zip(app, zip_code)
        composite = _weighted_composite(results[zip_code])
        rec = _recommendation(composite)
        score_str = f"{composite:.1f}" if composite is not None else "N/A"
        print(f"  composite={score_str}  [{rec}]")

    _print_table(zips, results)


if __name__ == "__main__":
    main()
