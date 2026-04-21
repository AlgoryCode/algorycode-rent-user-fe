"use client";

import type { ReactNode } from "react";

/**
 * Sayfa kabuğu — girişte `opacity: 0` animasyonu kullanmıyoruz: SSR + tema koyu zemin
 * birleşince içerik görünmeden önce tam ekran siyah hissi veriyordu.
 */
export function PageShell({ children }: { children: ReactNode }) {
  return <div className="flex min-h-dvh flex-col">{children}</div>;
}
