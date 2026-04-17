"use client";

import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  /** Varsa, `rentSelectTriggerClass` yerine tam tetikleyici sınıfları (ör. hero kartı). */
  triggerClassName?: string;
  /** `"hero"`: açılır liste beyaz / nötr kart (hero arama ile uyumlu). */
  dropdownShell?: "rent" | "hero";
  compact?: boolean;
  leadingIcon?: ReactNode;
  optionLeadingIcon?: ReactNode;
  /** Salt okunur: liste açılmaz, değer gösterilir */
  disabled?: boolean;
};

const HERO_PANEL_Z = 9500;

export function RentSelect({
  value,
  options,
  onChange,
  ariaLabel,
  className = "",
  panelClassName = "",
  triggerClassName,
  dropdownShell = "rent",
  compact = false,
  leadingIcon,
  optionLeadingIcon,
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const panelOpen = !disabled && open;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [heroPos, setHeroPos] = useState({ top: 0, left: 0, width: 0 });

  const active = useMemo(() => options.find((o) => o.value === value) ?? options[0], [options, value]);

  const updateHeroPos = useMemo(
    () => () => {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setHeroPos({
        top: r.bottom + 6,
        left: r.left,
        width: Math.max(r.width, 300),
      });
    },
    [],
  );

  useLayoutEffect(() => {
    if (!panelOpen || dropdownShell !== "hero") return;
    updateHeroPos();
    window.addEventListener("scroll", updateHeroPos, true);
    window.addEventListener("resize", updateHeroPos);
    return () => {
      window.removeEventListener("scroll", updateHeroPos, true);
      window.removeEventListener("resize", updateHeroPos);
    };
  }, [panelOpen, dropdownShell, updateHeroPos]);

  useEffect(() => {
    if (!panelOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if (dropdownShell === "hero" && popoverRef.current?.contains(t)) return;
      setOpen(false);
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
  }, [panelOpen, dropdownShell]);

  const heroPanelClass =
    `overflow-hidden rounded-2xl border border-neutral-200/90 bg-white p-2 shadow-[0_32px_90px_-36px_rgba(15,23,42,0.35)] ring-1 ring-black/[0.04] dark:border-white/10 dark:bg-bg-card dark:ring-white/[0.06] ${panelClassName}`.trim();

  const optionRowClass = (selected: boolean) =>
    dropdownShell === "hero"
      ? selected
        ? "mb-1 flex w-full items-center justify-between rounded-xl border border-accent/35 bg-accent/16 px-2.5 py-2 text-left text-sm font-medium text-accent transition-[border-color,background-color,color,transform] duration-150 last:mb-0"
        : "mb-1 flex w-full items-center justify-between rounded-xl border border-neutral-200/70 bg-white px-2.5 py-2 text-left text-sm text-neutral-800 transition-[border-color,background-color,color,transform] duration-150 last:mb-0 hover:border-accent/30 hover:bg-neutral-50 dark:border-white/10 dark:bg-bg-card/50 dark:text-text dark:hover:bg-bg-card/70"
      : selected
        ? "mb-1 flex w-full items-center justify-between rounded-xl border border-accent/35 bg-accent/16 px-2.5 py-2 text-left text-sm text-accent transition-[border-color,background-color,color,transform] duration-150 last:mb-0"
        : "mb-1 flex w-full items-center justify-between rounded-xl border border-transparent px-2.5 py-2 text-left text-sm text-text transition-[border-color,background-color,color,transform] duration-150 last:mb-0 hover:-translate-y-[1px] hover:border-accent/20 hover:bg-accent/10 hover:text-accent";

  const listbox = (
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
            className={optionRowClass(selected)}
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
  );

  const heroPortal =
    dropdownShell === "hero" && typeof document !== "undefined"
      ? createPortal(
          <AnimatePresence>
            {panelOpen ? (
              <motion.div
                key="rent-select-hero-panel"
                ref={popoverRef}
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                transition={{ duration: 0.16 }}
                style={{
                  position: "fixed",
                  top: heroPos.top,
                  left: heroPos.left,
                  width: heroPos.width,
                  zIndex: HERO_PANEL_Z,
                }}
                className={heroPanelClass}
              >
                {listbox}
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup={disabled ? undefined : "listbox"}
        aria-expanded={disabled ? undefined : panelOpen}
        disabled={disabled}
        aria-disabled={disabled || undefined}
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
        }}
        className={
          triggerClassName ??
          `${rentSelectTriggerClass} ${compact ? "h-9" : "h-10"} flex w-full items-center justify-between gap-2 px-3 text-left ${compact ? "text-xs sm:text-[13px]" : "text-sm"} ${disabled ? "cursor-not-allowed opacity-65" : ""}`
        }
      >
        <span className="flex min-w-0 items-center gap-2">
          {leadingIcon && <span className="shrink-0 text-accent">{leadingIcon}</span>}
          <span className="truncate">{active?.label ?? "Seçiniz"}</span>
          {active?.right && <span className="shrink-0 text-text-muted">({active.right})</span>}
        </span>
        <span
          className={`shrink-0 text-text-muted transition-transform ${disabled ? "opacity-35" : panelOpen ? "rotate-180" : ""}`}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {dropdownShell === "hero" ? (
        heroPortal
      ) : (
        <AnimatePresence>
          {panelOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              className={`${rentFloatingDropdownPanelClass} absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 p-1.5 ${panelClassName}`}
            >
              {listbox}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
