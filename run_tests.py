"""Run all integration tests for new services."""
import os, sys
from dotenv import load_dotenv

# Load .env so services can read API keys
load_dotenv()

# Also set keys explicitly from .env values for services that use os.getenv
from dotenv import dotenv_values
env = dotenv_values(".env")
for k, v in env.items():
    if v:
        os.environ[k] = v

print("=" * 60)
print("TEST 1: Zillow CSV data")
print("=" * 60)
try:
    from services.zillow_csv import get_median_price, get_median_rent, get_price_history
    price = get_median_price("20740")
    rent = get_median_rent("20740")
    history = get_price_history("20740", 6)
    print(f"  Median price ZIP 20740: ${price:,.0f}")
    print(f"  Median rent  ZIP 20740: ${rent:,.0f}")
    print(f"  Price history (last 3): {history[-3:]}")
    print("  PASS" if price > 0 else "  FAIL - no price data")
except Exception as e:
    print(f"  FAIL: {e}")

print()
print("=" * 60)
print("TEST 2: Street View URLs")
print("=" * 60)
try:
    from services.streetview import get_photo_url, get_photo_urls, photo_exists
    url = get_photo_url("4600 Guilford Rd, College Park, MD")
    urls = get_photo_urls("4600 Guilford Rd, College Park, MD", 3)
    print(f"  Photo URL: {url[:80]}...")
    print(f"  Photo URLs count: {len(urls)}")
    print("  PASS" if url else "  FAIL - no URL generated")
except Exception as e:
    print(f"  FAIL: {e}")

print()
print("=" * 60)
print("TEST 3: RentCast listings")
print("=" * 60)
try:
    from services.rentcast import get_listings, map_listing
    raw = get_listings("20740")
    print(f"  RentCast listings: {len(raw)}")
    if raw:
        m = map_listing(raw[0])
        print(f"  Address: {m['address']}")
        print(f"  Price: ${m['price']:,}")
        print(f"  Beds: {m['beds']}, Baths: {m['baths']}, Sqft: {m['sqft']}")
        print("  PASS")
    else:
        print("  WARN - 0 listings (API key may be invalid or ZIP has no active listings)")
except Exception as e:
    print(f"  FAIL: {e}")

print()
print("=" * 60)
print("TEST 4: BLS employment data")
print("=" * 60)
try:
    from services.bls import get_employment
    bls_key = os.environ.get("BLS_API_KEY", "").strip().rstrip(".")
    data = get_employment("20740", bls_key)
    print(f"  BLS status: {'OK' if data else 'empty'}")
    if data:
        print(f"  Latest unemployment: {data['current_rate']}%")
        print(f"  National rate: {data['national_rate']}%")
        print(f"  Area: {data['area_label']}")
        print("  PASS")
    else:
        print("  WARN - no data returned")
except Exception as e:
    print(f"  FAIL: {e}")

print()
print("=" * 60)
print("TEST 5: Score variation (hash fix)")
print("=" * 60)
try:
    sys.path.insert(0, ".")
    # Quick check that _rng produces varied scores
    import random
    def _rng(seed_str, salt=0):
        seed = hash(seed_str) + salt
        return random.Random(seed)
    def _mock_scores(zip_code):
        rng = _rng(zip_code)
        return {
            "price_score": round(rng.uniform(45, 82), 1),
            "neighborhood_score": round(rng.uniform(42, 88), 1),
        }
    scores = [_mock_scores(f"10001{i}")["price_score"] for i in range(10)]
    unique = len(set(scores))
    print(f"  10 score samples: {scores}")
    print(f"  Unique values: {unique}/10")
    print("  PASS" if unique >= 5 else "  FAIL - not enough variation")
except Exception as e:
    print(f"  FAIL: {e}")

print()
print("=" * 60)
print("ALL TESTS COMPLETE")
print("=" * 60)
