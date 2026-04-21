"""
forecast_agent.py — Price forecast score (0-100) via linear regression.

Loads data/zillow.csv, extracts the historical price time-series for the
target ZIP, trains a sklearn LinearRegression on (month_index, price), and
predicts the price 12 months ahead.

Normalisation anchors: -10% predicted growth → 0, +20% → 100.

Stores the result in state["forecast_score"].
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression

from state import AgentState

DATA_DIR   = Path(__file__).parent.parent / "data"
ZILLOW_CSV = DATA_DIR / "zillow.csv"

_MIN_PCT = -10.0
_MAX_PCT =  20.0


def _pct_to_score(pct: float) -> float:
    return max(0.0, min(100.0, (pct - _MIN_PCT) / (_MAX_PCT - _MIN_PCT) * 100))


def forecast_agent(state: AgentState) -> AgentState:
    """
    LangGraph node: populates state["forecast_score"].

    Trains a univariate linear regression on all non-null historical price
    points for the ZIP and extrapolates 12 months beyond the last observation.
    """
    zip_code = state.get("zip_code", "")
    print(f"\n[ForecastAgent] Forecasting price for ZIP: {zip_code}")

    try:
        df = pd.read_csv(ZILLOW_CSV, dtype={"RegionName": str})

        row = df[df["RegionName"] == str(zip_code)]
        if row.empty:
            print(f"[ForecastAgent] No data found for ZIP {zip_code}.")
            return {**state, "forecast_score": None}

        date_cols = sorted(
            [c for c in df.columns if c[:4].isdigit() and len(c) == 10],
            key=lambda c: pd.to_datetime(c),
        )
        if len(date_cols) < 6:
            print("[ForecastAgent] Too few date columns to train a regression.")
            return {**state, "forecast_score": None}

        prices = pd.to_numeric(row[date_cols].iloc[0], errors="coerce")
        prices = prices.dropna()

        if len(prices) < 6:
            print("[ForecastAgent] Too few non-null price points for regression.")
            return {**state, "forecast_score": None}

        # X = month index (0, 1, 2, …), Y = price
        X = np.arange(len(prices)).reshape(-1, 1)
        y = prices.values

        model = LinearRegression()
        model.fit(X, y)

        current_price   = float(prices.iloc[-1])
        # Predict 12 months ahead
        future_index    = np.array([[len(prices) - 1 + 12]])
        predicted_price = float(model.predict(future_index)[0])

        if current_price == 0:
            print("[ForecastAgent] Current price is zero; cannot compute growth.")
            return {**state, "forecast_score": None}

        pct_growth = (predicted_price - current_price) / current_price * 100
        score      = _pct_to_score(pct_growth)

        print(
            f"[ForecastAgent] current=${current_price:,.0f}  "
            f"predicted(+12mo)=${predicted_price:,.0f}  "
            f"growth={pct_growth:+.1f}%  score={score:.1f}"
        )
        return {**state, "forecast_score": round(score, 2)}

    except FileNotFoundError:
        print(f"[ForecastAgent] CSV not found: {ZILLOW_CSV} — returning neutral score 50.0")
        return {**state, "forecast_score": 50.0}
    except Exception as exc:
        print(f"[ForecastAgent] Unexpected error: {exc}")
        return {**state, "forecast_score": None}
