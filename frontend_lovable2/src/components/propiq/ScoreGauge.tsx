import { motion } from "framer-motion";
import { CountUp } from "./CountUp";

export function ScoreGauge({ score, recommendation }: { score: number; recommendation: "BUY" | "HOLD" | "PASS" }) {
  const R = 80, C = 2 * Math.PI * R;
  const offset = C - (score / 100) * C;
  const color = recommendation === "BUY" ? "#10b981" : recommendation === "HOLD" ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-48 w-48">
        <svg viewBox="0 0 200 200" className="-rotate-90">
          <circle cx="100" cy="100" r={R} stroke="#e5e7eb" strokeWidth="14" fill="none" />
          <motion.circle
            cx="100" cy="100" r={R} stroke={color} strokeWidth="14" fill="none" strokeLinecap="round"
            strokeDasharray={C}
            initial={{ strokeDashoffset: C }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.4, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-5xl font-bold tracking-tight"><CountUp to={score} /></div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">PropIQ Score</div>
        </div>
      </div>
      <div
        className="mt-4 rounded-full px-5 py-1.5 text-sm font-bold tracking-wider text-white shadow"
        style={{ background: color }}
      >
        {recommendation}
      </div>
    </div>
  );
}