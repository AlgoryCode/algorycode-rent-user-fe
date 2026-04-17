"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { compareIso } from "@/lib/calendarGrid";
import { pickupLocations } from "@/data/locations";
import { addDays, parseIsoDate, toIsoDate } from "@/lib/dates";
import { HeroRentalRangeDatePickers } from "@/components/ui/HeroRentalRangeDatePickers";
import { DifferentDropoffToggle } from "@/components/ui/DifferentDropoffToggle";
import { RentSelect } from "@/components/ui/RentSelect";

const barCellBase =
  "flex min-w-0 flex-col justify-center gap-0.5 px-4 py-3.5 sm:px-5 sm:py-4 lg:min-h-[4.25rem] lg:px-3 lg:py-3.5";
/** Tarih vb. sütunlar — satırda kalan alanı paylaşabilir */
const barCell = `${barCellBase} lg:flex-1`;
/** Lokasyon: flex-1 yok; genişleyince tetikleyicide dev yatay boşluk oluşmaz */
const barCellLocation = `${barCellBase} lg:flex-none lg:max-w-[min(100%,17.5rem)] xl:max-w-[19rem]`;

const barLabel = "text-xs font-medium text-neutral-500 dark:text-text-muted";

const barLocationTrigger =
  "flex h-auto min-h-0 w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-md border-0 bg-transparent px-0 py-0.5 text-left text-[15px] font-semibold leading-snug text-neutral-900 shadow-none outline-none ring-0 transition-colors hover:bg-neutral-50/80 focus-visible:ring-2 focus-visible:ring-accent/25 dark:text-text dark:hover:bg-white/[0.06]";

const mobileStackCell = "flex min-w-0 flex-col justify-center gap-0.5 px-4 py-3.5 sm:px-5";

function shortLocationLabel(full: string) {
  return full.replace("İstanbul ", "İst. ");
}

function BarDivider() {
  return (
    <>
      <div
        className="h-px w-full shrink-0 bg-neutral-200/80 dark:bg-white/10 lg:hidden"
        aria-hidden
      />
      <div
        className="hidden w-px shrink-0 self-stretch bg-neutral-200/80 dark:bg-white/10 lg:block"
        aria-hidden
      />
    </>
  );
}

function MobileDivider() {
  return <div className="h-px w-full shrink-0 bg-neutral-200/80 dark:bg-white/10" aria-hidden />;
}

export function HeroRentalSearch({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [fromId, setFromId] = useState(pickupLocations[0]!.id);
  const [toId, setToId] = useState(pickupLocations[1]?.id ?? pickupLocations[0]!.id);
  const [pickupDate, setPickupDate] = useState(() => toIsoDate(addDays(new Date(), 1)));
  const [returnDate, setReturnDate] = useState(() => toIsoDate(addDays(new Date(), 2)));
  const [pickupTime, setPickupTime] = useState("10:00");
  const [returnTime, setReturnTime] = useState("10:00");
  const [differentDropoff, setDifferentDropoff] = useState(false);

  const locationOptions = useMemo(
    () =>
      pickupLocations.map((l) => ({
        value: l.id,
        label: shortLocationLabel(l.label),
        right: l.countryCode,
      })),
    [],
  );

  const maxSearchDate = useMemo(() => toIsoDate(addDays(new Date(), 400)), []);

  const handleRangeCommit = (pick: string, ret: string) => {
    setPickupDate(pick);
    setReturnDate(ret);
  };

  const handleFromChange = (v: string) => {
    setFromId(v);
    if (!differentDropoff) setToId(v);
  };

  const handleDifferentDropoff = (different: boolean) => {
    setDifferentDropoff(different);
    if (!different) setToId(fromId);
  };

  const teslimForSearch = useMemo(() => {
    const p = parseIsoDate(pickupDate);
    if (!p) return returnDate;
    return compareIso(returnDate, pickupDate) > 0 ? returnDate : toIsoDate(addDays(p, 1));
  }, [pickupDate, returnDate]);

  const submit = () => {
    const params = new URLSearchParams();
    params.set("lokasyon", fromId);
    params.set("lokasyonTeslim", differentDropoff ? toId : fromId);
    params.set("baslangicKonum", fromId);
    params.set("alis", pickupDate);
    params.set("alis_saat", pickupTime);
    params.set("teslim", teslimForSearch);
    params.set("teslim_saat", returnTime);
    router.push(`/araclar?${params.toString()}`);
  };

  const minDate = toIsoDate(addDays(new Date(), 0));

  const searchShell =
    "overflow-visible rounded-xl border border-neutral-200/90 bg-white shadow-[0_12px_40px_-24px_rgba(15,23,42,0.35)] dark:border-white/10 dark:bg-bg-card";

  return (
    <div
      className={`relative z-10 mx-auto w-full min-w-0 max-w-full overflow-visible rounded-2xl border border-white/25 bg-white/92 p-4 shadow-[0_24px_80px_-32px_rgba(6,10,18,0.55)] backdrop-blur-md dark:border-white/10 dark:bg-bg-card/88 sm:p-5 md:p-6 ${className}`}
    >
      <div className="mx-auto flex w-full min-w-0 max-w-[min(100%,52rem)] flex-col gap-3 xl:max-w-[56rem]">
        {/* Mobil / tablet: alış → onay → bırakış → tarihler → ara */}
        <div className={`flex flex-col lg:hidden ${searchShell}`}>
          <div className={mobileStackCell}>
            <span className={barLabel}>Alış yeri</span>
            <RentSelect
              value={fromId}
              onChange={handleFromChange}
              options={locationOptions}
              ariaLabel="Alış yeri"
              className="w-full min-w-0"
              triggerClassName={barLocationTrigger}
              dropdownShell="hero"
            />
          </div>
          <MobileDivider />
          <div className="px-4 py-3 sm:px-5">
            <DifferentDropoffToggle checked={differentDropoff} onChange={handleDifferentDropoff} />
          </div>
          <AnimatePresence initial={false}>
            {differentDropoff ? (
              <motion.div
                key="m-drop"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                className="min-w-0 overflow-hidden"
              >
                <MobileDivider />
                <div className={mobileStackCell}>
                  <span className={barLabel}>Bırakış yeri</span>
                  <RentSelect
                    value={toId}
                    onChange={setToId}
                    options={locationOptions}
                    ariaLabel="Bırakış yeri"
                    className="w-full min-w-0"
                    triggerClassName={barLocationTrigger}
                    dropdownShell="hero"
                  />
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
          <MobileDivider />
          <div className={`${mobileStackCell} relative z-20 min-w-0 overflow-visible`}>
            <HeroRentalRangeDatePickers
              layout="heroSearchBar"
              minDate={minDate}
              maxDate={maxSearchDate}
              pickupDate={pickupDate}
              returnDate={returnDate}
              onRangeCommit={handleRangeCommit}
              pickTime={pickupTime}
              returnTime={returnTime}
              onPickTime={setPickupTime}
              onReturnTime={setReturnTime}
              className="w-full"
            />
          </div>
          <MobileDivider />
          <button
            type="button"
            onClick={submit}
            className="flex min-h-[3rem] w-full items-center justify-center gap-2 bg-accent px-4 text-sm font-semibold text-accent-fg transition-[filter,box-shadow] hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            aria-label="Araç bul"
          >
            <svg
              className="size-5 shrink-0 opacity-95"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="11" cy="11" r="7.5" />
              <path d="M20 20 16.2 16.2" />
            </svg>
            Araç Bul
          </button>
        </div>

        {/* Masaüstü: segmentli yatay çubuk */}
        <div className={`hidden lg:flex lg:flex-row lg:items-stretch lg:justify-center ${searchShell}`}>
          <div className={`${barCellLocation} min-w-0`}>
            <span className={barLabel}>Alış yeri</span>
            <RentSelect
              value={fromId}
              onChange={handleFromChange}
              options={locationOptions}
              ariaLabel="Alış yeri"
              className="w-full min-w-0"
              triggerClassName={barLocationTrigger}
              dropdownShell="hero"
            />
          </div>

          <AnimatePresence initial={false}>
            {differentDropoff ? (
              <motion.div
                key="d-dropoff"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="flex min-w-0 flex-none"
              >
                <BarDivider />
                <div className={`${barCellLocation} min-w-0`}>
                  <span className={barLabel}>Bırakış yeri</span>
                  <RentSelect
                    value={toId}
                    onChange={setToId}
                    options={locationOptions}
                    ariaLabel="Bırakış yeri"
                    className="w-full min-w-0"
                    triggerClassName={barLocationTrigger}
                    dropdownShell="hero"
                  />
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <BarDivider />

          <div className={`${barCell} relative z-[60] min-w-0 max-w-full overflow-visible lg:max-w-[min(100%,56rem)]`}>
            <HeroRentalRangeDatePickers
              layout="heroSearchBar"
              minDate={minDate}
              maxDate={maxSearchDate}
              pickupDate={pickupDate}
              returnDate={returnDate}
              onRangeCommit={handleRangeCommit}
              pickTime={pickupTime}
              returnTime={returnTime}
              onPickTime={setPickupTime}
              onReturnTime={setReturnTime}
              className="w-full"
            />
          </div>

          <BarDivider />

          <button
            type="button"
            onClick={submit}
            className="flex w-[3.35rem] shrink-0 flex-col items-center justify-center bg-accent text-accent-fg transition-[filter,box-shadow] hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            aria-label="Araç bul"
          >
            <svg
              className="size-5 shrink-0 opacity-95"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="11" cy="11" r="7.5" />
              <path d="M20 20 16.2 16.2" />
            </svg>
          </button>
        </div>

        <div className="hidden lg:block">
          <DifferentDropoffToggle checked={differentDropoff} onChange={handleDifferentDropoff} />
        </div>
      </div>
    </div>
  );
}
