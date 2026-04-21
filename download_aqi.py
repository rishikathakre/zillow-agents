"""
download_aqi.py — Fetch AQI data from EPA AirNow API and write data/aqi.csv.

Two modes
---------
1. Live mode  (default when AIRNOW_API_KEY is set in .env):
       python download_aqi.py

2. Sample mode (no API key needed):
       python download_aqi.py --sample

Registration
------------
Sign up for a free API key at: https://docs.airnowapi.org/account/request
Then add to your .env:
    AIRNOW_API_KEY=your-key-here

AirNow API docs: https://docs.airnowapi.org/forecastsbyzip/query
"""

from __future__ import annotations

import argparse
import os
import time
from pathlib import Path

import pandas as pd
import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

OUT_CSV   = Path(__file__).parent / "data" / "aqi.csv"
BASE_URL  = "https://www.airnowapi.org/aq/observation/zipCode/current/"

# ── Sample data (used when --sample flag is passed or API key is absent) ───────
SAMPLE_ROWS = [
    # zip_code  aqi_value  pm25   ozone
    ("10001",   45,        12.3,  38.2),   # Manhattan, NY
    ("10002",   52,        14.1,  41.0),   # Lower East Side, NY
    ("10003",   48,        13.0,  39.5),   # East Village, NY
    ("10011",   44,        11.8,  37.6),   # Chelsea, NY
    ("10014",   43,        11.5,  36.9),   # West Village, NY
    ("10016",   50,        13.5,  40.1),   # Murray Hill, NY
    ("10019",   47,        12.7,  38.8),   # Midtown West, NY
    ("10022",   46,        12.5,  38.4),   # Midtown East, NY
    ("10036",   51,        13.8,  40.7),   # Hell's Kitchen, NY
    ("10128",   41,        10.9,  35.8),   # Upper East Side, NY
    ("11201",   49,        13.2,  39.8),   # Brooklyn Heights, NY
    ("11211",   55,        15.0,  42.3),   # Williamsburg, NY
    ("11215",   50,        13.4,  40.0),   # Park Slope, NY
    ("30301",   68,        18.7,  52.4),   # Atlanta, GA
    ("60601",   63,        17.1,  49.6),   # Chicago Loop, IL
    ("77001",   72,        20.3,  55.8),   # Houston, TX
    ("90001",   88,        25.4,  66.2),   # South LA, CA
    ("90210",   55,        14.9,  43.7),   # Beverly Hills, CA
    ("98101",   38,         9.8,  33.1),   # Seattle, WA
    ("02101",   42,        11.2,  36.5),   # Boston, MA
]


def write_sample() -> None:
    """Write the hardcoded sample rows to data/aqi.csv."""
    df = pd.DataFrame(SAMPLE_ROWS, columns=["zip_code", "aqi_value", "pm25", "ozone"])
    df["zip_code"] = df["zip_code"].astype(str)
    OUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUT_CSV, index=False)
    print(f"[sample] Wrote {len(df)} rows to {OUT_CSV}")
    print(df.to_string(index=False))


def fetch_live(api_key: str, zip_codes: list[str]) -> pd.DataFrame:
    """
    Call the AirNow current-observations endpoint for each ZIP code.

    Returns a DataFrame with columns: zip_code, aqi_value, pm25, ozone.
    Pollutants returned per ZIP may vary; missing values are filled with NaN.
    """
    records: list[dict] = []

    for zip_code in zip_codes:
        params = {
            "format":       "application/json",
            "zipCode":      zip_code,
            "distance":     25,          # search radius in miles
            "API_KEY":      api_key,
        }
        try:
            resp = requests.get(BASE_URL, params=params, timeout=10)
            resp.raise_for_status()
            observations = resp.json()
        except requests.RequestException as exc:
            print(f"  [WARN] ZIP {zip_code}: request failed — {exc}")
            continue

        if not observations:
            print(f"  [WARN] ZIP {zip_code}: no observations returned")
            continue

        # Each observation is one pollutant; pivot into one row per ZIP
        row: dict = {"zip_code": zip_code, "aqi_value": None, "pm25": None, "ozone": None}
        for obs in observations:
            pollutant = obs.get("ParameterName", "").upper()
            aqi       = obs.get("AQI")

            # AQI for the overall / dominant pollutant
            if row["aqi_value"] is None or (aqi and aqi > row["aqi_value"]):
                row["aqi_value"] = aqi

            if pollutant in ("PM2.5", "PM25"):
                row["pm25"] = aqi
            elif pollutant == "OZONE":
                row["ozone"] = aqi

        records.append(row)
        print(f"  ZIP {zip_code}: AQI={row['aqi_value']}  PM2.5={row['pm25']}  Ozone={row['ozone']}")
        time.sleep(0.25)   # stay well within rate limits

    return pd.DataFrame(records, columns=["zip_code", "aqi_value", "pm25", "ozone"])


def main() -> None:
    parser = argparse.ArgumentParser(description="Download AQI data from EPA AirNow API.")
    parser.add_argument(
        "--sample",
        action="store_true",
        help="Write sample data without calling the API (no key required).",
    )
    parser.add_argument(
        "--zips",
        nargs="+",
        default=[z for z, *_ in SAMPLE_ROWS],
        metavar="ZIP",
        help="ZIP codes to fetch (live mode only). Defaults to the 20 sample ZIPs.",
    )
    args = parser.parse_args()

    if args.sample:
        write_sample()
        return

    api_key = os.getenv("AIRNOW_API_KEY", "").strip()
    if not api_key:
        print(
            "[INFO] AIRNOW_API_KEY not found in .env — falling back to sample data.\n"
            "       Register at https://docs.airnowapi.org/account/request\n"
            "       then add AIRNOW_API_KEY=<your-key> to your .env file.\n"
        )
        write_sample()
        return

    print(f"[live] Fetching AQI for {len(args.zips)} ZIP codes via AirNow API...")
    df = fetch_live(api_key, args.zips)

    if df.empty:
        print("[ERROR] No data returned from API. Writing sample data instead.")
        write_sample()
        return

    OUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUT_CSV, index=False)
    print(f"\n[live] Wrote {len(df)} rows to {OUT_CSV}")
    print(df.to_string(index=False))


if __name__ == "__main__":
    main()
