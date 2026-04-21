"use client";

import { Reveal } from "@/components/ui/Reveal";

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
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-semibold tabular-nums text-accent sm:text-4xl">
                {s.value.toLocaleString("tr-TR")}
                {s.suffix}
              </p>
              <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wider text-text-muted">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
