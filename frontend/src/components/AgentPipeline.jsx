import { useEffect, useRef, useState } from "react";

const AGENTS = [
  { key: "price",        name: "Price Agent",        icon: "💰", source: "Zillow Research" },
  { key: "neighborhood", name: "Neighborhood Agent",  icon: "🏘️", source: "Google Places & Census" },
  { key: "rental",       name: "Rental Agent",        icon: "🏠", source: "Zillow Rent Index" },
  { key: "forecast",     name: "Forecast Agent",      icon: "📈", source: "ML Regression Model" },
  { key: "aqi",          name: "AQI Agent",           icon: "🌬️", source: "EPA AirNow" },
  { key: "pollen",       name: "Pollen Agent",        icon: "🌿", source: "Google Pollen API" },
  { key: "climate",      name: "Climate Agent",       icon: "🌊", source: "FEMA & NOAA" },
  { key: "airbnb",       name: "Airbnb Agent",        icon: "🛏️", source: "STR vs LTR Analysis" },
  { key: "coordinator",  name: "Coordinator (GPT)",   icon: "🤖", source: "GPT-4o-mini" },
];

function ScoreBadge({ score }) {
  if (score === null || score === undefined) return null;
  const color = score >= 70 ? "bg-green-100 text-green-700" : score >= 40 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>{score}/100</span>
  );
}

function AgentRow({ agentDef, state, timer }) {
  const { key, name, icon, source } = agentDef;
  const status = state?.status ?? "waiting";

  if (status === "waiting") {
    return (
      <div className="flex items-center gap-3 py-2 opacity-50">
        <div className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />
        <span className="text-lg w-7 text-center">{icon}</span>
        <div className="flex-1 min-w-0">
          <span className="text-sm text-gray-500 font-medium">{name}</span>
          <span className="text-xs text-gray-400 ml-2">{source}</span>
        </div>
        <span className="text-xs text-gray-400">waiting</span>
      </div>
    );
  }

  if (status === "running") {
    return (
      <div className="flex items-center gap-3 py-2">
        <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 animate-pulse" />
        <span className="text-lg w-7 text-center">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm text-blue-700 font-semibold">{name}</span>
            <span className="text-xs text-gray-400">{source}</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-400 rounded-full animate-pulse" style={{ width: "60%" }} />
          </div>
        </div>
        <span className="text-xs text-blue-600 tabular-nums w-12 text-right">{(timer / 1000).toFixed(1)}s</span>
      </div>
    );
  }

  if (status === "complete") {
    return (
      <div className="flex items-center gap-3 py-2">
        <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
        <span className="text-lg w-7 text-center">{icon}</span>
        <div className="flex-1 min-w-0">
          <span className="text-sm text-gray-800 font-medium">{name}</span>
          <span className="text-xs text-gray-400 ml-2">{source}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ScoreBadge score={state.score} />
          <span className="text-xs text-gray-400 tabular-nums">{(state.duration_ms / 1000).toFixed(1)}s</span>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-center gap-3 py-2">
        <div className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
        <span className="text-lg w-7 text-center">{icon}</span>
        <div className="flex-1 min-w-0">
          <span className="text-sm text-red-600 font-medium">{name}</span>
          <span className="text-xs text-red-400 ml-2 truncate">{state.error ?? "failed"}</span>
        </div>
        <span className="text-xs text-gray-400 tabular-nums">{(state.duration_ms / 1000).toFixed(1)}s</span>
      </div>
    );
  }

  return null;
}

export default function AgentPipeline({ zipCode, onAnalysisComplete }) {
  const [agentStates, setAgentStates] = useState({});
  const [timers, setTimers] = useState({});
  const [pipelineStatus, setPipelineStatus] = useState("running"); // running | complete | error
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
        // ignore parse errors
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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-base font-bold text-gray-900">Agentic AI Pipeline</h3>
        {isLive ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse inline-block" />
            LIVE
          </span>
        ) : pipelineStatus === "complete" ? (
          <span className="text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">✓ Complete</span>
        ) : (
          <span className="text-xs font-semibold text-red-500 bg-red-50 px-2.5 py-1 rounded-full">Error</span>
        )}
      </div>
      <p className="text-xs text-gray-400 mb-4">9 specialist agents analyzing ZIP {zipCode}</p>

      {/* Agent rows */}
      <div className="divide-y divide-gray-50">
        {AGENTS.map(agent => (
          <AgentRow
            key={agent.key}
            agentDef={agent}
            state={agentStates[agent.key]}
            timer={timers[agent.key] ?? 0}
          />
        ))}
      </div>
    </div>
  );
}
