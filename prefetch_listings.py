"""
prefetch_listings.py -- Pre-warm the Zillow listings cache for a set of ZIP codes.

Fetches live data from the RapidAPI Zillow endpoint and stores each result with
a 30-day TTL so the professor's demo runs from cache with zero API latency.

Usage
-----
    python prefetch_listings.py
"""
from __future__ import annotations

import sys
import time
from pathlib import Path

from dotenv import dotenv_values

sys.path.insert(0, str(Path(__file__).parent))

from services import zillow as svc_zillow
from services import cache as svc_cache

ENV_PATH   = Path(__file__).parent / ".env"
TTL_30_DAYS = 30 * 24 * 3600   # 2 592 000 seconds

# (zip, label, city+state fallback query)
ZIPS: list[tuple[str, str, str]] = [
    ("20740", "College Park MD",  "College Park, MD"),
    ("20745", "Oxon Hill MD",     "Oxon Hill, MD"),
    ("20770", "Greenbelt MD",     "Greenbelt, MD"),
    ("20783", "Hyattsville MD",   "Hyattsville, MD"),
    ("22201", "Arlington VA",     "Arlington, VA"),
    ("20001", "Washington DC",    "Washington, DC"),
    ("10001", "New York NY",      "New York, NY"),
    ("90210", "Beverly Hills CA", "Beverly Hills, CA"),
    ("60601", "Chicago IL",       "Chicago, IL"),
    ("98101", "Seattle WA",       "Seattle, WA"),
]

# Seconds to pause between API calls; increase if you hit 429s
INTER_REQUEST_DELAY = 4.0
# Max retries on 429 (with 15-second back-off each time)
MAX_RETRIES = 3


def _fetch_with_retry(zip_code: str, city_query: str,
                      rk: str, rh: str) -> list[dict]:
    """Try ZIP first; fall back to city+state on 0 results; retry on 429."""
    queries = [zip_code, city_query]
    for attempt, query in enumerate(queries):
        label_q = "ZIP" if query == zip_code else "city+state"
        print(f"  [{zip_code}] {label_q} query ...", end="", flush=True)

        for retry in range(MAX_RETRIES):
            t0 = time.time()
            try:
                # Clear any short-TTL cache entry so we always hit the API here
                svc_cache.invalidate(f"zillow_v3_listings:{query.lower().strip()}")
                listings = svc_zillow.fetch_listings(query, rk, rh)
                elapsed  = time.time() - t0

                if listings:
                    print(f"  {len(listings)} listings  ({elapsed:.1f}s)  cached 30 days")
                    return listings
                else:
                    print(f"  0 results  ({elapsed:.1f}s)")
                    break   # move to next query variant, not retry

            except Exception as exc:
                elapsed = time.time() - t0
                msg = str(exc)
                if "429" in msg or "rate" in msg.lower():
                    wait = 15 * (retry + 1)
                    print(f"  rate-limited ({elapsed:.1f}s) -- waiting {wait}s ...",
                          end="", flush=True)
                    time.sleep(wait)
                    continue
                print(f"  ERROR ({elapsed:.1f}s): {exc}")
                break

    return []


def main() -> None:
    env  = dotenv_values(ENV_PATH)
    rk   = env.get("RAPIDAPI_KEY", "").strip()
    rh   = env.get("RAPIDAPI_HOST", "zillow-property-data.p.rapidapi.com").strip()

    if not rk:
        print("ERROR: RAPIDAPI_KEY not found in .env -- aborting.")
        sys.exit(1)

    print(f"\n{'='*62}")
    print("  ZILLOW LISTING PRE-FETCHER  --  30-day cache warm-up")
    print(f"{'='*62}")
    print(f"  API host : {rh}")
    print(f"  Cache TTL: 30 days  ({TTL_30_DAYS:,} seconds)")
    print(f"  ZIPs     : {len(ZIPS)}")
    print(f"{'='*62}\n")

    results: list[dict] = []
    total_api_calls = 0

    for zip_code, label, city_query in ZIPS:
        cache_key = f"zillow_v3_listings:{zip_code}"

        # Check if already cached (from a prior run)
        existing = svc_cache.get(cache_key)
        if existing is not None:
            count = len(existing)
            print(f"  [{zip_code}] {label:<22}  CACHE HIT  ({count} listings)")
            results.append({"zip": zip_code, "label": label,
                             "count": count, "source": "cache"})
            continue

        listings = _fetch_with_retry(zip_code, city_query, rk, rh)
        total_api_calls += 1

        count = len(listings)
        if listings:
            svc_cache.set(cache_key, listings, TTL_30_DAYS)

        results.append({"zip": zip_code, "label": label,
                         "count": count,
                         "source": "api" if count > 0 else "empty"})

        time.sleep(INTER_REQUEST_DELAY)

    # ── Summary report ───────────────────────────────────────────────────────
    print(f"\n{'='*62}")
    print("  RESULTS SUMMARY")
    print(f"{'='*62}")
    print(f"  {'ZIP':<8}  {'Location':<22}  {'Listings':>8}  {'Source'}")
    print(f"  {'-'*8}  {'-'*22}  {'-'*8}  {'-'*6}")

    total_listings = 0
    for r in results:
        total_listings += r["count"]
        src_map = {"api": "API", "cache": "CACHED", "empty": "EMPTY", "error": "ERROR"}
        src = src_map.get(r["source"], r["source"].upper())
        print(f"  {r['zip']:<8}  {r['label']:<22}  {r['count']:>8}  {src}")

    print(f"{'='*62}")
    print(f"\n  1. Listings cached per ZIP (see table above)")
    print(f"     Total listings stored : {total_listings:,}")
    print(f"\n  2. API calls used today  : {total_api_calls}")
    print(f"     (ZIPs already cached  : {sum(1 for r in results if r['source'] == 'cache')})")
    print(f"\n  3. Cache duration        : 30 days")
    print(f"     Expires around        : {_expiry_date()}")
    print(f"{'='*62}\n")


def _expiry_date() -> str:
    import datetime
    expiry = datetime.datetime.now() + datetime.timedelta(days=30)
    return expiry.strftime("%Y-%m-%d")


if __name__ == "__main__":
    main()
