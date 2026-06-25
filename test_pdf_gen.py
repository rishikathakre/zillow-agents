"""Quick test: generate a PDF and count pages."""
from generate_pdf import build_pdf_report

property_details = {
    "address": "123 Test St, New York, NY 10001",
    "zip_code": "10001",
    "property_type": "Condo",
    "asking_price_display": "$850,000",
    "estimated_rent_display": "$3,200/mo",
    "bedrooms": 2, "bathrooms": 1.5, "sqft": 900, "year_built": 2005,
    "str_yield_display": "5.2%", "ltr_yield_display": "4.5%",
    "estimated_return_display": "8.1%", "aqi_display": "42 (Good)",
    "pm25_display": "8.3", "flood_zone": "Zone X", "wildfire_display": "Low",
    "tree_pollen": "Moderate", "grass_pollen": "Low", "heat_days": "12",
    "insurance_note": "Standard", "school_rating": "7/10", "crime_index": "Low",
    "walk_score": "89", "transit_score": "92", "employment_growth": "+2.1%",
    "median_income": "$72,500", "trajectory": "Stable", "population": "21,000",
}

score_rows = [
    {"label": "Price Momentum", "key": "price_score", "score": 34.0, "weight": 0.25, "weighted_score": 8.5},
    {"label": "Neighborhood", "key": "neighborhood_score", "score": 47.0, "weight": 0.20, "weighted_score": 9.4},
    {"label": "Rental Yield", "key": "rental_yield", "score": 49.0, "weight": 0.15, "weighted_score": 7.35},
    {"label": "Forecast", "key": "forecast_score", "score": 45.0, "weight": 0.15, "weighted_score": 6.75},
    {"label": "Air Quality", "key": "aqi_score", "score": 61.0, "weight": 0.10, "weighted_score": 6.1},
    {"label": "Pollen", "key": "pollen_score", "score": 75.0, "weight": 0.05, "weighted_score": 3.75},
    {"label": "Airbnb STR", "key": "airbnb_score", "score": 31.0, "weight": 0.05, "weighted_score": 1.55},
    {"label": "Climate Risk", "key": "climate_risk_score", "score": 87.0, "weight": 0.05, "weighted_score": 4.35},
]

report_text = (
    "This is a sample AI-generated investment analysis report for the property at 123 Test St.\n\n"
    "The property shows moderate investment potential with a mixed score profile. "
    "Climate risk is low which is positive, but price momentum is weak. "
    "The neighborhood quality is average and rental yields are moderate."
)

pdf_bytes = build_pdf_report(
    property_details=property_details,
    score_rows=score_rows,
    report_text=report_text,
    recommendation="HOLD",
    weighted_total=47.7,
    user_name="Test User",
)

with open("test_report.pdf", "wb") as f:
    f.write(pdf_bytes)

try:
    from PyPDF2 import PdfReader
    reader = PdfReader("test_report.pdf")
    page_count = len(reader.pages)
except ImportError:
    # Fallback: just report size
    page_count = "unknown (PyPDF2 not installed)"

print(f"SUCCESS: PDF generated with {page_count} pages, {len(pdf_bytes):,} bytes")
print(f"File saved: test_report.pdf")
