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


def init_session_state() -> None:
    st.session_state.setdefault("results", {})
    st.session_state.setdefault("selected_zips", list(KNOWN_ZIPS.keys())[:3])
    st.session_state.setdefault("user", None)


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
                <div class="eyebrow">Investor Workspace</div>
                <div class="hero-title">Turn your Zillow analysis engine into a client-ready real estate website.</div>
                <div class="hero-copy">
                    Users sign in, run ZIP-code analysis, compare markets, and read investment reports from one clean product interface.
                    The analytics are still here, but now they live behind a proper account experience.
                </div>
                <div class="mini-stat">Login and signup</div>
                <div class="mini-stat">ZIP comparison workspace</div>
                <div class="mini-stat">Saved session results</div>
            </div>
            """,
            unsafe_allow_html=True,
        )

        feature_cols = st.columns(3, gap="medium")
        features = [
            ("Private Access", "Keep the app behind authentication so visitors enter through a real product flow."),
            ("Guided Analysis", "Let users choose ZIP codes, run your agent pipeline, and understand the results."),
            ("Readable Reports", "Show scores, recommendations, and narrative takeaways in a website-style workspace."),
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
                    This is now structured like a product workspace: users sign in, choose markets, run analysis, and review investment recommendations in one place.
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
        st.header("Workspace Controls")
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

        analyze = st.button("Run Analysis", type="primary", use_container_width=True)
        clear = st.button("Clear Workspace", use_container_width=True)

        st.divider()
        st.caption("Scoring model")
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


def render_authenticated_app() -> None:
    render_topbar()
    active_zips = render_workspace_controls()

    tabs = st.tabs(["Overview", "Analysis", "Reports", "Account"])

    with tabs[0]:
        if not active_zips:
            st.markdown(
                """
                <div class="app-card">
                    <div class="section-title">Start With a Market</div>
                    <div class="muted-copy">
                        Choose one or more ZIP codes from the sidebar and run analysis to populate this workspace.
                    </div>
                </div>
                """,
                unsafe_allow_html=True,
            )
        else:
            render_summary_cards(active_zips)
            st.markdown('<div class="app-card">', unsafe_allow_html=True)
            st.markdown('<div class="section-title">How this feels now</div>', unsafe_allow_html=True)
            st.markdown(
                """
                <div class="muted-copy">
                    Instead of landing on a raw heatmap dashboard, your users now get a member-style product flow:
                    sign in, open a workspace, run analysis, and review recommendations.
                </div>
                """,
                unsafe_allow_html=True,
            )
            st.markdown("</div>", unsafe_allow_html=True)

    with tabs[1]:
        if not active_zips:
            st.info("Run at least one ZIP code analysis to view charts.")
        else:
            chart_left, chart_right = st.columns(2)
            with chart_left:
                st.markdown('<div class="app-card"><div class="section-title">Market Shape</div>', unsafe_allow_html=True)
                render_radar_chart(active_zips)
                st.markdown("</div>", unsafe_allow_html=True)
            with chart_right:
                st.markdown('<div class="app-card"><div class="section-title">Score Heatmap</div>', unsafe_allow_html=True)
                render_heatmap(active_zips)
                st.markdown("</div>", unsafe_allow_html=True)

    with tabs[2]:
        if not active_zips:
            st.info("Reports will appear here after analysis runs.")
        else:
            st.markdown('<div class="app-card"><div class="section-title">Investment Reports</div>', unsafe_allow_html=True)
            render_reports(active_zips)
            st.markdown("</div>", unsafe_allow_html=True)

    with tabs[3]:
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
