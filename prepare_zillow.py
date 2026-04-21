"""
prepare_zillow.py — Clean and prepare Zillow city-level Kaggle data for the
multi-agent pipeline.

Source files (from ~/Downloads/archive/ or --source path):
    City_Zhvi_AllHomes.csv                 ← home values (ZHVI), wide format
    City_Zri_AllHomesPlusMultifamily.csv   ← rental index (ZRI), wide format

Output (written to data/):
    zillow.csv       — RegionName=ZIP, date columns YYYY-MM-DD
    zillow_rent.csv  — RegionName=ZIP, date columns YYYY-MM-DD

The Kaggle archive is city-level, not ZIP-level.  This script maps each
target ZIP to its canonical city+state, extracts that city row, and
reindexes it under the ZIP code so the downstream agents can find it.

Usage
-----
    python prepare_zillow.py                          # default source
    python prepare_zillow.py --source C:/path/to/dir  # custom source dir
    python prepare_zillow.py --list-zips              # show the ZIP map
"""

from __future__ import annotations

import argparse
import calendar
from pathlib import Path

import pandas as pd

# ---------------------------------------------------------------------------
# ZIP → (city_name, state_abbrev)
# Each entry maps one ZIP code to the city whose data best represents it.
# Add rows here to extend coverage; city names must match the Kaggle CSV.
# ---------------------------------------------------------------------------
ZIP_TO_CITY: dict[str, tuple[str, str]] = {
    "10001": ("New York",      "NY"),   # Midtown Manhattan
    "90210": ("Beverly Hills", "CA"),   # Beverly Hills, LA County
    "60601": ("Chicago",       "IL"),   # The Loop, Chicago
    "98101": ("Seattle",       "WA"),   # Downtown Seattle
    "77001": ("Houston",       "TX"),   # Downtown Houston
}

_PRICE_FILE = "City_Zhvi_AllHomes.csv"
_RENT_FILE  = "City_Zri_AllHomesPlusMultifamily.csv"


def _rent_col_to_date(col: str) -> str:
    """Convert 'YYYY-MM' (ZRI format) → 'YYYY-MM-DD' (last day of month)."""
    year, month = int(col[:4]), int(col[5:7])
    last_day = calendar.monthrange(year, month)[1]
    return f"{year:04d}-{month:02d}-{last_day:02d}"


def _extract_zip_rows(source_df: pd.DataFrame, mapping: dict[str, tuple[str, str]]) -> pd.DataFrame:
    """
    For each ZIP in *mapping*, locate the matching city+state row in
    *source_df*, relabel RegionName to the ZIP code, and return the
    combined DataFrame.
    """
    if "State" not in source_df.columns:
        raise KeyError("Expected a 'State' column in the source CSV.")

    rows: list[pd.Series] = []
    for zip_code, (city, state) in mapping.items():
        mask = (source_df["RegionName"] == city) & (source_df["State"] == state)
        matches = source_df[mask]
        if matches.empty:
            print(f"  WARNING: no row found for {city}, {state}  (ZIP {zip_code}) — skipping")
            continue
        row = matches.iloc[0].copy()
        row["RegionName"] = zip_code
        rows.append(row)
        print(f"  {zip_code}  <-  {city}, {state}")

    if not rows:
        raise ValueError("No matching cities found.  Check ZIP_TO_CITY mapping.")
    return pd.DataFrame(rows)


def prepare_price(source_dir: Path, data_dir: Path) -> None:
    price_path = source_dir / _PRICE_FILE
    print(f"\nLoading price data: {price_path}")
    df = pd.read_csv(price_path, dtype={"RegionName": str, "State": str})

    out = _extract_zip_rows(df, ZIP_TO_CITY)

    # Keep only RegionName + date columns (YYYY-MM-DD = 10 chars)
    date_cols = sorted(
        [c for c in df.columns if len(c) == 10 and c[:4].isdigit()],
        key=lambda c: pd.to_datetime(c),
    )
    out = out[["RegionName"] + date_cols].reset_index(drop=True)

    dest = data_dir / "zillow.csv"
    out.to_csv(dest, index=False)
    print(f"  Wrote {len(out)} rows x {len(date_cols)} months  ->  {dest}")
    print(f"  Date range: {date_cols[0]}  to  {date_cols[-1]}")


def prepare_rent(source_dir: Path, data_dir: Path) -> None:
    rent_path = source_dir / _RENT_FILE
    print(f"\nLoading rent data: {rent_path}")
    df = pd.read_csv(rent_path, dtype={"RegionName": str, "State": str})

    out = _extract_zip_rows(df, ZIP_TO_CITY)

    # ZRI date columns are YYYY-MM (7 chars) — rename to YYYY-MM-DD
    raw_date_cols = sorted(
        [c for c in df.columns if len(c) == 7 and c[:4].isdigit()],
        key=lambda c: pd.to_datetime(c + "-01"),
    )
    rename_map = {c: _rent_col_to_date(c) for c in raw_date_cols}
    out = out.rename(columns=rename_map)
    new_date_cols = [rename_map[c] for c in raw_date_cols]
    out = out[["RegionName"] + new_date_cols].reset_index(drop=True)

    dest = data_dir / "zillow_rent.csv"
    out.to_csv(dest, index=False)
    print(f"  Wrote {len(out)} rows x {len(new_date_cols)} months  ->  {dest}")
    print(f"  Date range: {new_date_cols[0]}  to  {new_date_cols[-1]}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    default_src = Path.home() / "Downloads" / "archive"
    parser.add_argument("--source", default=str(default_src),
                        help=f"Directory containing the Kaggle archive CSVs (default: {default_src})")
    parser.add_argument("--list-zips", action="store_true",
                        help="Print the ZIP → city mapping and exit")
    args = parser.parse_args()

    if args.list_zips:
        print("\nConfigured ZIP → city mapping:")
        for z, (city, state) in ZIP_TO_CITY.items():
            print(f"  {z}  →  {city}, {state}")
        return

    source_dir = Path(args.source)
    if not source_dir.is_dir():
        raise SystemExit(f"ERROR: source directory not found: {source_dir}")

    data_dir = Path(__file__).parent / "data"
    data_dir.mkdir(exist_ok=True)

    prepare_price(source_dir, data_dir)
    prepare_rent(source_dir, data_dir)

    print("\nDone.  Run the pipeline for any ZIP with:")
    print("  python main.py 10001")
    print("  python compare.py")


if __name__ == "__main__":
    main()
