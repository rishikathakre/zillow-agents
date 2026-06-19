"""
graph.py -- LangGraph StateGraph wiring all agents together.

Flow: price_agent -> neighborhood_agent -> rental_agent -> forecast_agent -> coordinator_agent
"""

from __future__ import annotations

from langgraph.graph import StateGraph, END

from state import AgentState
from agents.price_agent import price_agent
from agents.neighborhood_agent import neighborhood_agent
from agents.rental_agent import rental_agent
from agents.forecast_agent import forecast_agent
from agents.coordinator import coordinator_agent


def build_graph() -> StateGraph:
    """
    Construct and compile the Zillow multi-agent LangGraph pipeline.

    Returns a compiled graph that accepts an AgentState and produces
    a fully populated AgentState with final_report filled in.
    """
    graph = StateGraph(AgentState)

    # ── Register nodes ─────────────────────────────────────────────────────────
    graph.add_node("price_agent",        price_agent)
    graph.add_node("neighborhood_agent", neighborhood_agent)
    graph.add_node("rental_agent",       rental_agent)
    graph.add_node("forecast_agent",     forecast_agent)
    graph.add_node("coordinator_agent",  coordinator_agent)

    # ── Define sequential edges ────────────────────────────────────────────────
    graph.set_entry_point("price_agent")
    graph.add_edge("price_agent",        "neighborhood_agent")
    graph.add_edge("neighborhood_agent", "rental_agent")
    graph.add_edge("rental_agent",       "forecast_agent")
    graph.add_edge("forecast_agent",     "coordinator_agent")
    graph.add_edge("coordinator_agent",  END)

    return graph.compile()
