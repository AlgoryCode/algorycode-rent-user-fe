"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { rentFloatingDropdownPanelClass, rentSelectTriggerClass } from "@/components/ui/rentFeSurfaces";

type Option = {
  value: string;
  label: string;
  right?: string;
};

type Props = {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
  panelClassName?: string;
  compact?: boolean;
  leadingIcon?: ReactNode;
  optionLeadingIcon?: ReactNode;
};

export function RentSelect({
  value,
  options,
  onChange,
  ariaLabel,
  className = "",
  panelClassName = "",
  compact = false,
  leadingIcon,
  optionLeadingIcon,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = useMemo(() => options.find((o) => o.value === value) ?? options[0], [options, value]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`${rentSelectTriggerClass} ${compact ? "h-9" : "h-10"} flex w-full items-center justify-between gap-2 px-3 text-left ${compact ? "text-xs sm:text-[13px]" : "text-sm"}`}
      >
        <span className="flex min-w-0 items-center gap-2">
          {leadingIcon && <span className="shrink-0 text-accent">{leadingIcon}</span>}
          <span className="truncate">{active?.label ?? "Seçiniz"}</span>
          {active?.right && <span className="shrink-0 text-text-muted">({active.right})</span>}
        </span>
        <span className={`shrink-0 text-text-muted transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className={`${rentFloatingDropdownPanelClass} absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 p-1.5 ${panelClassName}`}
          >
            <div role="listbox" className="max-h-72 overflow-auto p-0.5">
              {options.map((o) => {
                const selected = o.value === value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    className={`mb-1 flex w-full items-center justify-between rounded-xl border px-2.5 py-2 text-left text-sm transition-[border-color,background-color,color,transform] duration-150 last:mb-0 ${
                      selected
                        ? "border-accent/35 bg-accent/16 text-accent"
                        : "border-transparent text-text hover:-translate-y-[1px] hover:border-accent/20 hover:bg-accent/10 hover:text-accent"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {optionLeadingIcon && <span className="shrink-0 text-accent">{optionLeadingIcon}</span>}
                      <span className="truncate">{o.label}</span>
                    </span>
                    {o.right && <span className="ml-2 shrink-0 text-xs text-text-muted">{o.right}</span>}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
