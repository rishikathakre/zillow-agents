import { useEffect, useRef, useState } from "react";

const AGENTS = [
  { key: "price",        name: "Price Agent",        source: "Zillow Research" },
  { key: "neighborhood", name: "Neighborhood Agent",  source: "Google Places & Census" },
  { key: "rental",       name: "Rental Agent",        source: "Zillow Rent Index" },
  { key: "forecast",     name: "Forecast Agent",      source: "ML Regression Model" },
  { key: "aqi",          name: "AQI Agent",           source: "EPA AirNow" },
  { key: "pollen",       name: "Pollen Agent",        source: "Google Pollen API" },
  { key: "climate",      name: "Climate Agent",       source: "FEMA & NOAA" },
  { key: "airbnb",       name: "Airbnb Agent",        source: "STR vs LTR Analysis" },
  { key: "coordinator",  name: "Coordinator (GPT)",   source: "GPT-4o-mini" },
];

function ScoreBadge({ score }) {
  if (score === null || score === undefined) return null;
  const style = score >= 70
    ? { bg: "#ECFDF5", color: "#065F46", border: "#A7F3D0" }
    : score >= 40
    ? { bg: "#FFFBEB", color: "#92400E", border: "#FDE68A" }
    : { bg: "#FEF2F2", color: "#991B1B", border: "#FCA5A5" };
  return (
    <span style={{
      background: style.bg, color: style.color,
      border: `1px solid ${style.border}`, borderRadius: 6,
      padding: "2px 8px", fontSize: 11, fontWeight: 600,
    }}>
      {score}/100
    </span>
  );
}

function AgentRow({ agentDef, state, timer }) {
  const { name, source } = agentDef;
  const status = state?.status ?? "waiting";

  if (status === "waiting") {
    return (
      <div className="flex items-center gap-3 px-5 py-3 opacity-50">
        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: "#E2E8F0" }} />
        <div className="flex-1 min-w-0">
          <span style={{ fontSize: 12, fontWeight: 500, color: "#94A3B8" }}>{name}</span>
          <span style={{ fontSize: 11, color: "#CBD5E1", marginLeft: 8 }}>{source}</span>
        </div>
        <span style={{ fontSize: 11, color: "#CBD5E1" }}>waiting</span>
      </div>
    );
  }

  if (status === "running") {
    return (
      <div className="flex items-center gap-3 px-5 py-3">
        <div className="w-2 h-2 rounded-full shrink-0 pulse-dot" style={{ background: "#0EA5E9" }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span style={{ fontSize: 12, fontWeight: 500, color: "#0F172A" }}>{name}</span>
            <span style={{ fontSize: 11, color: "#94A3B8" }}>{source}</span>
          </div>
          <div className="h-[2px] rounded-full overflow-hidden"
            style={{
              background: "linear-gradient(90deg, #E0F2FE 0%, #0EA5E9 50%, #E0F2FE 100%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.2s infinite linear",
            }} />
        </div>
        <span style={{ fontSize: 11, color: "#94A3B8", fontFamily: "monospace", marginLeft: "auto" }}>{(timer / 1000).toFixed(1)}s</span>
      </div>
    );
  }

  if (status === "complete") {
    return (
      <div className="flex items-center gap-3 px-5 py-3">
        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: "#10B981" }} />
        <div className="flex-1 min-w-0">
          <span style={{ fontSize: 12, fontWeight: 500, color: "#0F172A" }}>{name}</span>
          <span style={{ fontSize: 11, color: "#94A3B8", marginLeft: 8 }}>{source}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ScoreBadge score={state.score} />
          <span style={{ fontSize: 10, color: "#CBD5E1", fontFamily: "monospace" }}>{(state.duration_ms / 1000).toFixed(1)}s</span>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-center gap-3 px-5 py-3">
        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: "#EF4444" }} />
        <div className="flex-1 min-w-0">
          <span style={{ fontSize: 12, fontWeight: 500, color: "#EF4444" }}>{name}</span>
          <span style={{ fontSize: 11, color: "#FCA5A5", marginLeft: 8 }} className="truncate">{state.error ?? "failed"}</span>
        </div>
        <span style={{ fontSize: 11, color: "#CBD5E1", fontFamily: "monospace" }}>{(state.duration_ms / 1000).toFixed(1)}s</span>
      </div>
    );
  }

  return null;
}

export default function AgentPipeline({ zipCode, onAnalysisComplete }) {
  const [agentStates, setAgentStates] = useState({});
  const [timers, setTimers] = useState({});
  const [pipelineStatus, setPipelineStatus] = useState("running");
  const intervalsRef = useRef({});
  const esRef = useRef(null);

  useEffect(() => {
    if (!zipCode) return;

    const es = new EventSource(`/api/analyze/stream/${zipCode}`);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);

        if (data.event === "agent_start") {
          setAgentStates(prev => ({ ...prev, [data.agent]: { status: "running" } }));
          const startTime = Date.now();
          const interval = setInterval(() => {
            setTimers(prev => ({ ...prev, [data.agent]: Date.now() - startTime }));
          }, 100);
          intervalsRef.current[data.agent] = interval;
        }

        else if (data.event === "agent_complete") {
          clearInterval(intervalsRef.current[data.agent]);
          delete intervalsRef.current[data.agent];
          setAgentStates(prev => ({
            ...prev,
            [data.agent]: { status: "complete", score: data.score, duration_ms: data.duration_ms },
          }));
          setTimers(prev => ({ ...prev, [data.agent]: data.duration_ms }));
        }

        else if (data.event === "agent_error") {
          clearInterval(intervalsRef.current[data.agent]);
          delete intervalsRef.current[data.agent];
          setAgentStates(prev => ({
            ...prev,
            [data.agent]: { status: "error", error: data.error, duration_ms: data.duration_ms },
          }));
        }

        else if (data.event === "pipeline_complete") {
          Object.values(intervalsRef.current).forEach(clearInterval);
          intervalsRef.current = {};
          setPipelineStatus("complete");
          es.close();
          if (onAnalysisComplete) onAnalysisComplete(data.analysis);
        }
      } catch {
        // ignore
      }
    };

    es.onerror = () => {
      Object.values(intervalsRef.current).forEach(clearInterval);
      intervalsRef.current = {};
      setPipelineStatus("error");
      es.close();
    };

    return () => {
      Object.values(intervalsRef.current).forEach(clearInterval);
      intervalsRef.current = {};
      es.close();
    };
  }, [zipCode]);

  const isLive = pipelineStatus === "running";

  return (
    <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #E2E8F0" }}>
        <div>
          <h3 style={{ color: "#0F172A", fontWeight: 600, fontSize: 13 }}>AI Pipeline</h3>
          <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>9 specialist agents analyzing ZIP {zipCode}</p>
        </div>
        {isLive ? (
          <span className="flex items-center gap-1.5" style={{
            background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 20,
            padding: "4px 10px", fontSize: 10, color: "#0369A1", fontWeight: 500,
          }}>
            <span className="w-1.5 h-1.5 rounded-full pulse-dot inline-block" style={{ background: "#0EA5E9" }} />
            LIVE
          </span>
        ) : pipelineStatus === "complete" ? (
          <span style={{
            background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 20,
            padding: "4px 10px", fontSize: 10, color: "#065F46", fontWeight: 600,
          }}>Complete</span>
        ) : (
          <span style={{
            background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 20,
            padding: "4px 10px", fontSize: 10, color: "#991B1B", fontWeight: 600,
          }}>Error</span>
        )}
      </div>

      {/* Agent rows */}
      <div>
        {AGENTS.map((agent, i) => (
          <div key={agent.key} style={{ borderBottom: i < AGENTS.length - 1 ? "1px solid #F1F5F9" : "none" }}>
            <AgentRow
              agentDef={agent}
              state={agentStates[agent.key]}
              timer={timers[agent.key] ?? 0}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
