import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";

export function CountUp({ to, duration = 1.2, suffix = "" }: { to: number; duration?: number; suffix?: string }) {
  const v = useMotionValue(0);
  const rounded = useTransform(v, (x) => Math.round(x).toString() + suffix);
  useEffect(() => {
    const controls = animate(v, to, { duration, ease: "easeOut" });
    return controls.stop;
  }, [to, duration, v]);
  return <motion.span>{rounded}</motion.span>;
}