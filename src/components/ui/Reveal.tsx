"use client";

import type { ReactNode } from "react";

/** İçerik anında görünür; sayfa yükünde motion kullanılmaz. */
export function Reveal({
  children,
  className = "",
  delay: _delay = 0,
  y: _y = 28,
}: {
  children: ReactNode;
  /** Geriye dönük imza — animasyon kullanılmıyor. */
  delay?: number;
  y?: number;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}
