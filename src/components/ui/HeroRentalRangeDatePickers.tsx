"use client";

import { motion } from "framer-motion";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { calendarCells, compareIso, monthStart } from "@/lib/calendarGrid";
import { trHolidayDotSetForRange, trHolidaysOverlappingRange } from "@/data/trPublicHolidays";
import { addDays, parseIsoDate, rentalNights, toIsoDate } from "@/lib/dates";
import { HERO_HALF_HOUR_SLOTS } from "@/components/ui/DayPickerPopover";

const WEEKDAYS_FULL = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cts", "Paz"] as const;
const calEase = [0.22, 1, 0.36, 1] as const;
/** Masaüstü portal: viewport genişliği; flex hücresi (~393px) takvimi sıkıştırmasın */
const DESKTOP_RANGE_PANEL_MAX_W = 920;
const DESKTOP_RANGE_PANEL_VIEWPORT_GUTTER = 24;
/** Hero arama kartı dikey (`lg:hidden`, viewport < 1024px): takvim tam ekran; yatay çubukta popover. */
const MOBILE_FULLSCREEN_PANEL_MQ = "(max-width: 1023px)";

function subscribeMobileFullscreenPanel(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia(MOBILE_FULLSCREEN_PANEL_MQ);
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getMobileFullscreenPanelSnapshot() {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MOBILE_FULLSCREEN_PANEL_MQ).matches;
}

function getMobileFullscreenPanelServerSnapshot() {
  return false;
}

function nextMonth(y: number, m: number) {
  return m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 };
}

function prevMonth(y: number, m: number) {
  return m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 };
}

function canGoPrev(leftY: number, leftM: number, minD: Date) {
  const prev = prevMonth(leftY, leftM);
  const first = monthStart(prev.y, prev.m).getTime();
  const minFirst = monthStart(minD.getFullYear(), minD.getMonth()).getTime();
  return first >= minFirst;
}

function canGoNext(leftY: number, leftM: number, maxDateStr: string | undefined) {
  if (!maxDateStr) return true;
  const maxP = parseIsoDate(maxDateStr);
  if (!maxP) return true;
  const n = nextMonth(leftY, leftM);
  const lastRight = new Date(n.y, n.m + 1, 0);
  return lastRight.getTime() <= maxP.getTime();
}

function heroDateButtonLabel(iso: string | null) {
  if (!iso) return "Tarih seçin";
  const d = parseIsoDate(iso);
  if (!d) return "Tarih seçin";
  return `${d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}, ${d.toLocaleDateString("tr-TR", { weekday: "short" })}`;
}

const heroDateBtnClass =
  "flex h-9 min-h-[40px] min-w-0 cursor-pointer items-center justify-between gap-1 rounded-md border border-neutral-200/90 bg-white px-2 text-left text-[11px] font-medium text-neutral-900 shadow-sm outline-none transition-[border-color,box-shadow] hover:border-accent/40 focus-visible:border-accent/50 focus-visible:ring-2 focus-visible:ring-accent/20 min-[380px]:h-10 min-[380px]:gap-1.5 min-[380px]:rounded-lg min-[380px]:px-2.5 min-[380px]:text-[12px] sm:min-h-[44px] sm:px-3 sm:text-[12px] md:h-11 md:text-[13px] w-full sm:flex-1 md:flex-1 lg:flex-none lg:w-fit dark:border-white/12 dark:bg-bg-deep/85 dark:text-text";

const heroTimeSelectClass =
  "h-9 min-h-[40px] cursor-pointer appearance-none rounded-md border border-neutral-200/90 bg-white bg-[length:9px_5px] bg-[position:right_8px_center] bg-no-repeat px-2 pr-7 text-center text-[11px] font-semibold tabular-nums text-neutral-900 outline-none transition-[border-color,box-shadow] focus:border-accent/50 focus:ring-2 focus:ring-accent/15 w-full sm:w-auto sm:min-w-[5.75rem] min-[380px]:h-10 min-[380px]:min-w-[6.25rem] min-[380px]:rounded-lg min-[380px]:bg-[length:10px_6px] min-[380px]:bg-[position:right_10px_center] min-[380px]:px-2.5 min-[380px]:pr-8 min-[380px]:text-[12px] sm:min-h-[44px] md:h-11 md:min-w-[6.5rem] md:px-3 md:pr-9 md:text-[13px] lg:shrink-0 dark:border-white/12 dark:bg-bg-deep/85 dark:text-text";

const chevronSvg =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")";

/** Hero arama çubuğu / kart: kompakt tarih + saat; tek portalda iki ay. */
const searchBarDateBtnClass =
  "flex h-10 min-h-[44px] w-full min-w-0 cursor-pointer items-center justify-between gap-1.5 rounded-lg border border-neutral-200/90 bg-white px-2.5 text-left text-sm font-medium text-neutral-900 shadow-sm outline-none transition-[border-color,box-shadow] hover:border-accent/40 focus-visible:border-accent/50 focus-visible:ring-2 focus-visible:ring-accent/20 dark:border-white/12 dark:bg-bg-deep/85 dark:text-text lg:h-9 lg:min-h-0 lg:px-2 lg:text-[13px]";

const searchBarTimeSelectClass =
  "flex h-10 min-h-[44px] w-[5.65rem] shrink-0 cursor-pointer appearance-none items-center rounded-lg border border-neutral-200/90 bg-white bg-[length:10px_6px] bg-[position:right_8px_center] bg-no-repeat px-2.5 pr-8 text-sm font-semibold tabular-nums text-neutral-900 shadow-sm outline-none transition-[border-color,box-shadow] hover:border-accent/40 focus-visible:border-accent/50 focus-visible:ring-2 focus-visible:ring-accent/20 dark:border-white/12 dark:bg-bg-deep/85 dark:text-text lg:h-9 lg:min-h-0 lg:w-[5.35rem]";

/** Dar yan panel (ör. filtre sütunu): daha alçak satırlar. */
const searchBarDateBtnCompactClass =
  "flex h-8 min-h-0 min-w-0 flex-1 cursor-pointer items-center justify-between gap-1 rounded-md bg-neutral-100/90 px-2 text-left text-[11px] font-medium leading-tight text-neutral-900 outline-none transition-[background-color,box-shadow] hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-accent/30 dark:bg-white/[0.08] dark:text-text dark:hover:bg-white/[0.12]";

const searchBarTimeSelectCompactClass =
  "flex h-8 min-h-0 w-[4.65rem] shrink-0 cursor-pointer appearance-none items-center rounded-md bg-neutral-100/90 bg-[length:9px_5px] bg-[position:right_5px_center] bg-no-repeat px-1.5 pr-6 text-[11px] font-semibold tabular-nums text-neutral-900 shadow-none outline-none transition-[background-color,box-shadow] hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-accent/30 dark:bg-white/[0.08] dark:text-text dark:hover:bg-white/[0.12] [color-scheme:light] dark:[color-scheme:dark]";

const searchBarFieldLabel =
  "text-xs font-medium text-neutral-500 dark:text-text-muted";

type Props = {
  minDate: string;
  maxDate?: string;
  pickupDate: string;
  returnDate: string;
  onRangeCommit: (pickupIso: string, returnIso: string) => void;
  pickTime: string;
  returnTime: string;
  onPickTime: (t: string) => void;
  onReturnTime: (t: string) => void;
  className?: string;
  /** Hero segment: ince “Alış / Bırakış tarihi” satırları; açılan panel ortak. `inline`: çift ay, anasayfadaki aralık seçimi (rezervasyon / modal). */
  layout?: "default" | "heroSearchBar" | "inline";
  /** Dolu günler — tıklanamaz; aralıkta varsa commit reddedilir. */
  blockedDates?: Set<string>;
  /** Gerçek araç müsaitliği yüklenirken takvimi geçici kilitle (yanlış seçim önlenir). */
  blockedDatesLoading?: boolean;
  /** Alış ≤ teslim varsayımıyla çağrılır; hata metni veya `null`. */
  onValidateRange?: (pickupIso: string, returnIso: string) => string | null;
  /** `true` iken inline panelde saat seçicileri gösterilmez (ör. sadece tarih modalı). */
  hideTimeSelects?: boolean;
  /** `layout="inline"` iken üst başlık (örn. modal dış çerçevede başlık varsa `hideInlineTitle`). */
  inlineTitle?: string;
  hideInlineTitle?: boolean;
  /** `layout="inline"` iken dış çerçeve + padding (modal içinde false). */
  inlineFramed?: boolean;
  /** `layout="inline"` iken gösterilecek ay sayısı (rezervasyon: 1). */
  inlineMonthCount?: 1 | 2;
  /** `layout="heroSearchBar"` iken daha düşük satırlar (dar yan panel). */
  compact?: boolean;
  /**
   * Masaüstü açılır takvim: `center` tetikleyicinin altında ortalanır (varsayılan);
   * `left` sol kenarı hizalar, panel sağa doğru genişler (dar yan panel).
   */
  desktopPopoverAlign?: "center" | "left";
};

function eachIsoInInclusiveRange(fromIso: string, toIso: string, visit: (iso: string) => void) {
  const lo = compareIso(fromIso, toIso) <= 0 ? fromIso : toIso;
  const hi = compareIso(fromIso, toIso) <= 0 ? toIso : fromIso;
  let cur = parseIsoDate(lo);
  const end = parseIsoDate(hi);
  if (!cur || !end) return;
  while (cur.getTime() <= end.getTime()) {
    visit(toIsoDate(cur));
    cur = addDays(cur, 1);
  }
}

export function HeroRentalRangeDatePickers({
  minDate,
  maxDate,
  pickupDate,
  returnDate,
  onRangeCommit,
  pickTime,
  returnTime,
  onPickTime,
  onReturnTime,
  className = "",
  layout = "default",
  blockedDates,
  blockedDatesLoading = false,
  onValidateRange,
  hideTimeSelects = false,
  inlineTitle = "Takvim",
  hideInlineTitle = false,
  inlineFramed = true,
  inlineMonthCount = 2,
  compact = false,
  desktopPopoverAlign = "center",
}: Props) {
  const [open, setOpen] = useState(false);
  const [anchorIso, setAnchorIso] = useState<string | null>(null);
  /** Hangi tarih alanından panel açıldı; aynı güne ikinci tıkta bu uç güncellenir. */
  const [openFrom, setOpenFrom] = useState<"pickup" | "return" | null>(null);
  const [rangeCommitError, setRangeCommitError] = useState<string | null>(null);
  const [leftYM, setLeftYM] = useState(() => {
    const p = parseIsoDate(pickupDate);
    if (p) return { y: p.getFullYear(), m: p.getMonth() };
    const t = parseIsoDate(minDate) ?? new Date();
    return { y: t.getFullYear(), m: t.getMonth() };
  });

  const anchorRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const desktopPosRafRef = useRef<number | null>(null);
  const [desktopFixedLayout, setDesktopFixedLayout] = useState<{
    top: number;
    left: number;
    panelWidth: number;
    anchor: "center" | "left";
  }>({
    top: 0,
    left: 0,
    panelWidth: DESKTOP_RANGE_PANEL_MAX_W,
    anchor: "center",
  });

  const minD = parseIsoDate(minDate) ?? new Date(2000, 0, 1);
  const rightYM = useMemo(() => nextMonth(leftYM.y, leftYM.m), [leftYM]);
  const inlineSingleMonth = layout === "inline" && inlineMonthCount === 1;

  const visibleFromIso = useMemo(
    () => toIsoDate(new Date(leftYM.y, leftYM.m, 1)),
    [leftYM.y, leftYM.m],
  );
  const visibleToIso = useMemo(() => {
    if (inlineSingleMonth) {
      return toIsoDate(new Date(leftYM.y, leftYM.m + 1, 0));
    }
    return toIsoDate(new Date(rightYM.y, rightYM.m + 1, 0));
  }, [inlineSingleMonth, leftYM.y, leftYM.m, rightYM.y, rightYM.m]);

  const dotSet = useMemo(
    () => trHolidayDotSetForRange(visibleFromIso, visibleToIso),
    [visibleFromIso, visibleToIso],
  );

  const legendItems = useMemo(
    () => trHolidaysOverlappingRange(visibleFromIso, visibleToIso),
    [visibleFromIso, visibleToIso],
  );

  const visibleMonthsLabel = useMemo(() => {
    if (inlineSingleMonth) {
      return new Date(leftYM.y, leftYM.m, 1).toLocaleDateString("tr-TR", {
        month: "long",
        year: "numeric",
      });
    }
    const a = new Date(leftYM.y, leftYM.m, 1).toLocaleDateString("tr-TR", { month: "long" });
    const b = new Date(rightYM.y, rightYM.m, 1).toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
    return `${a} – ${b}`;
  }, [inlineSingleMonth, leftYM.y, leftYM.m, rightYM.y, rightYM.m]);

  const navAriaPrev = inlineSingleMonth ? "Önceki ay" : "Önceki aylar";
  const navAriaNext = inlineSingleMonth ? "Sonraki ay" : "Sonraki aylar";

  const isMobileFullscreenPanel = useSyncExternalStore(
    subscribeMobileFullscreenPanel,
    getMobileFullscreenPanelSnapshot,
    getMobileFullscreenPanelServerSnapshot,
  );

  const closePanel = useCallback(() => {
    if (layout === "inline") {
      setAnchorIso(null);
      setOpenFrom(null);
      return;
    }
    setOpen(false);
    setAnchorIso(null);
    setOpenFrom(null);
  }, [layout]);

  const updateDesktopPortalPosition = useCallback(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia(MOBILE_FULLSCREEN_PANEL_MQ).matches) return;
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const panelWidth = Math.min(
      DESKTOP_RANGE_PANEL_MAX_W,
      Math.max(280, Math.round(vw - DESKTOP_RANGE_PANEL_VIEWPORT_GUTTER)),
    );
    const edge = DESKTOP_RANGE_PANEL_VIEWPORT_GUTTER / 2;
    const top = Math.round(r.bottom + 8);
    if (desktopPopoverAlign === "left") {
      const minL = Math.max(4, edge / 2);
      const maxL = Math.max(minL, vw - panelWidth - edge);
      const leftPx = Math.round(Math.min(maxL, Math.max(minL, r.left)));
      setDesktopFixedLayout({
        top,
        left: leftPx,
        panelWidth,
        anchor: "left",
      });
      return;
    }
    const half = panelWidth / 2;
    const rawCenter = r.left + r.width / 2;
    const leftCenter = Math.round(Math.min(vw - half - edge, Math.max(half + edge, rawCenter)));
    setDesktopFixedLayout({
      top,
      left: leftCenter,
      panelWidth,
      anchor: "center",
    });
  }, [desktopPopoverAlign]);

  const scheduleDesktopPortalPosition = useCallback(() => {
    if (desktopPosRafRef.current != null) return;
    desktopPosRafRef.current = requestAnimationFrame(() => {
      desktopPosRafRef.current = null;
      updateDesktopPortalPosition();
    });
  }, [updateDesktopPortalPosition]);

  useLayoutEffect(() => {
    if (!open) return;
    if (typeof window !== "undefined" && window.matchMedia(MOBILE_FULLSCREEN_PANEL_MQ).matches) return;
    updateDesktopPortalPosition();
    window.addEventListener("resize", updateDesktopPortalPosition);
    window.addEventListener("scroll", scheduleDesktopPortalPosition, { capture: true, passive: true });
    return () => {
      if (desktopPosRafRef.current != null) {
        cancelAnimationFrame(desktopPosRafRef.current);
        desktopPosRafRef.current = null;
      }
      window.removeEventListener("resize", updateDesktopPortalPosition);
      window.removeEventListener("scroll", scheduleDesktopPortalPosition, true);
    };
  }, [
    open,
    updateDesktopPortalPosition,
    scheduleDesktopPortalPosition,
    leftYM,
    isMobileFullscreenPanel,
    desktopPopoverAlign,
  ]);

  useEffect(() => {
    if (layout === "inline") return;
    if (!open || !isMobileFullscreenPanel) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [layout, open, isMobileFullscreenPanel]);

  useEffect(() => {
    if (layout !== "inline") return;
    setAnchorIso(null);
    setOpenFrom(null);
    setRangeCommitError(null);
    const p = parseIsoDate(pickupDate);
    if (p) setLeftYM({ y: p.getFullYear(), m: p.getMonth() });
  }, [layout, pickupDate, returnDate]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (anchorRef.current?.contains(t)) return;
      if (popoverRef.current?.contains(t)) return;
      closePanel();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePanel();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, closePanel]);

  const openPanel = (from: "pickup" | "return") => {
    const p = parseIsoDate(pickupDate);
    if (p) setLeftYM({ y: p.getFullYear(), m: p.getMonth() });
    setAnchorIso(null);
    setOpenFrom(from);
    setOpen(true);
    queueMicrotask(updateDesktopPortalPosition);
  };

  const validateBlockedInRange = (fromIso: string, toIso: string): string | null => {
    if (!blockedDates || blockedDates.size === 0) return null;
    let hit: string | null = null;
    eachIsoInInclusiveRange(fromIso, toIso, (iso) => {
      if (blockedDates.has(iso)) hit = iso;
    });
    if (!hit) return null;
    const d = parseIsoDate(hit);
    const label = d ? d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" }) : hit;
    return `Seçtiğiniz aralıkta dolu günler var (${label}). Lütfen aralığı değiştirin.`;
  };

  const finishRange = (pickupIso: string, returnIso: string) => {
    const lo = compareIso(pickupIso, returnIso) <= 0 ? pickupIso : returnIso;
    const hi = compareIso(pickupIso, returnIso) <= 0 ? returnIso : pickupIso;
    const blockedMsg = validateBlockedInRange(lo, hi);
    if (blockedMsg) {
      setRangeCommitError(blockedMsg);
      setAnchorIso(null);
      return;
    }
    const custom = onValidateRange?.(pickupIso, returnIso) ?? null;
    if (custom) {
      setRangeCommitError(custom);
      setAnchorIso(null);
      return;
    }
    setRangeCommitError(null);
    onRangeCommit(pickupIso, returnIso);
    closePanel();
  };

  const onDayClick = (iso: string) => {
    if (compareIso(iso, minDate) < 0) return;
    if (maxDate && compareIso(iso, maxDate) > 0) return;
    if (blockedDates?.has(iso)) return;

    if (anchorIso == null) {
      setRangeCommitError(null);
      setAnchorIso(iso);
      return;
    }

    const a = anchorIso;

    if (iso === a) {
      /** İkinci tık aynı gün: alış veya teslim (hangi alandan açıldıysa) o gün olur; tek günlük kiralama için iki uç aynı ISO. */
      if (openFrom === "pickup") {
        if (compareIso(returnDate, iso) >= 0) finishRange(iso, returnDate);
        else finishRange(iso, iso);
      } else if (openFrom === "return") {
        if (compareIso(iso, pickupDate) >= 0) finishRange(pickupDate, iso);
        else finishRange(iso, pickupDate);
      } else {
        finishRange(iso, iso);
      }
      return;
    }

    setAnchorIso(null);
    const s = compareIso(a, iso) <= 0 ? a : iso;
    let e = compareIso(a, iso) <= 0 ? iso : a;
    if (s === e) {
      const d = parseIsoDate(s);
      if (d) e = toIsoDate(addDays(d, 1));
    }
    if (maxDate && compareIso(e, maxDate) > 0) e = maxDate;
    finishRange(s, e);
  };

  const prevPair = () => {
    if (!canGoPrev(leftYM.y, leftYM.m, minD)) return;
    setLeftYM((lm) => prevMonth(lm.y, lm.m));
  };

  const nextPair = () => {
    if (!canGoNext(leftYM.y, leftYM.m, maxDate)) return;
    setLeftYM((lm) => nextMonth(lm.y, lm.m));
  };

  const panelMobileStyle = {
    position: "fixed" as const,
    inset: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    transform: "none",
    zIndex: 9999,
  };

  const desktopPortalPanelSurfaceClass =
    "isolate max-h-[min(92vh,720px)] overflow-x-hidden overflow-y-auto rounded-xl border border-neutral-200/80 bg-white p-4 shadow-[0_28px_90px_-28px_rgba(15,23,42,0.28),0_12px_32px_-16px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-bg-card dark:shadow-[0_28px_80px_-24px_rgba(0,0,0,0.55)] sm:p-6 md:p-7";

  const rangePanelBody = (
    <>
      {rangeCommitError ? (
        <div className="mb-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-left text-xs leading-relaxed text-amber-950 dark:border-amber-400/35 dark:bg-amber-500/15 dark:text-amber-100 sm:mb-3 sm:text-sm">
          {rangeCommitError}
        </div>
      ) : null}

      <div className="mb-2.5 flex items-center gap-2 sm:mb-3">
        <button
          type="button"
          onClick={prevPair}
          disabled={!canGoPrev(leftYM.y, leftYM.m, minD)}
          className="flex size-10 shrink-0 items-center justify-center rounded-lg text-xl font-light leading-none text-neutral-700 transition-colors hover:bg-neutral-100 disabled:pointer-events-none disabled:opacity-30 dark:text-text dark:hover:bg-white/10"
          aria-label={navAriaPrev}
        >
          ‹
        </button>
        <p className="min-w-0 flex-1 truncate px-1 text-center text-[13px] font-semibold capitalize leading-snug text-neutral-700 dark:text-text sm:text-sm md:text-[15px]">
          {visibleMonthsLabel}
        </p>
        <button
          type="button"
          onClick={nextPair}
          disabled={!canGoNext(leftYM.y, leftYM.m, maxDate)}
          className="flex size-10 shrink-0 items-center justify-center rounded-lg text-xl font-light leading-none text-neutral-700 transition-colors hover:bg-neutral-100 disabled:pointer-events-none disabled:opacity-30 dark:text-text dark:hover:bg-white/10"
          aria-label={navAriaNext}
        >
          ›
        </button>
      </div>

      <div className="mb-2.5 flex flex-col items-center gap-1 rounded-lg bg-neutral-50/95 px-3 py-2 text-center dark:bg-white/[0.04] sm:mb-3 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-3 sm:gap-y-0.5 sm:py-2.5">
        <p className="text-xs leading-snug text-neutral-700 dark:text-text-muted sm:text-[13px] sm:leading-normal">
          <span className="font-semibold text-neutral-900 dark:text-text">Alış: </span>
          {heroDateButtonLabel(pickupDate)}
        </p>
        <span className="hidden text-neutral-300 sm:inline dark:text-white/25" aria-hidden>
          |
        </span>
        <p className="text-xs leading-snug text-neutral-700 dark:text-text-muted sm:text-[13px] sm:leading-normal">
          <span className="font-semibold text-neutral-900 dark:text-text">Bırakış: </span>
          {heroDateButtonLabel(returnDate)}
        </p>
      </div>

      {layout === "inline" && !hideTimeSelects ? (
        <div className="mb-2.5 grid grid-cols-1 gap-2.5 sm:mb-3 sm:grid-cols-2 sm:gap-3">
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-text-muted">
              Alış saati <span className="text-red-600 dark:text-red-400">*</span>
            </span>
            <select
              value={pickTime}
              onChange={(e) => onPickTime(e.target.value)}
              className={heroTimeSelectClass}
              style={{ backgroundImage: chevronSvg }}
              aria-label="Alış saati"
              required
            >
              {!HERO_HALF_HOUR_SLOTS.includes(pickTime) ? <option value={pickTime}>{pickTime}</option> : null}
              {HERO_HALF_HOUR_SLOTS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-text-muted">
              Teslim saati <span className="text-red-600 dark:text-red-400">*</span>
            </span>
            <select
              value={returnTime}
              onChange={(e) => onReturnTime(e.target.value)}
              className={heroTimeSelectClass}
              style={{ backgroundImage: chevronSvg }}
              aria-label="Teslim saati"
              required
            >
              {!HERO_HALF_HOUR_SLOTS.includes(returnTime) ? <option value={returnTime}>{returnTime}</option> : null}
              {HERO_HALF_HOUR_SLOTS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {layout === "inline" ? (() => {
        const ps = parseIsoDate(pickupDate);
        const rs = parseIsoDate(returnDate);
        if (!ps || !rs || rs <= ps) return null;
        const n = rentalNights(ps, rs);
        return (
          <p className="mb-2.5 text-center text-xs font-medium text-accent sm:mb-3 sm:text-sm">
            {n} gün kiralama
          </p>
        );
      }      )() : null}

      <div className="relative">
        {blockedDatesLoading ? (
          <div
            className="absolute inset-0 z-[5] flex items-center justify-center rounded-lg bg-white/75 text-center text-xs font-medium text-neutral-600 dark:bg-bg-card/85 dark:text-text-muted"
            role="status"
            aria-live="polite"
          >
            Dolu günler yükleniyor…
          </div>
        ) : null}
        <div
          className={`${
            blockedDatesLoading ? "pointer-events-none opacity-45 " : ""
          }${
            inlineSingleMonth
              ? "mx-auto grid w-full max-w-md grid-cols-1 gap-4"
              : "grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 md:gap-x-8 md:gap-y-0 lg:gap-x-10"
          }`}
        >
          <MonthGrid
            year={leftYM.y}
            month={leftYM.m}
            pickupDate={pickupDate}
            returnDate={returnDate}
            anchorIso={anchorIso}
            minDate={minDate}
            maxDate={maxDate}
            dotSet={dotSet}
            blockedDates={blockedDates}
            onDayClick={onDayClick}
          />
          {!inlineSingleMonth ? (
            <MonthGrid
              year={rightYM.y}
              month={rightYM.m}
              pickupDate={pickupDate}
              returnDate={returnDate}
              anchorIso={anchorIso}
              minDate={minDate}
              maxDate={maxDate}
              dotSet={dotSet}
              blockedDates={blockedDates}
              onDayClick={onDayClick}
            />
          ) : null}
        </div>
      </div>

      {layout === "inline" ? (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 border-t border-neutral-200/70 pt-3 text-[10px] text-neutral-600 dark:border-white/10 dark:text-text-muted sm:text-[11px]">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-navy-hero dark:bg-btn-solid" aria-hidden />
            Alış / bırakış ucu
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-red-500 shadow-sm dark:bg-red-600" aria-hidden />
            Dolu
          </span>
        </div>
      ) : null}

      {legendItems.length > 0 ? (
        <div className="mt-3.5 border-t border-neutral-200/70 pt-3 text-left text-[11px] leading-relaxed text-neutral-600 dark:border-white/10 dark:text-text-muted sm:mt-4 sm:pt-3.5 sm:text-xs md:text-[13px]">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-text-muted sm:text-[11px]">
            Resmi / dini tatiller
          </p>
          <ul className="space-y-1 sm:space-y-1.5">
            {legendItems.map((h) => (
              <li key={`${h.startIso}-${h.legend}`} className="flex gap-2.5">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-orange-500" aria-hidden />
                <span className="text-neutral-700 dark:text-text-muted">{h.legend}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );

  const mobileFullScreenPanel =
    open && typeof window !== "undefined" && isMobileFullscreenPanel
      ? createPortal(
          <motion.div
            ref={popoverRef}
            role="dialog"
            aria-modal="true"
            aria-label="Alış ve bırakış tarihlerini seçin"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, ease: calEase }}
            style={panelMobileStyle}
            className="isolate flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden rounded-none border-0 bg-white shadow-none dark:bg-bg-card"
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-200/80 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] dark:border-white/10">
              <span className="min-w-0 flex-1 text-lg font-semibold tracking-tight text-neutral-900 dark:text-text">
                Tarih seçin
              </span>
              <button
                type="button"
                onClick={closePanel}
                className="flex size-11 shrink-0 items-center justify-center rounded-xl text-neutral-600 transition-colors hover:bg-neutral-100 active:bg-neutral-200/80 dark:text-text-muted dark:hover:bg-white/10"
                aria-label="Kapat"
              >
                <svg
                  className="size-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-2.5 [padding-bottom:max(0.75rem,env(safe-area-inset-bottom))]">
                {rangePanelBody}
              </div>
            </div>
          </motion.div>,
          document.body,
        )
      : null;

  const desktopPortalPanel =
    open && typeof window !== "undefined" && !isMobileFullscreenPanel
      ? createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-modal="true"
            aria-label="Alış ve bırakış tarihlerini seçin"
            style={{
              position: "fixed",
              top: desktopFixedLayout.top,
              left: desktopFixedLayout.left,
              transform: desktopFixedLayout.anchor === "center" ? "translateX(-50%)" : "none",
              width: desktopFixedLayout.panelWidth,
              zIndex: 99990,
            }}
            className={desktopPortalPanelSurfaceClass}
          >
            {rangePanelBody}
          </div>,
          document.body,
        )
      : null;

  if (layout === "inline") {
    const framed =
      inlineFramed !== false
        ? "rounded-2xl border border-neutral-200/90 bg-white p-3 shadow-sm dark:border-border-subtle/80 dark:bg-bg-card/90 sm:p-4 md:p-5"
        : "";
    return (
      <div className={`relative isolate w-full min-w-0 ${className}`.trim()}>
        <div className={framed}>
          {!hideInlineTitle ? (
            <h2 className="mb-2 text-base font-semibold text-neutral-900 dark:text-text sm:mb-3 sm:text-lg">
              {inlineTitle}
            </h2>
          ) : null}
          {rangePanelBody}
        </div>
      </div>
    );
  }

  if (layout === "heroSearchBar") {
    const dateBtnClass = compact ? searchBarDateBtnCompactClass : searchBarDateBtnClass;
    const timeSelClass = compact ? searchBarTimeSelectCompactClass : searchBarTimeSelectClass;
    const fieldLblClass = compact ? `${searchBarFieldLabel} text-[10px]` : searchBarFieldLabel;
    const rowGap = compact ? "gap-1.5" : "gap-2";
    const outerGap = compact ? "gap-2" : "gap-3";
    const pickColPad = compact ? "sm:pr-2 lg:pr-2" : "sm:pr-3 lg:pr-4";
    const dropColPad = compact ? "sm:pl-2 lg:pl-2" : "sm:pl-3 lg:pl-4";

    if (compact) {
      return (
        <div ref={anchorRef} className={`relative isolate w-full min-w-0 ${className}`.trim()}>
          <div className="flex w-full flex-col gap-1.5">
            <span className={fieldLblClass}>Alış tarihi</span>
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                className={`${dateBtnClass} min-w-0`}
                aria-expanded={open}
                aria-haspopup="dialog"
                onClick={() => openPanel("pickup")}
              >
                <span className="min-w-0 truncate">{heroDateButtonLabel(pickupDate)}</span>
                <span className="shrink-0 text-neutral-400 dark:text-white/45" aria-hidden>
                  ▾
                </span>
              </button>
              <span
                className="shrink-0 select-none text-[13px] font-extralight leading-none text-neutral-300 dark:text-white/25"
                aria-hidden
              >
                |
              </span>
              <select
                value={pickTime}
                onChange={(e) => onPickTime(e.target.value)}
                className={timeSelClass}
                style={{ backgroundImage: chevronSvg }}
                aria-label="Alış saati"
              >
                {!HERO_HALF_HOUR_SLOTS.includes(pickTime) ? <option value={pickTime}>{pickTime}</option> : null}
                {HERO_HALF_HOUR_SLOTS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <span className={`border-t border-neutral-200/60 pt-2 dark:border-white/10 ${fieldLblClass}`}>
              Bırakış tarihi
            </span>
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                className={`${dateBtnClass} min-w-0`}
                aria-expanded={open}
                aria-haspopup="dialog"
                onClick={() => openPanel("return")}
              >
                <span className="min-w-0 truncate">{heroDateButtonLabel(returnDate)}</span>
                <span className="shrink-0 text-neutral-400 dark:text-white/45" aria-hidden>
                  ▾
                </span>
              </button>
              <span
                className="shrink-0 select-none text-[13px] font-extralight leading-none text-neutral-300 dark:text-white/25"
                aria-hidden
              >
                |
              </span>
              <select
                value={returnTime}
                onChange={(e) => onReturnTime(e.target.value)}
                className={timeSelClass}
                style={{ backgroundImage: chevronSvg }}
                aria-label="Bırakış saati"
              >
                {!HERO_HALF_HOUR_SLOTS.includes(returnTime) ? <option value={returnTime}>{returnTime}</option> : null}
                {HERO_HALF_HOUR_SLOTS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {mobileFullScreenPanel}
          {desktopPortalPanel}
        </div>
      );
    }

    return (
      <div
        ref={anchorRef}
        className={`relative isolate flex w-full min-w-0 flex-col ${outerGap} sm:flex-row sm:items-stretch sm:gap-0 ${className}`}
      >
        <div className={`flex min-w-0 flex-1 flex-col justify-center gap-1 ${pickColPad}`}>
          <span className={fieldLblClass}>Alış tarihi</span>
          <div className={`flex min-w-0 items-center ${rowGap}`}>
            <button
              type="button"
              className={dateBtnClass}
              aria-expanded={open}
              aria-haspopup="dialog"
              onClick={() => openPanel("pickup")}
            >
              <span className="min-w-0 truncate">{heroDateButtonLabel(pickupDate)}</span>
              <span className="shrink-0 text-neutral-400" aria-hidden>
                ▾
              </span>
            </button>
            <select
              value={pickTime}
              onChange={(e) => onPickTime(e.target.value)}
              className={timeSelClass}
              style={{ backgroundImage: chevronSvg }}
              aria-label="Alış saati"
            >
              {!HERO_HALF_HOUR_SLOTS.includes(pickTime) ? <option value={pickTime}>{pickTime}</option> : null}
              {HERO_HALF_HOUR_SLOTS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div
          className="h-px w-full shrink-0 bg-neutral-200/80 dark:bg-white/10 sm:hidden"
          aria-hidden
        />
        <div
          className="hidden w-px shrink-0 self-stretch bg-neutral-200/80 sm:block dark:bg-white/10"
          aria-hidden
        />
        <div className={`flex min-w-0 flex-1 flex-col justify-center gap-1 ${dropColPad}`}>
          <span className={fieldLblClass}>Bırakış tarihi</span>
          <div className={`flex min-w-0 items-center ${rowGap}`}>
            <button
              type="button"
              className={dateBtnClass}
              aria-expanded={open}
              aria-haspopup="dialog"
              onClick={() => openPanel("return")}
            >
              <span className="min-w-0 truncate">{heroDateButtonLabel(returnDate)}</span>
              <span className="shrink-0 text-neutral-400" aria-hidden>
                ▾
              </span>
            </button>
            <select
              value={returnTime}
              onChange={(e) => onReturnTime(e.target.value)}
              className={timeSelClass}
              style={{ backgroundImage: chevronSvg }}
              aria-label="Bırakış saati"
            >
              {!HERO_HALF_HOUR_SLOTS.includes(returnTime) ? <option value={returnTime}>{returnTime}</option> : null}
              {HERO_HALF_HOUR_SLOTS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
        {mobileFullScreenPanel}
        {desktopPortalPanel}
      </div>
    );
  }

  return (
    <div
      ref={anchorRef}
      className={`relative isolate flex w-full min-w-0 flex-col items-stretch gap-3 min-[380px]:gap-3.5 sm:gap-3 sm:flex-row sm:flex-wrap md:gap-4 md:flex-row md:items-end md:gap-x-4 lg:gap-x-5 lg:gap-y-0 xl:gap-x-6 ${className}`}
    >
      <div className="flex min-h-0 min-w-0 w-full sm:w-fit sm:max-w-full md:w-fit flex-col gap-1.5 min-[380px]:gap-2 sm:gap-1.5 md:gap-2 lg:flex-none">
        <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-neutral-500 min-[380px]:text-[10px] dark:text-text-muted">
          Alış
        </span>
        <div className="flex w-full min-w-0 flex-col items-stretch gap-2 min-[380px]:gap-2 sm:gap-1.5 sm:flex-row md:gap-2.5 md:flex-row md:items-stretch lg:gap-2 lg:gap-x-2.5 lg:w-fit lg:max-w-full">
          <button
            type="button"
            className={heroDateBtnClass}
            aria-expanded={open}
            aria-haspopup="dialog"
            onClick={() => openPanel("pickup")}
          >
            <span className="whitespace-nowrap">{heroDateButtonLabel(pickupDate)}</span>
            <span className="shrink-0 text-neutral-400" aria-hidden>
              ▾
            </span>
          </button>
          <select
            value={pickTime}
            onChange={(e) => onPickTime(e.target.value)}
            className={heroTimeSelectClass}
            style={{ backgroundImage: chevronSvg }}
            aria-label="Alış saati"
          >
            {!HERO_HALF_HOUR_SLOTS.includes(pickTime) ? <option value={pickTime}>{pickTime}</option> : null}
            {HERO_HALF_HOUR_SLOTS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 w-full sm:w-fit sm:max-w-full md:w-fit flex-col gap-1.5 min-[380px]:gap-2 sm:gap-1.5 md:gap-2 lg:flex-none">
        <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-neutral-500 min-[380px]:text-[10px] dark:text-text-muted">
          Bırakış
        </span>
        <div className="flex w-full min-w-0 flex-col items-stretch gap-2 min-[380px]:gap-2 sm:gap-1.5 sm:flex-row md:gap-2.5 md:flex-row md:items-stretch lg:gap-2 lg:gap-x-2.5 lg:w-fit lg:max-w-full">
          <button
            type="button"
            className={heroDateBtnClass}
            aria-expanded={open}
            aria-haspopup="dialog"
            onClick={() => openPanel("return")}
          >
            <span className="whitespace-nowrap">{heroDateButtonLabel(returnDate)}</span>
            <span className="shrink-0 text-neutral-400" aria-hidden>
              ▾
            </span>
          </button>
          <select
            value={returnTime}
            onChange={(e) => onReturnTime(e.target.value)}
            className={heroTimeSelectClass}
            style={{ backgroundImage: chevronSvg }}
            aria-label="Bırakış saati"
          >
            {!HERO_HALF_HOUR_SLOTS.includes(returnTime) ? <option value={returnTime}>{returnTime}</option> : null}
            {HERO_HALF_HOUR_SLOTS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {mobileFullScreenPanel}
      {desktopPortalPanel}
    </div>
  );
}

function MonthGrid({
  year,
  month,
  pickupDate,
  returnDate,
  anchorIso,
  minDate,
  maxDate,
  dotSet,
  blockedDates,
  onDayClick,
}: {
  year: number;
  month: number;
  pickupDate: string;
  returnDate: string;
  anchorIso: string | null;
  minDate: string;
  maxDate?: string;
  dotSet: Set<string>;
  blockedDates?: Set<string>;
  onDayClick: (iso: string) => void;
}) {
  const cells = calendarCells(year, month);
  const title = new Date(year, month, 1).toLocaleDateString("tr-TR", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-w-0 px-0 sm:px-0.5 lg:px-1">
      <h3 className="mb-2 text-center text-[15px] font-semibold capitalize leading-snug tracking-tight text-neutral-900 sm:mb-2.5 sm:text-base md:text-lg lg:mb-3 lg:text-xl dark:text-text">
        {title}
      </h3>
      <div className="grid grid-cols-7 gap-x-0 text-center text-[11px] font-semibold text-neutral-600 sm:text-xs md:text-[13px] lg:text-sm dark:text-text-muted">
        {WEEKDAYS_FULL.map((w) => (
          <div key={w} className="py-1.5 sm:py-2 lg:py-2.5">
            {w}
          </div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-x-0 gap-y-0.5 sm:mt-1.5 sm:gap-y-1 lg:mt-2 lg:gap-y-1.5">
        {cells.map((cell, i) =>
          cell == null ? (
            <div key={`e-${year}-${month}-${i}`} className="min-h-[2.55rem] min-w-0 sm:aspect-square lg:min-h-[2.85rem]" aria-hidden />
          ) : (
            <RangeDayCell
              key={`d-${year}-${month}-${cell}`}
              day={cell}
              iso={toIsoDate(new Date(year, month, cell))}
              pickupDate={pickupDate}
              returnDate={returnDate}
              anchorIso={anchorIso}
              minDate={minDate}
              maxDate={maxDate}
              blocked={Boolean(blockedDates?.has(toIsoDate(new Date(year, month, cell))))}
              hasDot={dotSet.has(toIsoDate(new Date(year, month, cell)))}
              onPick={() => onDayClick(toIsoDate(new Date(year, month, cell)))}
            />
          ),
        )}
      </div>
    </div>
  );
}

function RangeDayCell({
  day,
  iso,
  pickupDate,
  returnDate,
  anchorIso,
  minDate,
  maxDate,
  blocked,
  hasDot,
  onPick,
}: {
  day: number;
  iso: string;
  pickupDate: string;
  returnDate: string;
  anchorIso: string | null;
  minDate: string;
  maxDate?: string;
  blocked: boolean;
  hasDot: boolean;
  onPick: () => void;
}) {
  if (blocked) {
    return (
      <div
        className="relative flex min-h-[2.55rem] min-w-0 items-center justify-center p-0 sm:aspect-square sm:min-h-0 lg:min-h-[2.75rem]"
        title="Dolu — seçilemez"
      >
        <div
          className="flex size-[1.5rem] shrink-0 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold tabular-nums text-white shadow-sm ring-1 ring-red-600/30 dark:bg-red-600 dark:ring-red-500/40 sm:size-[1.65rem] sm:text-[11px]"
          aria-label={`${day} — dolu`}
        >
          {day}
        </div>
      </div>
    );
  }

  const disabled = compareIso(iso, minDate) < 0 || (maxDate != null && compareIso(iso, maxDate) > 0);
  const start = compareIso(pickupDate, returnDate) <= 0 ? pickupDate : returnDate;
  const end = compareIso(pickupDate, returnDate) <= 0 ? returnDate : pickupDate;
  const isStart = iso === start;
  const isEnd = iso === end;
  const inMid = compareIso(iso, start) > 0 && compareIso(iso, end) < 0;
  const isAnchor = anchorIso != null && iso === anchorIso;

  const rangeTrack =
    "bg-sky-100/95 dark:bg-sky-400/[0.14]";
  /** Uç günler: tam hücre yerine sabit yuvarlak — bitişik hücrelere taşmaz. */
  const rangeCapDisc =
    "flex size-[1.5rem] shrink-0 items-center justify-center rounded-full bg-navy-hero text-[10px] font-semibold text-white shadow-sm ring-1 ring-black/10 dark:bg-btn-solid dark:text-btn-solid-fg dark:ring-white/10 sm:size-[1.65rem] sm:text-[11px]";
  const showRangeCap = !disabled && (isStart || isEnd);

  return (
    <div className="relative min-h-[2.55rem] min-w-0 p-0 sm:aspect-square sm:min-h-0 lg:min-h-[2.75rem]">
      {!disabled && (inMid || (isStart && !isEnd) || (isEnd && !isStart)) ? (
        <>
          {inMid ? (
            <div
              className={`pointer-events-none absolute left-0 right-0 top-1/2 z-0 h-5 -translate-y-1/2 sm:h-5 ${rangeTrack}`}
              aria-hidden
            />
          ) : null}
          {isStart && !isEnd ? (
            <div
              className={`pointer-events-none absolute left-1/2 right-0 top-1/2 z-0 h-5 -translate-y-1/2 rounded-l-md sm:h-5 ${rangeTrack}`}
              aria-hidden
            />
          ) : null}
          {isEnd && !isStart ? (
            <div
              className={`pointer-events-none absolute left-0 right-1/2 top-1/2 z-0 h-5 -translate-y-1/2 rounded-r-md sm:h-5 ${rangeTrack}`}
              aria-hidden
            />
          ) : null}
        </>
      ) : null}

      <button
        type="button"
        disabled={disabled}
        onClick={onPick}
        className={`group relative z-[1] flex h-full min-h-[2.55rem] w-full min-w-0 flex-col items-center justify-center text-[13px] font-semibold tabular-nums transition-colors duration-150 sm:min-h-0 sm:text-[14px] md:text-[15px] lg:min-h-[2.75rem] lg:text-base ${
          hasDot && !disabled && !showRangeCap ? "gap-0.5" : ""
        } ${
          disabled
            ? "cursor-not-allowed rounded-none text-neutral-300 dark:text-text-muted/35"
            : showRangeCap
              ? "cursor-pointer rounded-none bg-transparent text-transparent"
              : inMid
                ? "cursor-pointer rounded-none text-neutral-800 hover:bg-sky-100/35 dark:text-text dark:hover:bg-sky-400/10"
                : "cursor-pointer rounded-none bg-transparent text-neutral-800 dark:text-text"
        } `}
      >
        {showRangeCap ? (
          <span className="relative z-[2] flex flex-col items-center gap-0.5">
            <span
              className={`${rangeCapDisc} ${isAnchor ? "ring-2 ring-accent/80 ring-offset-1 ring-offset-white dark:ring-offset-bg-card" : ""}`}
            >
              {day}
            </span>
            {hasDot ? <span className="size-1 shrink-0 rounded-full bg-orange-500" aria-hidden /> : null}
          </span>
        ) : inMid ? (
          <span className="relative z-[2] flex flex-col items-center gap-0.5">
            <span>{day}</span>
            {hasDot ? <span className="size-1 shrink-0 rounded-full bg-orange-500" aria-hidden /> : null}
          </span>
        ) : disabled ? (
          <span className="relative z-[2]">{day}</span>
        ) : (
          <span
            className={`relative z-[2] flex min-h-[1.6rem] min-w-[1.6rem] flex-col items-center justify-center rounded-full text-[12px] transition-[background-color,box-shadow] duration-150 sm:min-h-[1.75rem] sm:min-w-[1.75rem] sm:text-[13px] ${
              isAnchor
                ? "bg-neutral-100/90 ring-2 ring-accent/65 ring-offset-1 ring-offset-white dark:bg-white/10 dark:ring-accent/50 dark:ring-offset-bg-card"
                : "group-hover:bg-neutral-100/95 group-hover:ring-1 group-hover:ring-neutral-300/80 dark:group-hover:bg-white/[0.08] dark:group-hover:ring-white/15"
            } `}
          >
            <span>{day}</span>
            {hasDot ? <span className="mt-0.5 size-1 shrink-0 rounded-full bg-orange-500" aria-hidden /> : null}
          </span>
        )}
      </button>
    </div>
  );
}
