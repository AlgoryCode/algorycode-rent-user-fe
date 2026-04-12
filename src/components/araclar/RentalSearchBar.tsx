"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { pickupLocations } from "@/data/locations";
import { compareIso } from "@/lib/calendarGrid";
import { addDays, parseIsoDate, rentalNights, todayIso, toIsoDate } from "@/lib/dates";
import { RentalDateCalendarModal } from "@/components/araclar/RentalDateCalendarModal";
import { LocationPinIcon } from "@/components/ui/LocationPinIcon";
import { RentSelect } from "@/components/ui/RentSelect";
import { rentSelectTriggerClass, rentSoftSearchShellClass } from "@/components/ui/rentFeSurfaces";

type Props = {
  initialLocation: string;
  initialPickup: string;
  initialReturn: string;
  buildTargetHref: (loc: string, pickup: string, ret: string) => string;
  compact?: boolean;
  vehicleId?: string | null;
};

function formatTr(iso: string, compactFmt: boolean) {
  const d = parseIsoDate(iso);
  if (!d) return iso;
  return d.toLocaleDateString(
    "tr-TR",
    compactFmt
      ? { day: "2-digit", month: "2-digit", year: "numeric" }
      : { day: "numeric", month: "short", year: "numeric" },
  );
}

export function RentalSearchBar({
  initialLocation,
  initialPickup,
  initialReturn,
  buildTargetHref,
  compact = false,
  vehicleId = null,
}: Props) {
  const router = useRouter();
  const [calOpen, setCalOpen] = useState(false);
  const [loc, setLoc] = useState(initialLocation || pickupLocations[0].id);
  const [pickup, setPickup] = useState(initialPickup || todayIso());
  const [ret, setRet] = useState(() => {
    const p = initialPickup || todayIso();
    if (initialReturn && compareIso(initialReturn, p) >= 0) return initialReturn;
    return toIsoDate(addDays(parseIsoDate(p) ?? new Date(), 3));
  });

  const nights = useMemo(() => {
    const a = parseIsoDate(pickup);
    const b = parseIsoDate(ret);
    if (!a || !b || b < a) return null;
    return rentalNights(a, b);
  }, [pickup, ret]);

  const dateSummary = useMemo(() => {
    const a = formatTr(pickup, !!compact);
    const b = formatTr(ret, !!compact);
    return `${a} → ${b}`;
  }, [pickup, ret, compact]);

  const submit = useCallback(() => {
    const safeReturn = compareIso(ret, pickup) > 0 ? ret : toIsoDate(addDays(parseIsoDate(pickup) ?? new Date(), 1));
    router.push(buildTargetHref(loc, pickup, safeReturn));
  }, [buildTargetHref, loc, pickup, ret, router]);

  const locationOptions = useMemo(
    () =>
      pickupLocations.map((l) => ({
        value: l.id,
        label: compact ? l.label.replace("İstanbul ", "İst. ") : l.label,
        right: l.countryCode,
      })),
    [compact],
  );

  const dateTriggerClass = compact
    ? `flex h-9 w-full min-w-0 flex-1 items-center justify-between gap-2 px-2.5 text-left text-xs sm:text-[13px] ${rentSelectTriggerClass}`
    : `flex h-10 w-full items-center justify-between gap-2 px-3 text-left text-sm ${rentSelectTriggerClass}`;

  const modal = (
    <RentalDateCalendarModal
      open={calOpen}
      onClose={() => setCalOpen(false)}
      pickup={pickup}
      returnDate={ret}
      vehicleId={vehicleId}
      onApply={(p, r) => {
        setPickup(p);
        setRet(compareIso(r, p) > 0 ? r : toIsoDate(addDays(parseIsoDate(p) ?? new Date(), 1)));
      }}
    />
  );

  if (compact) {
    return (
      <>
        {modal}
        <motion.div layout className={`${rentSoftSearchShellClass} px-3 py-2.5 sm:px-4`}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:flex-nowrap">
              <label className="sr-only" htmlFor="rental-pickup-loc">
                Alış yeri
              </label>
              <RentSelect
                value={loc}
                onChange={setLoc}
                options={locationOptions}
                ariaLabel="Alış yeri"
                compact
                className="w-full min-w-[8.5rem] flex-1 sm:min-w-[10rem]"
                leadingIcon={<LocationPinIcon className="size-3.5" />}
                optionLeadingIcon={<LocationPinIcon className="size-3.5" />}
              />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="sr-only">Alış ve iade tarihi</span>
                <button
                  type="button"
                  className={dateTriggerClass}
                  aria-haspopup="dialog"
                  aria-expanded={calOpen}
                  onClick={() => setCalOpen(true)}
                >
                  <span className="min-w-0 truncate">{dateSummary}</span>
                  <span className="shrink-0 text-text-muted opacity-70" aria-hidden>
                    ▾
                  </span>
                </button>
              </div>
            </div>
            <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
              <div className="flex min-h-9 items-center gap-2">
                {nights != null && (
                  <span className="whitespace-nowrap rounded-md bg-accent/12 px-2 py-1 text-[11px] font-medium text-accent">
                    {nights} gün
                  </span>
                )}
                {nights === null && pickup && ret && (
                  <span className="text-[11px] text-amber-300/90">Tarihleri kontrol edin</span>
                )}
              </div>
              <motion.button
                type="button"
                onClick={submit}
                className="h-9 shrink-0 rounded-lg bg-accent px-4 text-xs font-semibold text-white shadow-sm sm:px-5 sm:text-[13px]"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Listele
              </motion.button>
            </div>
          </div>
        </motion.div>
      </>
    );
  }

  return (
    <>
      {modal}
      <motion.div layout className={`${rentSoftSearchShellClass} p-4 sm:p-5`}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-text-muted">
          Tarih & lokasyon
        </p>
        <div className="mt-3 flex flex-col gap-3 xl:flex-row xl:items-end xl:gap-3">
          <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
            <label className="flex min-w-0 flex-col gap-1">
              <span className="text-[11px] font-medium text-text-muted">Alış yeri</span>
              <RentSelect
                value={loc}
                onChange={setLoc}
                options={locationOptions}
                ariaLabel="Alış yeri"
                className="w-full"
                leadingIcon={<LocationPinIcon className="size-3.5" />}
                optionLeadingIcon={<LocationPinIcon className="size-3.5" />}
              />
            </label>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-[11px] font-medium text-text-muted">Alış & iade tarihi</span>
              <button
                type="button"
                className={dateTriggerClass}
                aria-haspopup="dialog"
                aria-expanded={calOpen}
                onClick={() => setCalOpen(true)}
              >
                <span className="min-w-0 truncate text-left">{dateSummary}</span>
                <span className="shrink-0 text-text-muted opacity-70" aria-hidden>
                  ▾
                </span>
              </button>
              <p className="text-[10px] leading-snug text-text-muted">
                Takvimde müsait / dolu günleri görür, alış ve teslim aralığını seçersiniz.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center xl:flex-col xl:items-stretch">
            {nights != null && (
              <p className="whitespace-nowrap text-xs text-accent xl:text-center">{nights} gün</p>
            )}
            {nights === null && pickup && ret && (
              <p className="text-xs text-amber-300/90">İade, alıştan önce olamaz.</p>
            )}
            <motion.button
              type="button"
              onClick={submit}
              className="h-10 w-full rounded-lg bg-accent px-5 text-sm font-semibold text-white shadow-sm transition-[filter] hover:brightness-105 sm:w-auto xl:w-full"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              Araçları güncelle
            </motion.button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

