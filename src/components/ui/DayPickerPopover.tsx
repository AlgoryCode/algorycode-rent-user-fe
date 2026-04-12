"use client";

import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  WEEKDAYS_TR,
  calendarCells,
  compareIso,
  canGoPrevCalendar,
  canGoNextCalendar,
} from "@/lib/calendarGrid";
import { parseIsoDate, toIsoDate } from "@/lib/dates";
import { rentFloatingDropdownPanelClass, rentSelectTriggerClass } from "@/components/ui/rentFeSurfaces";

const calEase = [0.22, 1, 0.36, 1] as const;
const fadeQuick = { duration: 0.18, ease: calEase };
const fadeMonth = { duration: 0.22, ease: calEase };

type Props = {
  value: string;
  onChange: (iso: string) => void;
  minDate: string;
  maxDate?: string;
  label: string;
  compact?: boolean;
  className?: string;
};

function initialCalendarYM(value: string, minDate: string, maxDate?: string) {
  const v = parseIsoDate(value);
  if (v) return { y: v.getFullYear(), m: v.getMonth() };
  if (maxDate) {
    const m = parseIsoDate(maxDate);
    if (m) return { y: m.getFullYear() - 25, m: 0 };
  }
  const min = parseIsoDate(minDate) ?? new Date(2000, 0, 1);
  return { y: min.getFullYear(), m: min.getMonth() };
}

export function DayPickerPopover({
  value,
  onChange,
  minDate,
  maxDate,
  label,
  compact = false,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const minD = parseIsoDate(minDate) ?? new Date(2000, 0, 1);
  const valD = parseIsoDate(value);
  const initYM = initialCalendarYM(value, minDate, maxDate);
  const [year, setYear] = useState(initYM.y);
  const [month, setMonth] = useState(initYM.m);
  const [yearPickerOpen, setYearPickerOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 288 });


  const updatePosition = useMemo(
    () => () => {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const w = 288;
      const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
      const top = r.bottom + 8;
      setPos({ top, left, width: w });
    },
    [],
  );

  useLayoutEffect(() => {
    if (!open || typeof window === "undefined") return;
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition, year, month]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (popoverRef.current?.contains(t)) return;
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
  }, [open]);

  const selectDay = (day: number) => {
    const iso = toIsoDate(new Date(year, month, day));
    if (compareIso(iso, minDate) < 0) return;
    if (maxDate && compareIso(iso, maxDate) > 0) return;
    onChange(iso);
    setOpen(false);
  };

  const prevMonth = () => {
    if (!canGoPrevCalendar(year, month, minD)) return;
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (!canGoNextCalendar(year, month, maxDate)) return;
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const cells = calendarCells(year, month);
  const monthTitle = new Date(year, month, 1).toLocaleDateString("tr-TR", {
    month: "long",
    year: "numeric",
  });
  const minYear = minD.getFullYear();
  const maxYear = (parseIsoDate(maxDate ?? "") ?? new Date()).getFullYear();
  const yearOptions: number[] = [];
  for (let y = maxYear; y >= minYear; y--) yearOptions.push(y);

  const display = valD
    ? valD.toLocaleDateString(
        "tr-TR",
        compact
          ? { day: "2-digit", month: "2-digit", year: "numeric" }
          : { weekday: "short", day: "numeric", month: "short", year: "numeric" },
      )
    : "Tarih seçin";

  const triggerClass = compact
    ? `flex h-9 w-full min-w-[8.5rem] items-center justify-between gap-2 px-2.5 text-left text-xs sm:min-w-[9.5rem] sm:text-[13px] ${rentSelectTriggerClass}`
    : `flex h-10 w-full items-center justify-between gap-2 px-3 text-left text-sm ${rentSelectTriggerClass}`;

  const panel = open && typeof window !== "undefined" && (
    <AnimatePresence>
      <motion.div
        ref={popoverRef}
        role="dialog"
        aria-label={label}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: calEase }}
        style={{
          position: "fixed",
          top: pos.top,
          left: pos.left,
          width: pos.width,
          zIndex: 9999,
        }}
        className={`${rentFloatingDropdownPanelClass} p-4 sm:p-5`}
      >
        <div className="mb-4 flex items-center justify-between gap-2 rounded-2xl border border-border-subtle/25 bg-bg-raised/35 px-1 py-1 shadow-inner shadow-black/[0.02] backdrop-blur-md dark:bg-bg-raised/25">
          <button
            type="button"
            onClick={() => {
              if (yearPickerOpen) {
                setYear((y) => Math.max(minYear, y - 12));
                return;
              }
              prevMonth();
            }}
            disabled={yearPickerOpen ? year <= minYear : !canGoPrevCalendar(year, month, minD)}
            className="flex size-8 items-center justify-center rounded-xl text-lg text-text transition-colors duration-150 hover:bg-bg-card/55 active:bg-bg-raised/50 disabled:pointer-events-none disabled:opacity-25"
            aria-label="Önceki ay"
          >
            ‹
          </button>
          <AnimatePresence mode="wait">
            <motion.button
              key={`${year}-${month}-pop-title`}
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={fadeQuick}
              onClick={() => setYearPickerOpen((v) => !v)}
              className="min-w-0 flex-1 truncate rounded-lg px-2 py-1 text-center text-sm font-semibold capitalize text-text transition-colors hover:bg-bg-card/55"
              aria-label="Yıl seçimi"
            >
              {yearPickerOpen ? "Yıl seçin" : monthTitle}
            </motion.button>
          </AnimatePresence>
          <button
            type="button"
            onClick={() => {
              if (yearPickerOpen) {
                setYear((y) => Math.min(maxYear, y + 12));
                return;
              }
              nextMonth();
            }}
            disabled={yearPickerOpen ? year >= maxYear : !canGoNextCalendar(year, month, maxDate)}
            className="flex size-8 items-center justify-center rounded-xl text-lg text-text transition-colors duration-150 hover:bg-bg-card/55 active:bg-bg-raised/50 disabled:pointer-events-none disabled:opacity-25"
            aria-label="Sonraki ay"
          >
            ›
          </button>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${year}-${month}-${yearPickerOpen ? "year" : "day"}-pop-grid`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fadeMonth}
          >
            {yearPickerOpen ? (
              <div className="max-h-64 overflow-y-auto rounded-2xl border border-border-subtle/30 bg-bg-raised/25 p-1.5">
                <div className="grid grid-cols-4 gap-1.5">
                  {yearOptions.map((y) => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => {
                        setYear(y);
                        setYearPickerOpen(false);
                      }}
                      className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                        y === year
                          ? "border-accent/35 bg-accent/16 text-accent"
                          : "border-border-subtle/35 bg-bg-card/40 text-text hover:border-accent/25 hover:bg-bg-card/70"
                      }`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
            </div>
            ) : (
              <>
                <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium uppercase tracking-wide text-text-muted">
                  {WEEKDAYS_TR.map((w) => (
                    <div key={w} className="py-1">
                      {w}
                    </div>
                  ))}
                </div>
                <div className="mt-1 grid grid-cols-7 gap-1">
                  {cells.map((cell, i) =>
                    cell == null ? (
                      <div key={`empty-${i}`} className="aspect-square min-w-0" aria-hidden />
                    ) : (
                      <div key={`d-${year}-${month}-${cell}`} className="aspect-square min-w-0">
                        <DayCell
                          day={cell}
                          iso={toIsoDate(new Date(year, month, cell))}
                          value={value}
                          minDate={minDate}
                          maxDate={maxDate}
                          onPick={() => selectDay(cell)}
                        />
                      </div>
                    ),
                  )}
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );

  return (
    <div className={`relative ${className}`}>
      {!compact && (
        <span className="mb-1 block text-[11px] font-medium text-text-muted">{label}</span>
      )}
      <button
        ref={triggerRef}
        type="button"
        className={triggerClass}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={label}
        onClick={() => {
          if (!open) {
            const v = parseIsoDate(value);
            if (v) {
              setYear(v.getFullYear());
              setMonth(v.getMonth());
            } else {
              const ym = initialCalendarYM(value, minDate, maxDate);
              setYear(ym.y);
              setMonth(ym.m);
            }
            setYearPickerOpen(false);
            setOpen(true);
            queueMicrotask(updatePosition);
            return;
          }
          setOpen(false);
        }}
      >
        <span className="truncate">{display}</span>
        <span className="shrink-0 text-text-muted opacity-70" aria-hidden>
          ▾
        </span>
      </button>
      {open && typeof window !== "undefined" && createPortal(panel, document.body)}
    </div>
  );
}

function DayCell({
  day,
  iso,
  value,
  minDate,
  maxDate,
  onPick,
}: {
  day: number;
  iso: string;
  value: string;
  minDate: string;
  maxDate?: string;
  onPick: () => void;
}) {
  const disabled =
    compareIso(iso, minDate) < 0 || (maxDate != null && compareIso(iso, maxDate) > 0);
  const selected = iso === value;
  const today = toIsoDate(new Date());
  const isToday = iso === today;

  const freeCell =
    "rounded-xl border border-border-subtle/50 bg-bg-card/50 text-text shadow-sm backdrop-blur-sm hover:border-accent/28 hover:bg-bg-raised/60";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPick}
      className={`box-border flex h-full w-full min-w-0 items-center justify-center overflow-hidden rounded-xl text-xs font-medium tabular-nums transition-[background-color,border-color,box-shadow,filter] duration-150 active:brightness-95 ${
        disabled
          ? "cursor-not-allowed text-text-muted/25"
          : selected
            ? "rounded-xl border border-accent/45 bg-accent font-semibold text-white shadow-md shadow-accent/20 ring-1 ring-accent/30 hover:brightness-105"
            : `${freeCell} hover:brightness-[1.01] ${isToday ? "ring-1 ring-inset ring-accent/50" : ""}`
      }`}
    >
      {day}
    </button>
  );
}
