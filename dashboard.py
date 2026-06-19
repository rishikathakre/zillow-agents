"""
Launch with:
    streamlit run dashboard.py
"""

from __future__ import annotations

import contextlib
import sys
from io import StringIO
from pathlib import Path

import plotly.graph_objects as go
import streamlit as st
from dotenv import load_dotenv

from auth import authenticate_user, create_user

_ROOT = Path(__file__).parent
load_dotenv(_ROOT / ".env")
sys.path.insert(0, str(_ROOT))

from main import build_graph
from state import AgentState


KNOWN_ZIPS: dict[str, str] = {
    "10001": "10001 - Manhattan, NY",
    "90210": "90210 - Beverly Hills, CA",
    "60601": "60601 - Chicago, IL",
    "98101": "98101 - Seattle, WA",
    "77001": "77001 - Houston, TX",
}

SCORE_FIELDS: list[tuple[str, str]] = [
    ("price_score", "Price Momentum"),
    ("neighborhood_score", "Neighborhood"),
    ("rental_yield", "Rental Yield"),
    ("forecast_score", "12-mo Forecast"),
    ("aqi_score", "Air Quality"),
    ("pollen_score", "Pollen Burden"),
    ("climate_risk_score", "Climate Risk"),
    ("airbnb_score", "Airbnb STR"),
]

WEIGHTS: dict[str, float] = {
    "price_score": 0.25,
    "neighborhood_score": 0.20,
    "rental_yield": 0.15,
    "forecast_score": 0.10,
    "aqi_score": 0.10,
    "climate_risk_score": 0.10,
    "pollen_score": 0.05,
    "airbnb_score": 0.05,
}

TRACE_COLORS = ["#0f766e", "#f97316", "#2563eb", "#dc2626", "#7c3aed", "#059669"]
BUY_THRESHOLD = 65.0
PASS_THRESHOLD = 40.0


@st.cache_resource
def get_graph():
    return build_graph()


def weighted_composite(state: AgentState) -> float | None:
    present = {key: state.get(key) for key in WEIGHTS if state.get(key) is not None}
    if not present:
        return None
    weight_sum = sum(WEIGHTS[key] for key in present)
    return sum(state[key] * WEIGHTS[key] for key in present) / weight_sum  # type: ignore[index]


def recommendation(score: float | None) -> str:
    if score is None:
        return "N/A"
    if score >= BUY_THRESHOLD:
        return "BUY"
    if score >= PASS_THRESHOLD:
        return "HOLD"
    return "PASS"


def recommendation_color(rec: str) -> str:
    return {"BUY": "#16a34a", "HOLD": "#ea580c", "PASS": "#dc2626"}.get(rec, "#64748b")


def run_zip(zip_code: str) -> AgentState:
    initial: AgentState = {
        "zip_code": zip_code,
        "price_score": None,
        "neighborhood_score": None,
        "rental_yield": None,
        "forecast_score": None,
        "aqi_score": None,
        "pollen_score": None,
        "climate_risk_score": None,
        "airbnb_score": None,
        "final_report": None,
        "messages": [],
    }
    buf = StringIO()
    with contextlib.redirect_stdout(buf):
        result = get_graph().invoke(initial)
    return result


def clamp(value: float, lower: float = 0.0, upper: float = 100.0) -> float:
    return max(lower, min(upper, value))


def format_currency(value: float) -> str:
    return f"${value:,.0f}"


def property_recommendation(score: float) -> str:
    if score >= 72:
        return "STRONG BUY"
    if score >= 58:
        return "GOOD DEAL"
    if score >= 45:
        return "MAYBE"
    return "PASS"


def property_verdict_color(verdict: str) -> str:
    colors = {
        "STRONG BUY": "#16a34a",
        "GOOD DEAL": "#0f766e",
        "MAYBE": "#ea580c",
        "PASS": "#dc2626",
    }
    return colors.get(verdict, "#64748b")


def condition_to_score(condition: str) -> float:
    scores = {
        "Turnkey": 92.0,
        "Light updates": 76.0,
        "Needs work": 54.0,
        "Heavy rehab": 34.0,
    }
    return scores[condition]


def strategy_target_yield(strategy: str) -> float:
    targets = {
        "Long-term rental": 6.0,
        "Fix and flip": 4.0,
        "Short-term rental": 8.0,
        "Primary home": 3.5,
    }
    return targets[strategy]


def analyze_property(
    *,
    address: str,
    zip_code: str,
    asking_price: float,
    estimated_value: float,
    estimated_rent: float,
    beds: int,
    baths: float,
    sqft: int,
    year_built: int,
    condition: str,
    strategy: str,
    photo_count: int,
) -> dict[str, object]:
    market_state = run_zip(zip_code)
    market_score = weighted_composite(market_state) or 50.0

    price_advantage = ((estimated_value - asking_price) / asking_price) * 100 if asking_price else 0.0
    price_score = clamp(55 + price_advantage * 3.2)

    annual_rent = estimated_rent * 12
    gross_yield = (annual_rent / asking_price) * 100 if asking_price else 0.0
    yield_target = strategy_target_yield(strategy)
    yield_score = clamp((gross_yield / yield_target) * 100)

    condition_score = condition_to_score(condition)
    size_score = clamp(40 + beds * 8 + baths * 6 + min(sqft, 4000) / 55)
    age_score = clamp(100 - max(0, 2026 - year_built) * 0.9)
    photo_score = clamp(35 + photo_count * 10)

    overall_score = (
        market_score * 0.30
        + price_score * 0.24
        + yield_score * 0.18
        + condition_score * 0.12
        + size_score * 0.08
        + age_score * 0.04
        + photo_score * 0.04
    )
    overall_score = round(clamp(overall_score), 1)
    verdict = property_recommendation(overall_score)

    reasons: list[str] = []
    if price_advantage >= 8:
        reasons.append("priced well below your estimated value")
    elif price_advantage >= 2:
        reasons.append("slightly below your estimated value")
    elif price_advantage <= -8:
        reasons.append("priced well above your estimated value")
    else:
        reasons.append("roughly in line with estimated market value")

    if gross_yield >= yield_target:
        reasons.append(f"rental yield looks attractive at {gross_yield:.1f}%")
    else:
        reasons.append(f"rental yield looks thin at {gross_yield:.1f}%")

    if condition_score >= 80:
        reasons.append("property condition suggests lower near-term repair risk")
    elif condition_score <= 45:
        reasons.append("renovation risk is significant")

    summary = (
        f"{address or 'This property'} scores {overall_score}/100 and rates as {verdict}. "
        f"The ZIP-level market outlook for {zip_code} is {market_score:.1f}/100, and the home is {reasons[0]}. "
        f"For a {strategy.lower()} strategy, the estimated yield is {gross_yield:.1f}% and {reasons[1]}. "
        f"Condition appears to be {condition.lower()}, so {reasons[2] if len(reasons) > 2 else 'execution risk looks moderate'}."
    )

    return {
        "address": address,
        "zip_code": zip_code,
        "verdict": verdict,
        "overall_score": overall_score,
        "market_score": round(market_score, 1),
        "price_score": round(price_score, 1),
        "yield_score": round(yield_score, 1),
        "condition_score": round(condition_score, 1),
        "size_score": round(size_score, 1),
        "age_score": round(age_score, 1),
        "photo_score": round(photo_score, 1),
        "estimated_yield": round(gross_yield, 1),
        "price_advantage": round(price_advantage, 1),
        "summary": summary,
        "market_state": market_state,
        "photo_count": photo_count,
        "asking_price": asking_price,
        "estimated_value": estimated_value,
        "estimated_rent": estimated_rent,
        "strategy": strategy,
        "condition": condition,
    }


def init_session_state() -> None:
    st.session_state.setdefault("results", {})
    st.session_state.setdefault("selected_zips", list(KNOWN_ZIPS.keys())[:3])
    st.session_state.setdefault("user", None)
    st.session_state.setdefault("property_result", None)
    st.session_state.setdefault("property_history", [])
    st.session_state.setdefault("property_uploaded_files", None)


def inject_styles() -> None:
    st.markdown(
        """
        <style>
        .stApp {
            background:
                radial-gradient(circle at top left, rgba(15, 118, 110, 0.12), transparent 28%),
                radial-gradient(circle at top right, rgba(249, 115, 22, 0.14), transparent 24%),
                linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
        }
        .hero-card, .app-card, .metric-card, .feature-card {
            background: rgba(255, 255, 255, 0.78);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(148, 163, 184, 0.18);
            border-radius: 24px;
            box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08);
        }
        .hero-card {
            padding: 2.6rem;
            margin-bottom: 1.25rem;
        }
        .app-card {
            padding: 1.4rem;
            margin-bottom: 1rem;
        }
        .metric-card {
            padding: 1.1rem;
            min-height: 154px;
        }
        .feature-card {
            padding: 1.2rem;
            min-height: 172px;
        }
        .eyebrow {
            text-transform: uppercase;
            letter-spacing: 0.16em;
            color: #0f766e;
            font-weight: 700;
            font-size: 0.78rem;
        }
        .hero-title {
            font-size: 3rem;
            line-height: 1.05;
            font-weight: 800;
            color: #0f172a;
            margin: 0.3rem 0 0.8rem;
        }
        .hero-copy, .muted-copy {
            color: #475569;
            font-size: 1rem;
        }
        .mini-stat {
            font-size: 0.85rem;
            color: #334155;
            background: #f8fafc;
            border-radius: 999px;
            padding: 0.45rem 0.8rem;
            display: inline-block;
            margin-right: 0.4rem;
            margin-top: 0.4rem;
        }
        .section-title {
            color: #0f172a;
            font-size: 1.35rem;
            font-weight: 750;
            margin-bottom: 0.25rem;
        }
        .score-number {
            font-size: 2.3rem;
            line-height: 1;
            font-weight: 800;
            margin: 0.35rem 0;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


def render_public_home() -> None:
    left, right = st.columns([1.25, 0.95], gap="large")

    with left:
        st.markdown(
            """
            <div class="hero-card">
                <div class="eyebrow">Property Checker</div>
                <div class="hero-title">Let customers upload a house, review photos, and get a simple buy-or-pass prediction.</div>
                <div class="hero-copy">
                    This version is built more like a customer product. People sign in, enter a specific property,
                    upload listing photos, and get a verdict that combines home-level details with your ZIP-level market engine.
                </div>
                <div class="mini-stat">Photo upload</div>
                <div class="mini-stat">House-by-house prediction</div>
                <div class="mini-stat">Market + property scoring</div>
            </div>
            """,
            unsafe_allow_html=True,
        )

        feature_cols = st.columns(3, gap="medium")
        features = [
            ("Upload Photos", "Customers can bring in listing images so each property feels real instead of abstract."),
            ("Check One House", "Capture asking price, rent, beds, baths, size, and condition for a specific address."),
            ("Simple Verdict", "Return a clear score and explain if the property looks promising or risky."),
        ]
        for col, (title, copy) in zip(feature_cols, features):
            with col:
                st.markdown(
                    f"""
                    <div class="feature-card">
                        <div class="section-title">{title}</div>
                        <div class="muted-copy">{copy}</div>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )

    with right:
        st.markdown('<div class="app-card">', unsafe_allow_html=True)
        st.subheader("Access Your Workspace")
        sign_in_tab, sign_up_tab = st.tabs(["Sign In", "Create Account"])

        with sign_in_tab:
            with st.form("sign_in_form", clear_on_submit=False):
                email = st.text_input("Email", key="login_email")
                password = st.text_input("Password", type="password", key="login_password")
                submitted = st.form_submit_button("Sign In", use_container_width=True, type="primary")
                if submitted:
                    ok, payload = authenticate_user(email, password)
                    if ok:
                        st.session_state["user"] = payload
                        st.success(f"Welcome back, {payload['name']}.")
                        st.rerun()
                    else:
                        st.error(str(payload))

        with sign_up_tab:
            with st.form("sign_up_form", clear_on_submit=True):
                name = st.text_input("Full name")
                email = st.text_input("Email address")
                password = st.text_input("Create password", type="password")
                submitted = st.form_submit_button("Create Account", use_container_width=True)
                if submitted:
                    ok, message = create_user(name, email, password)
                    if ok:
                        st.success("Account created. You can sign in now.")
                    else:
                        st.error(message)
        st.markdown("</div>", unsafe_allow_html=True)


def render_topbar() -> None:
    user = st.session_state["user"]
    top_left, top_right = st.columns([0.78, 0.22])
    with top_left:
        st.markdown(
            f"""
            <div class="hero-card">
                <div class="eyebrow">Logged In</div>
                <div class="hero-title" style="font-size:2.2rem;">Welcome, {user['name']}.</div>
                <div class="hero-copy">
                    Customers can now evaluate an individual house instead of only looking at dashboards. Add the property details, show the photos, and return an easy-to-understand verdict.
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )
    with top_right:
        st.markdown('<div class="app-card">', unsafe_allow_html=True)
        st.write(f"**Account**  \n{user['email']}")
        if st.button("Log Out", use_container_width=True):
            st.session_state["user"] = None
            st.session_state["results"] = {}
            st.rerun()
        st.markdown("</div>", unsafe_allow_html=True)


def render_workspace_controls() -> list[str]:
    with st.sidebar:
        st.header("Market Inputs")
        selected_known = st.multiselect(
            "Featured ZIP codes",
            options=list(KNOWN_ZIPS.keys()),
            default=st.session_state["selected_zips"],
            format_func=lambda z: KNOWN_ZIPS[z],
        )
        custom_input = st.text_input("Add a custom ZIP", placeholder="e.g. 30301", max_chars=5)

        selected = list(selected_known)
        if custom_input.strip().isdigit() and len(custom_input.strip()) == 5:
            custom_zip = custom_input.strip()
            if custom_zip not in selected:
                selected.append(custom_zip)

        st.session_state["selected_zips"] = selected_known

        analyze = st.button("Refresh Market Data", type="primary", use_container_width=True)
        clear = st.button("Clear Market Cache", use_container_width=True)

        st.divider()
        st.caption("ZIP scoring model")
        for key, label in SCORE_FIELDS:
            st.progress(WEIGHTS[key], text=f"{label} ({int(WEIGHTS[key] * 100)}%)")

    if clear:
        st.session_state["results"] = {}
        st.rerun()

    if analyze and selected:
        to_run = [zip_code for zip_code in selected if zip_code not in st.session_state["results"]]
        if to_run:
            progress = st.progress(0.0, text="Preparing analysis workspace...")
            for idx, zip_code in enumerate(to_run):
                st.session_state["results"][zip_code] = run_zip(zip_code)
                progress.progress((idx + 1) / len(to_run), text=f"Completed {KNOWN_ZIPS.get(zip_code, zip_code)}")
            progress.empty()
        else:
            st.info("These ZIP codes are already loaded in the workspace.")

    return [zip_code for zip_code in selected if zip_code in st.session_state["results"]]


def render_summary_cards(active_zips: list[str]) -> None:
    st.subheader("Portfolio Snapshot")
    cols = st.columns(len(active_zips))
    for col, zip_code in zip(cols, active_zips):
        state = st.session_state["results"][zip_code]
        composite = weighted_composite(state)
        rec = recommendation(composite)
        color = recommendation_color(rec)
        label = KNOWN_ZIPS.get(zip_code, zip_code)
        score_str = f"{composite:.1f}" if composite is not None else "-"
        col.markdown(
            f"""
            <div class="metric-card">
                <div class="eyebrow">{label}</div>
                <div class="score-number" style="color:{color};">{score_str}</div>
                <div class="muted-copy">Composite score</div>
                <div class="mini-stat" style="background:{color}; color:white;">{rec}</div>
            </div>
            """,
            unsafe_allow_html=True,
        )


def render_radar_chart(active_zips: list[str]) -> None:
    labels = [label for _, label in SCORE_FIELDS]
    fig = go.Figure()
    for idx, zip_code in enumerate(active_zips):
        state = st.session_state["results"][zip_code]
        values = [float(state.get(key) or 0.0) for key, _ in SCORE_FIELDS]
        fig.add_trace(
            go.Scatterpolar(
                r=values + [values[0]],
                theta=labels + [labels[0]],
                name=KNOWN_ZIPS.get(zip_code, zip_code),
                fill="toself",
                opacity=0.28,
                line=dict(color=TRACE_COLORS[idx % len(TRACE_COLORS)], width=2),
            )
        )
    fig.update_layout(
        paper_bgcolor="rgba(255,255,255,0)",
        plot_bgcolor="rgba(255,255,255,0)",
        polar=dict(
            bgcolor="rgba(255,255,255,0)",
            radialaxis=dict(range=[0, 100], gridcolor="#cbd5e1"),
            angularaxis=dict(gridcolor="#e2e8f0"),
        ),
        font=dict(color="#0f172a"),
        height=430,
        margin=dict(l=40, r=40, t=20, b=20),
    )
    st.plotly_chart(fig, use_container_width=True)


def render_heatmap(active_zips: list[str]) -> None:
    score_labels = [label for _, label in SCORE_FIELDS] + ["Composite"]
    column_labels = [KNOWN_ZIPS.get(zip_code, zip_code) for zip_code in active_zips]
    matrix: list[list[float]] = []

    for key, _ in SCORE_FIELDS:
        matrix.append([float(st.session_state["results"][zip_code].get(key) or 0.0) for zip_code in active_zips])
    matrix.append([float(weighted_composite(st.session_state["results"][zip_code]) or 0.0) for zip_code in active_zips])

    fig = go.Figure(
        data=go.Heatmap(
            z=matrix,
            x=column_labels,
            y=score_labels,
            zmin=0,
            zmax=100,
            colorscale=[
                [0.00, "#7f1d1d"],
                [0.40, "#ef4444"],
                [0.65, "#f59e0b"],
                [0.80, "#22c55e"],
                [1.00, "#166534"],
            ],
            text=[[f"{value:.1f}" for value in row] for row in matrix],
            texttemplate="%{text}",
            xgap=4,
            ygap=4,
        )
    )
    fig.update_layout(
        paper_bgcolor="rgba(255,255,255,0)",
        plot_bgcolor="rgba(255,255,255,0)",
        font=dict(color="#0f172a"),
        height=max(320, 44 * len(score_labels)),
        margin=dict(l=90, r=20, t=10, b=20),
    )
    st.plotly_chart(fig, use_container_width=True)


def render_reports(active_zips: list[str]) -> None:
    for zip_code in active_zips:
        state = st.session_state["results"][zip_code]
        composite = weighted_composite(state)
        rec = recommendation(composite)
        with st.expander(f"{KNOWN_ZIPS.get(zip_code, zip_code)} - {rec}", expanded=False):
            report = state.get("final_report")
            if report:
                st.code(report, language=None)
            else:
                st.info("No narrative report was generated for this ZIP code.")


def render_property_checker() -> None:
    st.markdown(
        """
        <div class="app-card">
            <div class="section-title">Property Check</div>
            <div class="muted-copy">
                Enter the house details customers care about, upload listing photos, and generate a simple verdict.
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    with st.form("property_check_form"):
        address_col, zip_col = st.columns([1.7, 0.7])
        with address_col:
            address = st.text_input("Property address", placeholder="123 Main St, Beverly Hills, CA")
        with zip_col:
            zip_code = st.text_input("ZIP code", value="90210", max_chars=5)

        price_col, value_col, rent_col = st.columns(3)
        with price_col:
            asking_price = st.number_input("Asking price", min_value=50000, value=850000, step=10000)
        with value_col:
            estimated_value = st.number_input("Estimated market value", min_value=50000, value=900000, step=10000)
        with rent_col:
            estimated_rent = st.number_input("Estimated monthly rent", min_value=500, value=4500, step=100)

        bed_col, bath_col, sqft_col, year_col = st.columns(4)
        with bed_col:
            beds = st.number_input("Beds", min_value=1, max_value=12, value=3, step=1)
        with bath_col:
            baths = st.number_input("Baths", min_value=1.0, max_value=10.0, value=2.0, step=0.5)
        with sqft_col:
            sqft = st.number_input("Square feet", min_value=400, max_value=10000, value=1850, step=50)
        with year_col:
            year_built = st.number_input("Year built", min_value=1900, max_value=2026, value=1998, step=1)

        condition_col, strategy_col = st.columns(2)
        with condition_col:
            condition = st.selectbox("Condition", ["Turnkey", "Light updates", "Needs work", "Heavy rehab"])
        with strategy_col:
            strategy = st.selectbox(
                "Strategy",
                ["Long-term rental", "Fix and flip", "Short-term rental", "Primary home"],
            )

        photos = st.file_uploader(
            "Listing photos",
            type=["png", "jpg", "jpeg", "webp"],
            accept_multiple_files=True,
            help="Photos are displayed to the customer and used as a simple completeness signal in the score.",
        )
        submitted = st.form_submit_button("Check This House", type="primary", use_container_width=True)

    if submitted:
        clean_zip = zip_code.strip()
        if not (clean_zip.isdigit() and len(clean_zip) == 5):
            st.error("Please enter a valid 5-digit ZIP code.")
        else:
            st.session_state["property_uploaded_files"] = list(photos or [])
            result = analyze_property(
                address=address.strip(),
                zip_code=clean_zip,
                asking_price=float(asking_price),
                estimated_value=float(estimated_value),
                estimated_rent=float(estimated_rent),
                beds=int(beds),
                baths=float(baths),
                sqft=int(sqft),
                year_built=int(year_built),
                condition=condition,
                strategy=strategy,
                photo_count=len(photos or []),
            )
            st.session_state["property_result"] = result
            st.session_state["results"][clean_zip] = result["market_state"]
            st.session_state["property_history"] = [
                {
                    "address": result["address"] or "Unnamed property",
                    "zip_code": result["zip_code"],
                    "verdict": result["verdict"],
                    "overall_score": result["overall_score"],
                    "asking_price": result["asking_price"],
                },
                *st.session_state["property_history"][:5],
            ]

    result = st.session_state["property_result"]
    if not result:
        return

    st.subheader("Current Verdict")
    verdict_color = property_verdict_color(str(result["verdict"]))
    hero_left, hero_right = st.columns([1.15, 0.85], gap="large")

    with hero_left:
        st.markdown(
            f"""
            <div class="hero-card">
                <div class="eyebrow">{result['zip_code']} Property Check</div>
                <div class="hero-title" style="font-size:2.3rem;">{result['address'] or 'Selected property'}</div>
                <div class="hero-copy">{result['summary']}</div>
                <div class="mini-stat">Verdict: {result['verdict']}</div>
                <div class="mini-stat">Asking: {format_currency(float(result['asking_price']))}</div>
                <div class="mini-stat">Est. rent: {format_currency(float(result['estimated_rent']))}/mo</div>
            </div>
            """,
            unsafe_allow_html=True,
        )

    with hero_right:
        st.markdown(
            f"""
            <div class="metric-card">
                <div class="eyebrow">Overall score</div>
                <div class="score-number" style="color:{verdict_color};">{result['overall_score']}</div>
                <div class="muted-copy">Prediction: {result['verdict']}</div>
                <div class="mini-stat">Market: {result['market_score']}/100</div>
                <div class="mini-stat">Yield: {result['estimated_yield']}%</div>
                <div class="mini-stat">Discount: {result['price_advantage']}%</div>
            </div>
            """,
            unsafe_allow_html=True,
        )

    score_cols = st.columns(6)
    score_cards = [
        ("Market", result["market_score"]),
        ("Price", result["price_score"]),
        ("Yield", result["yield_score"]),
        ("Condition", result["condition_score"]),
        ("Layout", result["size_score"]),
        ("Photos", result["photo_score"]),
    ]
    for col, (label, value) in zip(score_cols, score_cards):
        with col:
            st.markdown(
                f"""
                <div class="metric-card">
                    <div class="eyebrow">{label}</div>
                    <div class="score-number" style="font-size:1.6rem;">{value}</div>
                    <div class="muted-copy">out of 100</div>
                </div>
                """,
                unsafe_allow_html=True,
            )

    uploaded_files = st.session_state.get("property_uploaded_files")
    if uploaded_files:
        st.subheader("Property Photos")
        st.image(uploaded_files, use_container_width=True)


def render_property_gallery() -> None:
    uploaded_files = st.session_state.get("property_uploaded_files")
    if uploaded_files:
        st.markdown('<div class="app-card"><div class="section-title">Listing Photos</div>', unsafe_allow_html=True)
        st.image(uploaded_files, use_container_width=True)
        st.markdown("</div>", unsafe_allow_html=True)
    else:
        st.markdown(
            """
            <div class="app-card">
                <div class="section-title">No Photos Yet</div>
                <div class="muted-copy">Upload listing photos in the Property Check tab and they will appear here.</div>
            </div>
            """,
            unsafe_allow_html=True,
        )


def render_property_history() -> None:
    history = st.session_state["property_history"]
    if not history:
        st.info("Checked houses will show up here after the first property analysis.")
        return

    for item in history:
        st.markdown(
            f"""
            <div class="app-card">
                <div class="section-title">{item['address']}</div>
                <div class="muted-copy">
                    ZIP {item['zip_code']} · {format_currency(float(item['asking_price']))} ·
                    Score {item['overall_score']}/100 · Verdict {item['verdict']}
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )


def render_authenticated_app() -> None:
    render_topbar()
    active_zips = render_workspace_controls()

    tabs = st.tabs(["Property Check", "Photos", "Market Intel", "Saved Checks", "Account"])

    with tabs[0]:
        render_property_checker()

    with tabs[1]:
        render_property_gallery()

    with tabs[2]:
        if not active_zips:
            st.info("Run at least one ZIP code analysis to view charts.")
        else:
            render_summary_cards(active_zips)
            chart_left, chart_right = st.columns(2)
            with chart_left:
                st.markdown('<div class="app-card"><div class="section-title">Market Shape</div>', unsafe_allow_html=True)
                render_radar_chart(active_zips)
                st.markdown("</div>", unsafe_allow_html=True)
            with chart_right:
                st.markdown('<div class="app-card"><div class="section-title">Score Heatmap</div>', unsafe_allow_html=True)
                render_heatmap(active_zips)
                st.markdown("</div>", unsafe_allow_html=True)

    with tabs[3]:
        render_property_history()
        if active_zips:
            st.markdown('<div class="app-card"><div class="section-title">Market Reports</div>', unsafe_allow_html=True)
            render_reports(active_zips)
            st.markdown("</div>", unsafe_allow_html=True)

    with tabs[4]:
        user = st.session_state["user"]
        st.markdown(
            f"""
            <div class="app-card">
                <div class="section-title">Account</div>
                <div class="muted-copy">Signed in as <strong>{user['name']}</strong> ({user['email']}).</div>
                <div class="muted-copy" style="margin-top:0.75rem;">
                    User accounts are stored locally in <code>data/auth/users.json</code>. This is good for a prototype.
                    For a production deployment, we should switch to a real auth provider and database-backed sessions.
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )


def main() -> None:
    st.set_page_config(
        page_title="Zillow Investment Workspace",
        page_icon="🏠",
        layout="wide",
        initial_sidebar_state="expanded",
    )
    init_session_state()
    inject_styles()

    if st.session_state["user"] is None:
        render_public_home()
    else:
        render_authenticated_app()


if __name__ == "__main__":
    main()
