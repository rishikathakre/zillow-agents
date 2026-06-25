import { useEffect, useRef } from "react";

export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      el.style.transform = `translate(${e.clientX - 200}px, ${e.clientY - 200}px)`;
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);
  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-50 h-[400px] w-[400px] rounded-full"
      style={{
        background:
          "radial-gradient(circle, rgba(37,99,235,0.10) 0%, rgba(37,99,235,0.04) 35%, transparent 70%)",
        willChange: "transform",
      }}
    />
  );
}