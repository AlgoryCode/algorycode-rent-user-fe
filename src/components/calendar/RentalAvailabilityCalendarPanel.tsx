"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { blockedDaysInInclusiveRange, blockedSetForVehicle } from "@/data/availability";
import {
  WEEKDAYS_TR,
  calendarCells,
  compareIso,
  canGoPrevCalendar,
  canGoNextCalendar,
} from "@/lib/calendarGrid";
import { addDays, parseIsoDate, rentalNights, todayIso, toIsoDate } from "@/lib/dates";

export type RentalCalendarFooterMode = "modal" | "inline";

const maxAheadIso = toIsoDate(addDays(new Date(), 365));

/** Sakin, metin-dostu easing — blur / scale yok, subpixel titreme riski düşük */
const calEase = [0.22, 1, 0.36, 1] as const;

const fadeQuick = { duration: 0.18, ease: calEase };
const fadeMonth = { duration: 0.22, ease: calEase };

function defaultReturnIso(pickupIso: string) {
  const p = parseIsoDate(pickupIso) ?? new Date();
  return toIsoDate(addDays(p, 3));
}

export type RentalAvailabilityCalendarPanelProps = {
  vehicleId?: string | null;
  pickup: string;
  returnDate: string;
  /** Değişince taslak tarihler URL / üst bileşenle yeniden hizalanır */
  syncToken: string | number;
  footerMode: RentalCalendarFooterMode;
  onCommit: (pickup: string, ret: string) => void;
  onCancel?: () => void;
  className?: string;
  /** Modal başlığı; inline’da daha kısa metin */
  title?: string;
  subtitle?: string;
  /** aria-labelledby için (ör. modal sarmalayıcı) */
  headingId?: string;
  /** false: üstteki panel başlığı (h2) gizlenir; başlık üst bileşende verilir. */
  showPanelTitle?: boolean;
  /**
   * Araç detayı gibi dar sütunlarda ekstra sıkı yerleşim (masaüstü yoğunluk).
   * Rezervasyon sihirbazı / modal için vermeyin.
   */
  embedded?: boolean;
  /**
   * embedded ile birlikte: büyük ekranda dar sidebar ölçüleri yerine tam/orta hizalı,
   * okunabilir takvim (araç detay sayfası alt blok).
   */
  embeddedWide?: boolean;
  /**
   * `footerMode="inline"` iken "Sıfırla": verilmezse boş aralık bulunup `onCommit` ile yazılır (varsayılan).
   * Verilirse bunun yerine çağrılır (örn. araç detayında `alis` / `teslim` sorgu parametrelerini silmek).
   */
  onInlineReset?: () => void;
};

export function RentalAvailabilityCalendarPanel({
  vehicleId,
  pickup,
  returnDate,
  syncToken,
  footerMode,
  onCommit,
  onCancel,
  className = "",
  title,
  subtitle,
  headingId,
  showPanelTitle = true,
  embedded = false,
  embeddedWide = false,
  onInlineReset,
}: RentalAvailabilityCalendarPanelProps) {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [a, setA] = useState(pickup || todayIso());
  const [b, setB] = useState(returnDate || defaultReturnIso(pickup || todayIso()));
  const [phase, setPhase] = useState<"pickStart" | "pickEnd">("pickStart");
  const [error, setError] = useState<string | null>(null);

  const blocked = useMemo(
    () => blockedSetForVehicle(vehicleId ?? null),
    [vehicleId],
  );
  const minD = parseIsoDate(todayIso())!;

  useEffect(() => {
    queueMicrotask(() => {
      setError(null);
      const pTrim = pickup.trim();
      const rTrim = returnDate.trim();

      if (!pTrim && !rTrim) {
        const t = todayIso();
        setA(t);
        setB(t);
        setPhase("pickStart");
        const pd = parseIsoDate(t);
        if (pd) {
          setYear(pd.getFullYear());
          setMonth(pd.getMonth());
        }
        return;
      }

      const p = pTrim || todayIso();
      const r =
        rTrim && compareIso(rTrim, p) >= 0 ? rTrim : defaultReturnIso(p);
      setA(p);
      setB(r);
      setPhase("pickStart");
      const pd = parseIsoDate(p);
      if (pd) {
        setYear(pd.getFullYear());
        setMonth(pd.getMonth());
      }
    });
  }, [syncToken, pickup, returnDate]);

  const monthTitle = new Date(year, month, 1).toLocaleDateString("tr-TR", {
    month: "long",
    year: "numeric",
  });

  const cells = calendarCells(year, month);

  const tryApply = (fromIso: string, toIso: string) => {
    if (compareIso(toIso, fromIso) <= 0) {
      setError("Teslim günü alıştan en az 1 gün sonra olmalı.");
      return false;
    }
    const overlap = blockedDaysInInclusiveRange(fromIso, toIso, blocked);
    if (overlap.length > 0) {
      const fmt = overlap.slice(0, 4).map((d) =>
        parseIsoDate(d)!.toLocaleDateString("tr-TR", { day: "numeric", month: "short" }),
      );
      const more = overlap.length > 4 ? ` +${overlap.length - 4}` : "";
      setError(
        `Seçtiğiniz aralıkta araç dolu görünen günler var: ${fmt.join(", ")}${more}. Lütfen aralığı değiştirin.`,
      );
      return false;
    }
    setError(null);
    onCommit(fromIso, toIso);
    return true;
  };

  const firstClearRange = (): { from: string; to: string } | null => {
    const t = todayIso();
    const base = parseIsoDate(t);
    if (!base) return null;
    for (let add = 3; add <= 60; add++) {
      const to = toIsoDate(addDays(base, add));
      if (blockedDaysInInclusiveRange(t, to, blocked).length === 0) return { from: t, to };
    }
    return null;
  };

  const handleDayClick = (day: number) => {
    const iso = toIsoDate(new Date(year, month, day));
    if (compareIso(iso, todayIso()) < 0) return;
    if (blocked.has(iso)) return;
    setError(null);

    if (phase === "pickStart") {
      setA(iso);
      setB(iso);
      setPhase("pickEnd");
      return;
    }

    let from = a;
    let to = iso;
    if (compareIso(to, from) < 0) {
      const t = from;
      from = to;
      to = t;
    }

    if (compareIso(to, from) === 0) {
      setError("Tek gün kiralama desteklenmiyor. Teslim günü alıştan en az 1 gün sonra olmalı.");
      return;
    }

    setA(from);
    setB(to);
    setPhase("pickStart");
    if (footerMode === "inline") tryApply(from, to);
  };

  const inPreviewRange = (iso: string) => {
    const from = compareIso(a, b) <= 0 ? a : b;
    const to = compareIso(a, b) <= 0 ? b : a;
    return compareIso(iso, from) >= 0 && compareIso(iso, to) <= 0;
  };

  const apply = () => {
    tryApply(a, b);
  };

  const clearSelection = () => {
    setPhase("pickStart");
    setError(null);
    if (footerMode === "inline") {
      if (onInlineReset) {
        const t = todayIso();
        setA(t);
        setB(t);
        onInlineReset();
        return;
      }
      const r = firstClearRange();
      if (r) {
        setA(r.from);
        setB(r.to);
        onCommit(r.from, r.to);
      } else {
        setError("Şu an için uygun boş aralık bulunamadı; takvimden manuel seçin.");
      }
      return;
    }
    const t = todayIso();
    setA(t);
    setB(toIsoDate(addDays(new Date(), 3)));
  };

  const headTitle =
    title ??
    (footerMode === "inline" ? "Rezervasyon tarihi seç" : "Tarih seçimi");
  const headSubtitle =
    subtitle ??
    (footerMode === "inline"
      ? "Dolu günler seçilemez. Aralıkta önce alış, sonra teslim gününe tıklayın."
      : "Dolu günler seçilemez. Aralıkta önce alış, sonra teslim gününe tıklayın.");

  const wideEmbedded = Boolean(embedded && embeddedWide);
  const tight = embedded && !wideEmbedded;

  const rootLayoutClass = wideEmbedded
    ? "min-w-0 w-full max-w-full"
    : tight
      ? "lg:max-w-[18rem] lg:rounded-xl lg:shadow-sm"
      : "lg:max-w-sm";

  return (
    <div
      className={`relative box-border flex min-w-0 w-full max-w-full flex-col overflow-x-clip rounded-2xl border border-border-subtle/80 bg-transparent ${rootLayoutClass} ${className}`}
    >
      <div
        className={`relative border-b border-border-subtle/80 bg-transparent px-4 py-3 sm:px-5 sm:py-4 ${tight ? "lg:px-2 lg:py-2" : "lg:px-3.5 lg:py-2.5"}`}
      >
        <div className="flex items-start justify-between gap-2">
          {showPanelTitle !== false && (
            <h2
              id={headingId}
              className={`font-display text-lg text-text sm:text-xl ${tight ? "lg:text-sm" : "lg:text-base"}`}
            >
              {headTitle}
            </h2>
          )}
          <button
            type="button"
            onClick={clearSelection}
            className="rounded-md border border-border-subtle bg-bg-card/40 px-2.5 py-1 text-[11px] text-text-muted transition-colors hover:border-accent/30 hover:text-text"
          >
            Sıfırla
          </button>
        </div>
        <p
          className={`mt-1 text-[11px] leading-relaxed text-text-muted sm:text-xs lg:text-[11px] lg:leading-snug ${tight ? "lg:line-clamp-2" : ""}`}
        >
          {headSubtitle}
        </p>
        {!vehicleId && (
          <p className="mt-2 text-[10px] text-text-muted sm:text-[11px] lg:mt-1.5 lg:text-[10px]">
            Tüm filo için birleşik doluluk gösterimi (demo).
          </p>
        )}
      </div>

      <div
        className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 border-b border-border-subtle/80 bg-transparent px-3 py-2 text-[10px] text-text-muted sm:text-[11px] lg:text-[10px] ${tight ? "lg:gap-x-2 lg:gap-y-0.5 lg:px-2 lg:py-1" : "lg:gap-x-3 lg:gap-y-1 lg:px-2.5 lg:py-1.5"}`}
      >
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm border border-border-subtle bg-transparent" />
          Müsait
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="cal-legend-blocked-swatch size-2.5 shrink-0" aria-hidden />
          Dolu
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-accent ring-1 ring-accent/45" />
          Seçim
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-orange-500/90" />
          Bugün
        </span>
      </div>

      <div className={`min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4 ${tight ? "lg:px-1.5 lg:py-1.5" : "lg:px-2.5 lg:py-2"}`}>
        <div className="mb-3 flex items-center justify-between rounded-xl border border-border-subtle/70 bg-transparent px-1 py-1 lg:mb-2 lg:rounded-lg">
          <button
            type="button"
            disabled={!canGoPrevCalendar(year, month, minD)}
            onClick={() => {
              if (month === 0) {
                setMonth(11);
                setYear((y) => y - 1);
              } else setMonth((m) => m - 1);
            }}
            className={`flex size-9 items-center justify-center rounded-lg border border-transparent text-lg text-text transition-colors duration-150 hover:border-border-subtle hover:bg-bg-card active:bg-bg-raised disabled:pointer-events-none disabled:opacity-25 ${tight ? "lg:size-7 lg:text-sm" : "lg:size-8 lg:text-base"}`}
          >
            ‹
          </button>
          <AnimatePresence mode="wait">
            <motion.span
              key={`${year}-${month}-title`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={fadeQuick}
              className={`min-w-0 flex-1 truncate text-center text-sm font-semibold capitalize text-text ${tight ? "lg:text-[11px]" : "lg:text-xs"}`}
            >
              {monthTitle}
            </motion.span>
          </AnimatePresence>
          <button
            type="button"
            disabled={!canGoNextCalendar(year, month, maxAheadIso)}
            onClick={() => {
              if (month === 11) {
                setMonth(0);
                setYear((y) => y + 1);
              } else setMonth((m) => m + 1);
            }}
            className={`flex size-9 items-center justify-center rounded-lg border border-transparent text-lg text-text transition-colors duration-150 hover:border-border-subtle hover:bg-bg-card active:bg-bg-raised disabled:pointer-events-none disabled:opacity-25 ${tight ? "lg:size-7 lg:text-sm" : "lg:size-8 lg:text-base"}`}
          >
            ›
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${year}-${month}-layer`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fadeMonth}
          >
            <div
              className={`grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium uppercase tracking-wide text-text-muted/90 ${tight ? "lg:text-[8px]" : "lg:text-[9px]"}`}
            >
              {WEEKDAYS_TR.map((w) => (
                <div key={w} className={`py-1.5 ${tight ? "lg:py-0.5" : "lg:py-1"}`}>
                  {w}
                </div>
              ))}
            </div>
            <div className={`mt-1 grid grid-cols-7 gap-1 sm:gap-1.5 lg:mt-0.5 ${tight ? "lg:gap-px" : "lg:gap-0.5"}`}>
              {cells.map((cell, i) =>
                cell == null ? (
                  <div key={`e-${i}`} className="aspect-square min-w-0" aria-hidden />
                ) : (
                  <div key={`${year}-${month}-${cell}`} className="aspect-square min-w-0">
                    <AvailabilityCalendarDay
                      embedded={tight}
                      day={cell}
                      iso={toIsoDate(new Date(year, month, cell))}
                      blocked={blocked.has(toIsoDate(new Date(year, month, cell)))}
                      disabledPast={compareIso(toIsoDate(new Date(year, month, cell)), todayIso()) < 0}
                      selectedStart={a}
                      selectedEnd={b}
                      inRange={inPreviewRange(toIsoDate(new Date(year, month, cell)))}
                      onClick={() => handleDayClick(cell)}
                    />
                  </div>
                ),
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        <motion.div
          key={`${a}-${b}-summary`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={fadeQuick}
          className={`mt-4 rounded-xl border border-border-subtle/80 bg-transparent px-3 py-2.5 text-xs text-text-muted lg:mt-3 lg:rounded-lg ${tight ? "lg:px-2 lg:py-1.5 lg:text-[10px]" : "lg:px-2.5 lg:py-2 lg:text-[11px]"}`}
        >
          <p>
            <span className="text-text">Alış:</span>{" "}
            {parseIsoDate(a)?.toLocaleDateString("tr-TR", {
              weekday: "short",
              day: "numeric",
              month: "long",
              year: "numeric",
            }) ?? "—"}
          </p>
          <p className="mt-1">
            <span className="text-text">Teslim:</span>{" "}
            {parseIsoDate(b)?.toLocaleDateString("tr-TR", {
              weekday: "short",
              day: "numeric",
              month: "long",
              year: "numeric",
            }) ?? "—"}
          </p>
          {(() => {
            const da = parseIsoDate(a);
            const db = parseIsoDate(b);
            if (!da || !db || db < da) return null;
            const n = rentalNights(da, db);
            return (
              <p className="mt-1.5 inline-flex rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 font-medium text-accent">
                {n} gün kiralama
              </p>
            );
          })()}
          {phase === "pickEnd" && (
            <p className="mt-1 text-[11px] text-accent">Teslim gününü seçin (en az 1 gün sonrası).</p>
          )}
        </motion.div>

        <AnimatePresence>
          {error ? (
            <motion.div
              key="calendar-error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={fadeQuick}
              className="mt-3 rounded-lg border border-accent/35 bg-accent/10 px-3 py-2 text-xs leading-relaxed text-text lg:mt-2 lg:px-2.5 lg:py-1.5 lg:text-[11px]"
            >
              {error}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {footerMode === "modal" && (
        <div
          className={`flex flex-wrap gap-2 border-t border-border-subtle/80 bg-transparent px-3 py-3 sm:px-4 lg:gap-1.5 ${tight ? "lg:px-2 lg:py-1.5" : "lg:px-2.5 lg:py-2"}`}
        >
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-border-subtle bg-bg-card/40 px-3 py-2 text-xs text-text-muted shadow-sm transition-colors duration-150 hover:bg-bg-card active:bg-bg-raised sm:px-4 sm:text-sm lg:px-2.5 lg:py-1.5 lg:text-[11px]"
            >
              İptal
            </button>
          )}
          <button
            type="button"
            onClick={apply}
            className="ml-auto rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white shadow-md shadow-accent/20 transition-[filter] duration-150 hover:brightness-105 active:brightness-95 sm:px-5 sm:text-sm lg:px-3 lg:py-1.5 lg:text-[11px]"
          >
            Uygula
          </button>
      </div>
      )}
    </div>
  );
}

function AvailabilityCalendarDay({
  embedded = false,
  day,
  iso,
  blocked,
  disabledPast,
  selectedStart,
  selectedEnd,
  inRange,
  onClick,
}: {
  embedded?: boolean;
  day: number;
  iso: string;
  blocked: boolean;
  disabledPast: boolean;
  selectedStart: string;
  selectedEnd: string;
  inRange: boolean;
  onClick: () => void;
}) {
  const isStart = iso === selectedStart;
  const isEnd = iso === selectedEnd;
  const sameDaySelection = isStart && isEnd;

  if (blocked) {
    return (
      <div
        title="Dolu — seçilemez"
        className={`cal-cell-blocked-fill relative flex h-full w-full min-w-0 items-center justify-center overflow-hidden rounded-xl border text-xs font-medium tabular-nums [border-color:var(--cal-blocked-border)] lg:rounded-lg ${embedded ? "lg:text-[9px]" : "lg:text-[10px]"}`}
      >
        <span className="leading-none text-[color:var(--cal-blocked-day)]">{day}</span>
        <span
          className={`pointer-events-none absolute bottom-1 left-0 right-0 text-center text-[9px] font-bold uppercase leading-none tracking-wide text-[color:var(--cal-blocked-label)] lg:bottom-0.5 ${embedded ? "lg:text-[6px]" : "lg:text-[7px]"}`}
        >
          Dolu
        </span>
      </div>
    );
  }

  const disabled = disabledPast;
  const today = todayIso();
  const isToday = iso === today;

  /** Müsait: site yüzeyleri */
  const freeCell =
    "border border-border-subtle/80 bg-transparent text-text hover:border-accent/30";

  const todayRing = isToday ? "ring-1 ring-inset ring-orange-400 border-orange-400/70 bg-orange-500/10" : "";

  /** Alış / teslim uçları: aynı accent; metin hücre içinde ayrışır */
  const edgeCell =
    "z-[1] border border-accent/55 bg-accent font-semibold text-white shadow-md shadow-accent/25 ring-1 ring-accent/35 hover:brightness-105";

  let stateClass: string;
  let cellLabel: "alis" | "teslim" | "ikisi" | null = null;

  if (disabled) {
    stateClass = "cursor-not-allowed text-text-muted/25";
  } else if (sameDaySelection) {
    stateClass = edgeCell;
    cellLabel = "ikisi";
  } else if (isStart) {
    stateClass = edgeCell;
    cellLabel = "alis";
  } else if (isEnd) {
    stateClass = edgeCell;
    cellLabel = "teslim";
  } else if (inRange) {
    stateClass =
      "border border-accent/25 bg-accent/[0.12] text-text hover:border-accent/40 hover:bg-accent/[0.16]";
  } else {
    stateClass = `${freeCell} hover:brightness-[1.01] ${todayRing}`;
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`relative box-border flex h-full w-full min-w-0 items-center justify-center overflow-hidden rounded-xl text-xs font-medium tabular-nums transition-[background-color,border-color,box-shadow,filter,transform] duration-150 active:scale-[0.98] lg:rounded-lg ${embedded ? "lg:text-[9px]" : "lg:text-[10px]"} ${stateClass}`}
    >
      <span className="leading-none">{day}</span>
      {cellLabel === "alis" && (
        <span
          className={`pointer-events-none absolute bottom-1 left-0 right-0 text-center text-[9px] font-bold uppercase leading-none tracking-wide text-white lg:bottom-0.5 ${embedded ? "lg:text-[6px]" : "lg:text-[7px]"}`}
        >
          Alış
        </span>
      )}
      {cellLabel === "teslim" && (
        <span
          className={`pointer-events-none absolute bottom-1 left-0 right-0 text-center text-[9px] font-bold uppercase leading-none tracking-wide text-white lg:bottom-0.5 ${embedded ? "lg:text-[6px]" : "lg:text-[7px]"}`}
        >
          Teslim
        </span>
      )}
      {cellLabel === "ikisi" && (
        <span
          className={`pointer-events-none absolute bottom-0.5 left-0 right-0 flex flex-col items-center gap-0 text-center text-[8px] font-bold uppercase leading-tight tracking-wide text-white ${embedded ? "lg:text-[5.5px]" : "lg:text-[6.5px]"}`}
        >
          <span>Alış</span>
          <span>Teslim</span>
        </span>
      )}
    </button>
  );
}
