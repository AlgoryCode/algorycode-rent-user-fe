"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { compareIso } from "@/lib/calendarGrid";
import { pickupLocations } from "@/data/locations";
import type { HeroHandoverOption } from "@/lib/handoverLocations";
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

const barLabel = "text-xs font-medium text-neutral-500";

const barLocationTrigger =
  "flex h-auto min-h-0 w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-md border-0 bg-transparent px-0 py-0.5 text-left text-[15px] font-semibold leading-snug text-neutral-900 shadow-none outline-none ring-0 transition-colors hover:bg-neutral-50/80 focus-visible:ring-2 focus-visible:ring-accent/25";

const mobileStackCell = "flex min-w-0 flex-col justify-center gap-0.5 px-4 py-3.5 sm:px-5";

function shortLocationLabel(full: string) {
  return full.replace("İstanbul ", "İst. ");
}

function BarDivider() {
  return (
    <>
      <div
        className="h-px w-full shrink-0 bg-neutral-200/80 lg:hidden"
        aria-hidden
      />
      <div
        className="hidden w-px shrink-0 self-stretch bg-neutral-200/80 lg:block"
        aria-hidden
      />
    </>
  );
}

function MobileDivider() {
  return <div className="h-px w-full shrink-0 bg-neutral-200/80" aria-hidden />;
}

function staticPickupFallback(): HeroHandoverOption[] {
  return pickupLocations.map((l) => {
    const id = (l.rentPickupHandoverId ?? l.id).trim() || l.id;
    return { id, label: l.label, countryCode: l.countryCode };
  });
}

/** Başlangıç konumu: DB RETURN (teslim) listesi; boşsa PICKUP / statik. */
function startLocationList(apiPick: HeroHandoverOption[], apiRet: HeroHandoverOption[]): HeroHandoverOption[] {
  if (apiRet.length > 0) return apiRet;
  if (apiPick.length > 0) return apiPick;
  return staticPickupFallback();
}

function initialPickupId(apiPick: HeroHandoverOption[], apiRet: HeroHandoverOption[]): string {
  const list = startLocationList(apiPick, apiRet);
  return list[0]?.id ?? "";
}

function initialReturnId(
  from: string,
  apiRet: HeroHandoverOption[],
  apiPick: HeroHandoverOption[],
): string {
  const ret =
    apiRet.length > 0 ? apiRet : apiPick.length > 0 ? apiPick : staticPickupFallback();
  return ret.find((r) => r.id !== from)?.id ?? ret[0]?.id ?? from;
}

export type HeroRentalSearchProps = {
  className?: string;
  pickupHandoverOptions: HeroHandoverOption[];
  returnHandoverOptions: HeroHandoverOption[];
};

export function HeroRentalSearch({
  className = "",
  pickupHandoverOptions,
  returnHandoverOptions,
}: HeroRentalSearchProps) {
  const router = useRouter();
  const [fromId, setFromId] = useState(() => initialPickupId(pickupHandoverOptions, returnHandoverOptions));
  const [toId, setToId] = useState(() =>
    initialReturnId(
      initialPickupId(pickupHandoverOptions, returnHandoverOptions),
      returnHandoverOptions,
      pickupHandoverOptions,
    ),
  );
  const [pickupDate, setPickupDate] = useState(() => toIsoDate(addDays(new Date(), 1)));
  const [returnDate, setReturnDate] = useState(() => toIsoDate(addDays(new Date(), 2)));
  const [pickupTime, setPickupTime] = useState("10:00");
  const [returnTime, setReturnTime] = useState("10:00");
  const [differentDropoff, setDifferentDropoff] = useState(false);

  const pickupOptions = useMemo(
    () => startLocationList(pickupHandoverOptions, returnHandoverOptions),
    [pickupHandoverOptions, returnHandoverOptions],
  );

  const returnOptions = useMemo(() => {
    if (returnHandoverOptions.length > 0) return returnHandoverOptions;
    return pickupOptions;
  }, [returnHandoverOptions, pickupOptions]);

  const pickupSelectOptions = useMemo(
    () =>
      pickupOptions.map((l) => ({
        value: l.id,
        label: shortLocationLabel(l.label),
        right: l.countryCode,
      })),
    [pickupOptions],
  );

  const returnSelectOptions = useMemo(
    () =>
      returnOptions.map((l) => ({
        value: l.id,
        label: shortLocationLabel(l.label),
        right: l.countryCode,
      })),
    [returnOptions],
  );

  /** Props/stream sonrası seçili id listede yoksa (ör. önce [], sonra API) state düzelt. */
  useEffect(() => {
    if (pickupOptions.length === 0) return;
    setFromId((prev) => (pickupOptions.some((o) => o.id === prev) ? prev : pickupOptions[0]!.id));
  }, [pickupOptions]);

  useEffect(() => {
    if (returnOptions.length === 0) return;
    setToId((prev) => {
      if (!differentDropoff) return fromId;
      return returnOptions.some((o) => o.id === prev)
        ? prev
        : (returnOptions.find((r) => r.id !== fromId)?.id ?? returnOptions[0]!.id ?? fromId);
    });
  }, [returnOptions, differentDropoff, fromId]);

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
    if (!different) {
      setToId(fromId);
      return;
    }
    setToId((prev) => {
      if (prev !== fromId) return prev;
      return (
        returnOptions.find((r) => r.id !== fromId)?.id ?? returnOptions[0]?.id ?? fromId
      );
    });
  };

  const teslimForSearch = useMemo(() => {
    const p = parseIsoDate(pickupDate);
    if (!p) return returnDate;
    return compareIso(returnDate, pickupDate) > 0 ? returnDate : toIsoDate(addDays(p, 1));
  }, [pickupDate, returnDate]);

  const submit = () => {
    const pick = pickupOptions.find((o) => o.id === fromId) ?? pickupOptions[0];
    const fromVal = pick?.id?.trim() ?? "";
    if (!fromVal) {
      toast.error("Alış noktası seçin.");
      return;
    }
    const toVal = differentDropoff
      ? (returnOptions.find((o) => o.id === toId) ?? returnOptions.find((r) => r.id !== fromVal) ?? returnOptions[0])
          ?.id?.trim() || fromVal
      : fromVal;
    const params = new URLSearchParams();
    params.set("lokasyon", fromVal);
    params.set("lokasyonTeslim", toVal);
    params.set("baslangicKonum", fromVal);
    params.set("alis", pickupDate);
    params.set("alis_saat", pickupTime);
    params.set("teslim", teslimForSearch);
    params.set("teslim_saat", returnTime);
    const qs = params.toString();
    startTransition(() => {
      router.push(`/araclar?${qs}`);
    });
  };

  const minDate = toIsoDate(addDays(new Date(), 0));

  const searchShell =
    "overflow-visible rounded-xl border border-neutral-200/90 bg-white shadow-[0_12px_40px_-24px_rgba(15,23,42,0.35)]";

  return (
    <div
      className={`relative z-10 mx-auto w-full min-w-0 max-w-full overflow-visible p-4 sm:p-5 md:p-6 ${className}`}
    >
      <div className="mx-auto flex w-full min-w-0 max-w-[min(100%,52rem)] flex-col gap-3 xl:max-w-[56rem]">
        {/* Mobil / tablet: alış → onay → bırakış → tarihler → ara */}
        <div className={`flex flex-col lg:hidden ${searchShell}`}>
          <div className={mobileStackCell}>
            <span className={barLabel}>Alış yeri</span>
            <RentSelect
              value={fromId}
              onChange={handleFromChange}
              options={pickupSelectOptions}
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
          {differentDropoff ? (
            <div className="min-w-0">
              <MobileDivider />
              <div className={mobileStackCell}>
                <span className={barLabel}>Bırakış yeri</span>
                <RentSelect
                  value={toId}
                  onChange={setToId}
                  options={returnSelectOptions}
                  ariaLabel="Bırakış yeri"
                  className="w-full min-w-0"
                  triggerClassName={barLocationTrigger}
                  dropdownShell="hero"
                />
              </div>
            </div>
          ) : null}
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
            className="flex min-h-[3rem] w-full items-center justify-center gap-2 rounded-b-xl bg-btn-solid px-4 text-sm font-semibold text-btn-solid-fg shadow-[inset_0_1px_0_0_rgba(255,255,255,0.14)] transition-[filter,box-shadow,transform] hover:brightness-[1.05] active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-btn-solid"
            aria-label="Araç bul"
          >
            <svg
              className="size-[1.15rem] shrink-0 opacity-90"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
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
              options={pickupSelectOptions}
              ariaLabel="Alış yeri"
              className="w-full min-w-0"
              triggerClassName={barLocationTrigger}
              dropdownShell="hero"
            />
          </div>

          {differentDropoff ? (
            <div className="flex min-w-0 flex-none">
              <BarDivider />
              <div className={`${barCellLocation} min-w-0`}>
                <span className={barLabel}>Bırakış yeri</span>
                <RentSelect
                  value={toId}
                  onChange={setToId}
                  options={returnSelectOptions}
                  ariaLabel="Bırakış yeri"
                  className="w-full min-w-0"
                  triggerClassName={barLocationTrigger}
                  dropdownShell="hero"
                />
              </div>
            </div>
          ) : null}

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
            className="flex w-[3.35rem] shrink-0 flex-col items-center justify-center self-stretch rounded-r-xl border-l border-btn-solid-fg/10 bg-btn-solid text-btn-solid-fg shadow-[inset_0_1px_0_0_rgba(255,255,255,0.14)] transition-[filter,box-shadow,transform] hover:brightness-[1.05] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-btn-solid"
            aria-label="Araç bul"
          >
            <svg
              className="size-[1.15rem] shrink-0 opacity-90"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
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
