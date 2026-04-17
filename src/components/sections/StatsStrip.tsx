"use client";

import { animate, motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Reveal } from "@/components/ui/Reveal";

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const controls = animate(0, value, {
      duration: 1.65,
      ease: [0.22, 1, 0.36, 1] as const,
      onUpdate: (v) => setN(Math.round(v)),
    });
    return () => controls.stop();
  }, [isInView, value]);

  return (
    <span ref={ref}>
      {n.toLocaleString("tr-TR")}
      {suffix}
    </span>
  );
}

const stats = [
  { label: "Aktif araç", value: 48, suffix: "+" },
  { label: "Memnuniyet", value: 98, suffix: "%" },
  { label: "Ort. teslim süresi", value: 45, suffix: " dk" },
];

export function StatsStrip() {
  return (
    <section className="relative z-0 mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
      <Reveal>
        <div className="grid gap-6 rounded-2xl border border-border-subtle/80 bg-bg-card px-6 py-10 shadow-[0_16px_48px_-36px_rgba(11,30,59,0.2)] sm:grid-cols-3 sm:gap-8 sm:px-10">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              className="text-center"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.5 }}
            >
              <p className="text-3xl font-semibold tabular-nums text-accent sm:text-4xl">
                <AnimatedNumber value={s.value} suffix={s.suffix} />
              </p>
              <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wider text-text-muted">
                {s.label}
              </p>
            </motion.div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
