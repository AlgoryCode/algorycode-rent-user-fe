"use client";

import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
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

const MONTH_LABELS_TR = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
] as const;

function monthIntersectsAllowedRange(y: number, m: number, minIso: string, maxIso: string | undefined): boolean {
  const first = toIsoDate(new Date(y, m, 1));
  const last = toIsoDate(new Date(y, m + 1, 0));
  if (compareIso(last, minIso) < 0) return false;
  if (maxIso && compareIso(first, maxIso) > 0) return false;
  return true;
}

/** Hero arama: 08:00 … 23:30, 30 dk adım */
export const HERO_HALF_HOUR_SLOTS = (() => {
  const out: string[] = [];
  for (let h = 8; h <= 23; h++) {
    for (const m of [0, 30] as const) {
      out.push(`${String(h).padStart(2, "0")}:${m === 0 ? "00" : "30"}`);
    }
  }
  return out;
})();

type Variant = "default" | "hero";

type Props = {
  value: string;
  onChange: (iso: string) => void;
  minDate: string;
  maxDate?: string;
  /** Erişilebilirlik / `aria-label`; boş bırakılırsa "Tarih seçin" kullanılır */
  label?: string;
  compact?: boolean;
  className?: string;
  /** Geniş takvim paneli (uçuş tarzı), saat satırı ile birlikte kullanılabilir. */
  variant?: Variant;
  /** Takvim altında saat seçici (örn. `10:00`). */
  timeValue?: string;
  onTimeChange?: (time: string) => void;
  /** Hero + saat: tetik içinde solda görünen başlık (örn. "Alış Tarihi"). */
  heroScheduleTitle?: string;
  /** `true` ise üstteki `label` satırı çizilmez (erişilebilirlik için `label` yine `aria-label`da kullanılır). */
  hideSurfaceLabel?: boolean;
  /** Tetikleyicide gösterilecek tarih metni (örn. "17 Mayıs, Cum"). Verilmezse yerel varsayılan kullanılır. */
  formatDisplay?: (d: Date) => string;
  /** Varsa, `variant`/`compact` ile hesaplanan tetik sınıfları yerine tam sınıf listesi (örn. hero arama çubuğu). */
  triggerClassName?: string;
  /**
   * rent-wheel `CarRentalSearch` tetik düzeni: üstte küçük etiket, altta takvim ikonu + `d MMM, EEE` (tr).
   * Doluysa `hideSurfaceLabel` ile dış `label` satırı kullanılmaz; `label` yalnızca aria için kalır.
   */
  carSearchFieldLabel?: string;
  /**
   * `yearMonthDay`: önce yıl, sonra ay, sonra gün (doğum tarihi vb.).
   * Varsayılan `calendar`: mevcut ay takvimi + başlıktan yıl listesi.
   */
  pickMode?: "calendar" | "yearMonthDay";
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
  label = "",
  compact = false,
  className = "",
  variant = "default",
  timeValue,
  onTimeChange,
  heroScheduleTitle,
  hideSurfaceLabel = false,
  formatDisplay,
  triggerClassName,
  carSearchFieldLabel,
  pickMode = "calendar",
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
  const [ymdStep, setYmdStep] = useState<"year" | "month" | "day">("year");
  const [pos, setPos] = useState({ top: 0, left: 0, width: 288 });

  const isYmd = pickMode === "yearMonthDay";

  const updatePosition = useMemo(
    () => () => {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const w = variant === "hero" ? Math.min(860, window.innerWidth - 24) : 288;
      let left: number;
      if (variant === "hero") {
        left = r.left + r.width / 2 - w / 2;
        left = Math.max(12, Math.min(left, window.innerWidth - w - 12));
      } else {
        left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
      }
      const top = r.bottom + 8;
      setPos({ top, left, width: w });
    },
    [variant],
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
  }, [open, updatePosition, year, month, ymdStep, pickMode]);

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
    ? formatDisplay != null
      ? formatDisplay(valD)
      : valD.toLocaleDateString(
          "tr-TR",
          compact
            ? { day: "2-digit", month: "2-digit", year: "numeric" }
            : { weekday: "short", day: "numeric", month: "short", year: "numeric" },
        )
    : "Tarih seçin";

  const heroDatePart =
    valD != null
      ? formatDisplay != null
        ? formatDisplay(valD)
        : `${valD.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}, ${valD.toLocaleDateString("tr-TR", { weekday: "short" })}`
      : null;

  const ariaForTrigger = (typeof label === "string" ? label : "").trim() || "Tarih seçin";

  const carSearchTriggerClass =
    "flex h-auto min-h-0 w-full min-w-[140px] flex-col items-start justify-center rounded-none border-0 bg-transparent px-5 py-4 text-left shadow-none outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  const triggerClass =
    triggerClassName ??
    (carSearchFieldLabel != null
      ? carSearchTriggerClass
      : variant === "hero"
        ? "flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-neutral-200/90 bg-white px-3 text-left text-[13px] font-medium text-neutral-900 shadow-sm outline-none transition-[border-color,box-shadow] hover:border-accent/40 focus-visible:border-accent/50 focus-visible:ring-2 focus-visible:ring-accent/20"
        : compact
          ? `flex h-9 w-full min-w-[8.5rem] items-center justify-between gap-2 px-2.5 text-left text-xs sm:min-w-[9.5rem] sm:text-[13px] ${rentSelectTriggerClass}`
          : `flex h-10 w-full items-center justify-between gap-2 px-3 text-left text-sm ${rentSelectTriggerClass}`);

  const panelShellClass =
    variant === "hero"
      ? "isolate max-h-[min(72vh,560px)] overflow-hidden overflow-y-auto rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-[0_32px_90px_-36px_rgba(15,23,42,0.35)] ring-1 ring-black/[0.04]"
      : rentFloatingDropdownPanelClass;

  const cellLarge = variant === "hero";

  const panel = open && typeof window !== "undefined" && (
    <AnimatePresence>
      <motion.div
        ref={popoverRef}
        role="dialog"
        aria-label={ariaForTrigger}
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
        className={`${panelShellClass} ${variant === "default" ? "p-4 sm:p-5" : ""}`}
      >
        {isYmd ? (
          <>
            <div
              className={`mb-4 flex items-center justify-between gap-2 rounded-2xl border px-1 py-1 shadow-inner shadow-black/[0.02] backdrop-blur-md ${
                variant === "hero"
                  ? "border-neutral-200/80 bg-neutral-50/90"
                  : "border-border-subtle/25 bg-bg-raised/35"
              }`}
            >
              <button
                type="button"
                disabled={ymdStep === "year"}
                onClick={() => {
                  if (ymdStep === "month") setYmdStep("year");
                  else if (ymdStep === "day") setYmdStep("month");
                }}
                className={`flex size-8 items-center justify-center rounded-xl text-lg transition-colors duration-150 disabled:pointer-events-none disabled:opacity-25 ${
                  variant === "hero"
                    ? "text-neutral-700 hover:bg-neutral-100"
                    : "text-text hover:bg-bg-card/55 active:bg-bg-raised/50"
                }`}
                aria-label="Geri"
              >
                ‹
              </button>
              <span
                className={`min-w-0 flex-1 truncate px-2 py-1 text-center text-sm font-semibold capitalize ${
                  variant === "hero" ? "text-neutral-900" : "text-text"
                }`}
              >
                {ymdStep === "year" ? "Yıl seçin" : ymdStep === "month" ? String(year) : monthTitle}
              </span>
              <span className="inline-flex size-8 shrink-0" aria-hidden />
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={`ymd-${ymdStep}-${year}-${month}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={fadeMonth}
              >
                {ymdStep === "year" ? (
                  <div
                    className={`max-h-64 overflow-y-auto rounded-2xl border p-1.5 ${
                      variant === "hero"
                        ? "border-neutral-200/80 bg-neutral-50/80"
                        : "border-border-subtle/30 bg-bg-raised/25"
                    }`}
                  >
                    <div className={`grid grid-cols-4 ${variant === "hero" ? "gap-2" : "gap-1.5"}`}>
                      {yearOptions.map((yOpt) => (
                        <button
                          key={yOpt}
                          type="button"
                          onClick={() => {
                            setYear(yOpt);
                            setYmdStep("month");
                          }}
                          className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                            yOpt === year
                              ? "border-accent/35 bg-accent/16 text-accent"
                              : variant === "hero"
                                ? "border-neutral-200/70 bg-white text-neutral-800 hover:border-accent/30 hover:bg-neutral-50"
                                : "border-border-subtle/35 bg-bg-card/40 text-text hover:border-accent/25 hover:bg-bg-card/70"
                          }`}
                        >
                          {yOpt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : ymdStep === "month" ? (
                  <div
                    className={`rounded-2xl border p-2 ${
                      variant === "hero"
                        ? "border-neutral-200/80 bg-neutral-50/80"
                        : "border-border-subtle/30 bg-bg-raised/25"
                    }`}
                  >
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {MONTH_LABELS_TR.map((labelText, mi) => {
                        const ok = monthIntersectsAllowedRange(year, mi, minDate, maxDate);
                        return (
                          <button
                            key={labelText}
                            type="button"
                            disabled={!ok}
                            onClick={() => {
                              setMonth(mi);
                              setYmdStep("day");
                            }}
                            className={`rounded-lg border px-2 py-2 text-center text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-30 ${
                              ok && month === mi
                                ? "border-accent/35 bg-accent/16 text-accent"
                                : variant === "hero"
                                  ? "border-neutral-200/70 bg-white text-neutral-800 hover:border-accent/30 hover:bg-neutral-50"
                                  : "border-border-subtle/35 bg-bg-card/40 text-text hover:border-accent/25 hover:bg-bg-card/70"
                            }`}
                          >
                            {labelText}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <>
                    <div
                      className={`grid grid-cols-7 text-center font-semibold uppercase tracking-wide text-text-muted ${
                        variant === "hero"
                          ? "gap-1 py-2 text-[11px] sm:text-xs"
                          : "gap-0.5 py-1 text-[10px]"
                      }`}
                    >
                      {WEEKDAYS_TR.map((w) => (
                        <div key={w} className={variant === "hero" ? "py-1" : ""}>
                          {w}
                        </div>
                      ))}
                    </div>
                    <div
                      className={`grid grid-cols-7 ${variant === "hero" ? "mt-2 gap-1.5 sm:gap-2" : "mt-1 gap-1"}`}
                    >
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
                              large={cellLarge}
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
          </>
        ) : (
          <>
            <div
              className={`mb-4 flex items-center justify-between gap-2 rounded-2xl border px-1 py-1 shadow-inner shadow-black/[0.02] backdrop-blur-md ${
                variant === "hero"
                  ? "border-neutral-200/80 bg-neutral-50/90"
                  : "border-border-subtle/25 bg-bg-raised/35"
              }`}
            >
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
                className={`flex size-8 items-center justify-center rounded-xl text-lg transition-colors duration-150 disabled:pointer-events-none disabled:opacity-25 ${
                  variant === "hero"
                    ? "text-neutral-700 hover:bg-neutral-100"
                    : "text-text hover:bg-bg-card/55 active:bg-bg-raised/50"
                }`}
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
                  className={`min-w-0 flex-1 truncate rounded-lg px-2 py-1 text-center text-sm font-semibold capitalize transition-colors ${
                    variant === "hero"
                      ? "text-neutral-900 hover:bg-neutral-100"
                      : "text-text hover:bg-bg-card/55"
                  }`}
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
                className={`flex size-8 items-center justify-center rounded-xl text-lg transition-colors duration-150 disabled:pointer-events-none disabled:opacity-25 ${
                  variant === "hero"
                    ? "text-neutral-700 hover:bg-neutral-100"
                    : "text-text hover:bg-bg-card/55 active:bg-bg-raised/50"
                }`}
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
                  <div
                    className={`max-h-64 overflow-y-auto rounded-2xl border p-1.5 ${
                      variant === "hero"
                        ? "border-neutral-200/80 bg-neutral-50/80"
                        : "border-border-subtle/30 bg-bg-raised/25"
                    }`}
                  >
                    <div className={`grid grid-cols-4 ${variant === "hero" ? "gap-2" : "gap-1.5"}`}>
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
                              : variant === "hero"
                                ? "border-neutral-200/70 bg-white text-neutral-800 hover:border-accent/30 hover:bg-neutral-50"
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
                    <div
                      className={`grid grid-cols-7 text-center font-semibold uppercase tracking-wide text-text-muted ${
                        variant === "hero"
                          ? "gap-1 py-2 text-[11px] sm:text-xs"
                          : "gap-0.5 py-1 text-[10px]"
                      }`}
                    >
                      {WEEKDAYS_TR.map((w) => (
                        <div key={w} className={variant === "hero" ? "py-1" : ""}>
                          {w}
                        </div>
                      ))}
                    </div>
                    <div
                      className={`grid grid-cols-7 ${variant === "hero" ? "mt-2 gap-1.5 sm:gap-2" : "mt-1 gap-1"}`}
                    >
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
                              large={cellLarge}
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
          </>
        )}
        {variant === "hero" && onTimeChange != null && timeValue != null ? (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-neutral-200/80 pt-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-500">Saat</p>
              <p className="mt-0.5 text-xs text-neutral-400">08:00 – 23:30 arası, 30 dk aralıklarla</p>
            </div>
            <select
              value={timeValue}
              onChange={(e) => onTimeChange(e.target.value)}
              className="h-11 min-w-[7.25rem] cursor-pointer rounded-xl border border-neutral-200/90 bg-neutral-50 px-3 text-[15px] font-semibold tabular-nums text-neutral-900 outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/15"
              aria-label="Saat seçin"
            >
              {!HERO_HALF_HOUR_SLOTS.includes(timeValue) ? (
                <option value={timeValue}>{timeValue}</option>
              ) : null}
              {HERO_HALF_HOUR_SLOTS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </motion.div>
    </AnimatePresence>
  );

  return (
    <div className={`relative ${className}`}>
      {!compact && label && !hideSurfaceLabel && carSearchFieldLabel == null ? (
        <span className="mb-1 block text-[11px] font-medium text-text-muted">{label}</span>
      ) : null}
      <button
        ref={triggerRef}
        type="button"
        className={triggerClass}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={ariaForTrigger}
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
            if (pickMode === "yearMonthDay") {
              setYmdStep("year");
            }
            setOpen(true);
            queueMicrotask(updatePosition);
            return;
          }
          setOpen(false);
        }}
      >
        {carSearchFieldLabel != null ? (
          <span className="flex w-full min-w-0 flex-col items-start gap-0.5">
            <span className="text-xs font-medium text-muted-foreground">{carSearchFieldLabel}</span>
            <span className="flex items-center gap-2 text-base font-semibold text-foreground">
              <CalendarIcon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              {valD
                ? formatDisplay != null
                  ? formatDisplay(valD)
                  : format(valD, "d MMM, EEE", { locale: tr })
                : "Seçiniz"}
            </span>
          </span>
        ) : variant === "hero" && timeValue != null && heroScheduleTitle ? (
          <span className="flex min-w-0 flex-1 items-center gap-1.5 text-left sm:gap-2">
            <span className="shrink-0 font-semibold text-neutral-600">{heroScheduleTitle}</span>
            {heroDatePart ? (
              <>
                <span className="min-w-0 truncate font-medium text-neutral-900">{heroDatePart}</span>
                <span className="shrink-0 text-neutral-300" aria-hidden>
                  |
                </span>
                <span className="shrink-0 tabular-nums text-neutral-800">{timeValue}</span>
              </>
            ) : (
              <span className="truncate text-neutral-500">Tarih seçin</span>
            )}
          </span>
        ) : (
          <span className="truncate">
            {variant === "hero" && timeValue != null && valD
              ? `${formatDisplay != null ? formatDisplay(valD) : valD.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })} · ${timeValue}`
              : variant === "hero" && timeValue != null
                ? `— · ${timeValue}`
                : display}
          </span>
        )}
        {carSearchFieldLabel == null ? (
          <span
            className={`shrink-0 opacity-70 ${variant === "hero" ? "text-neutral-500" : "text-text-muted"}`}
            aria-hidden
          >
            ▾
          </span>
        ) : null}
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
  large,
  onPick,
}: {
  day: number;
  iso: string;
  value: string;
  minDate: string;
  maxDate?: string;
  large?: boolean;
  onPick: () => void;
}) {
  const disabled =
    compareIso(iso, minDate) < 0 || (maxDate != null && compareIso(iso, maxDate) > 0);
  const selected = iso === value;
  const today = toIsoDate(new Date());
  const isToday = iso === today;

  const freeCell = large
    ? "rounded-xl border border-neutral-200/80 bg-white text-neutral-800 shadow-sm hover:border-accent/35 hover:bg-neutral-50"
    : "rounded-xl border border-border-subtle/50 bg-bg-card/50 text-text shadow-sm backdrop-blur-sm hover:border-accent/28 hover:bg-bg-raised/60";

  const textSz = large ? "text-sm sm:text-[15px]" : "text-xs";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPick}
      className={`box-border flex h-full w-full min-w-0 items-center justify-center overflow-hidden rounded-xl font-semibold tabular-nums transition-[background-color,border-color,box-shadow,filter] duration-150 active:brightness-95 ${textSz} ${
        disabled
          ? "cursor-not-allowed text-text-muted/25"
          : selected
            ? "rounded-xl border border-btn-solid/45 bg-btn-solid text-btn-solid-fg shadow-md shadow-btn-solid/25 ring-1 ring-btn-solid/30 hover:brightness-105"
            : `${freeCell} hover:brightness-[1.01] ${isToday ? "ring-2 ring-inset ring-accent/45" : ""}`
      }`}
    >
      {day}
    </button>
  );
}
