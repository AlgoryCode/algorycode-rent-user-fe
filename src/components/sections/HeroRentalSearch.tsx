"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useEffect, useMemo, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { toast } from "sonner";
import { DayPickerPopover } from "@/components/ui/DayPickerPopover";
import { RentSelect } from "@/components/ui/RentSelect";
import { compareIso } from "@/lib/calendarGrid";
import { pickupLocations } from "@/data/locations";
import type { HeroHandoverOption } from "@/lib/handoverLocations";
import { addDays, parseIsoDate, toIsoDate } from "@/lib/dates";
import { mergeRentalParamsIntoSearchParams } from "@/lib/fleetFilters";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, "0")}:00`);

const locationRentTrigger =
  "flex h-7 w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-none border-0 bg-transparent px-0 py-0 text-left text-base font-semibold text-foreground shadow-none outline-none ring-0 transition-colors hover:bg-transparent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0";

function shortLocationLabel(full: string) {
  return full.replace("İstanbul ", "İst. ");
}

function staticPickupFallback(): HeroHandoverOption[] {
  return pickupLocations.map((l) => {
    const id = (l.rentPickupHandoverId ?? l.id).trim() || l.id;
    return { id, label: l.label, countryCode: l.countryCode };
  });
}

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

/** `/araclar` URL’indeki tarih / lokasyon → form state */
function parseListingUrlToState(
  sp: URLSearchParams,
  pickupOptions: HeroHandoverOption[],
  returnOptions: HeroHandoverOption[],
) {
  const pickFirst = pickupOptions[0]?.id ?? "";
  const rawPick = (sp.get("baslangicKonum") || sp.get("lokasyon") || "").trim();
  const rawDrop = (sp.get("lokasyonTeslim") || "").trim();

  let fromId = rawPick || pickFirst;
  if (fromId && !pickupOptions.some((o) => o.id === fromId)) {
    fromId = pickFirst || fromId;
  }
  if (!fromId) fromId = pickFirst;

  const urlSuggestsDifferent = Boolean(rawDrop && rawPick && rawDrop !== rawPick);
  let toId = urlSuggestsDifferent ? rawDrop : fromId;
  if (toId && !returnOptions.some((o) => o.id === toId)) {
    toId = returnOptions.find((r) => r.id !== fromId)?.id ?? fromId;
  }
  if (!urlSuggestsDifferent) {
    toId = fromId;
  }

  const differentDropoff = fromId !== toId;

  const defaultPickup = toIsoDate(addDays(new Date(), 1));
  const defaultReturn = toIsoDate(addDays(new Date(), 2));
  const alis = (sp.get("alis") || "").trim();
  const teslim = (sp.get("teslim") || "").trim();

  const pickupDate = alis && parseIsoDate(alis) ? alis : defaultPickup;
  let returnDate = teslim && parseIsoDate(teslim) ? teslim : defaultReturn;
  if (compareIso(returnDate, pickupDate) <= 0) {
    returnDate = toIsoDate(addDays(parseIsoDate(pickupDate) ?? new Date(), 1));
  }

  const alis_saat = (sp.get("alis_saat") || "10:00").trim();
  const teslim_saat = (sp.get("teslim_saat") || "10:00").trim();

  return {
    fromId,
    toId,
    differentDropoff,
    pickupDate,
    returnDate,
    pickupTime: alis_saat || "10:00",
    returnTime: teslim_saat || "10:00",
  };
}

function rentalQuerySnapshot(sp: URLSearchParams): string {
  return (
    [
      "alis",
      "teslim",
      "lokasyon",
      "lokasyonTeslim",
      "baslangicKonum",
      "alis_saat",
      "teslim_saat",
    ] as const
  )
    .map((k) => `${k}=${sp.get(k) ?? ""}`)
    .join("|");
}

export type HeroRentalSearchProps = {
  className?: string;
  pickupHandoverOptions: HeroHandoverOption[];
  returnHandoverOptions: HeroHandoverOption[];
  pageHeroEmbed?: boolean;
  /** Araç listesi: URL ile senkron, gönderimde mevcut filtre sorgusu korunur */
  refineListing?: boolean;
};

export function HeroRentalSearch({
  className = "",
  pickupHandoverOptions,
  returnHandoverOptions,
  pageHeroEmbed = false,
  refineListing = false,
}: HeroRentalSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rentalSnap = refineListing ? rentalQuerySnapshot(searchParams) : "";
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
  const returnOption = differentDropoff ? "different" : "same";

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

  const pickupTriggerLabel = useMemo(() => {
    return refineListing || pageHeroEmbed ? "" : undefined;
  }, [refineListing, pageHeroEmbed]);

  const returnTriggerLabel = useMemo(() => {
    return refineListing || pageHeroEmbed ? "" : undefined;
  }, [refineListing, pageHeroEmbed, pageHeroEmbed]);

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

  useEffect(() => {
    if (!refineListing) return;
    const sp = new URLSearchParams(searchParams.toString());
    const next = parseListingUrlToState(sp, pickupOptions, returnOptions);
    setFromId(next.fromId);
    setToId(next.toId);
    setDifferentDropoff(next.differentDropoff);
    setPickupDate(next.pickupDate);
    setReturnDate(next.returnDate);
    setPickupTime(next.pickupTime);
    setReturnTime(next.returnTime);
  }, [refineListing, rentalSnap, pickupOptions, returnOptions]);

  const maxSearchDate = useMemo(() => toIsoDate(addDays(new Date(), 400)), []);
  const minDate = toIsoDate(addDays(new Date(), 0));

  const handleFromChange = (v: string) => {
    setFromId(v);
    if (!differentDropoff) setToId(v);
  };

  const handleReturnOption = (v: string) => {
    const different = v === "different";
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

  const setPickupDateSafe = (iso: string) => {
    setPickupDate(iso);
    const p = parseIsoDate(iso);
    if (!p) return;
    const retD = parseIsoDate(returnDate);
    if (!retD || compareIso(returnDate, iso) <= 0) {
      setReturnDate(toIsoDate(addDays(p, 1)));
    }
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
    const pickD = parseIsoDate(pickupDate);
    const retD = parseIsoDate(teslimForSearch);
    if (!pickD || !retD || compareIso(teslimForSearch, pickupDate) < 0) {
      toast.error("Geçerli alış ve teslim tarihi seçin.");
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
      if (refineListing) {
        const merged = mergeRentalParamsIntoSearchParams(new URLSearchParams(searchParams.toString()), {
          lokasyon: fromVal,
          lokasyonTeslim: toVal,
          baslangicKonum: fromVal,
          alis: pickupDate,
          alis_saat: pickupTime,
          teslim: teslimForSearch,
          teslim_saat: returnTime,
        });
        router.push(`/araclar?${merged.toString()}`);
        return;
      }
      router.push(`/araclar?${qs}`);
    });
  };

  const outerPad = pageHeroEmbed || refineListing ? "p-0" : "p-4 sm:p-5 md:p-6";
  const innerMax =
    refineListing
      ? "w-full max-w-none min-w-0"
      : pageHeroEmbed
        ? differentDropoff
          ? "max-w-[min(100%,96rem)]"
          : "max-w-[min(100%,90rem)]"
        : `max-w-[min(100%,52rem)] xl:max-w-[56rem] ${differentDropoff ? "lg:max-w-[min(100%,58rem)] xl:max-w-[min(100%,64rem)]" : ""}`;

  const returnDateMin = pickupDate;

  /** Araç listesi üstü: dar ekranda daha az padding, lg’ye kadar tek sütun */
  const cellPad = refineListing ? "px-3 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-4" : "px-5 py-4";
  const pinCls = refineListing
    ? "h-4 w-4 shrink-0 text-primary sm:h-5 sm:w-5"
    : "h-5 w-5 shrink-0 text-primary";
  const locTrigger = refineListing
    ? cn(locationRentTrigger, "text-sm lg:text-base")
    : locationRentTrigger;

  const listingDateTrigger = refineListing
    ? "flex h-auto min-h-0 w-full min-w-0 flex-col items-start justify-center rounded-none border-0 bg-transparent px-3 py-2.5 text-left text-sm shadow-none outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:px-4 sm:py-3 lg:px-5 lg:py-4 lg:text-base"
    : undefined;

  return (
    <div
      className={cn("relative z-10 mx-auto w-full min-w-0 max-w-full overflow-visible", outerPad, className)}
    >
      <div className={cn("mx-auto w-full min-w-0", innerMax)}>
        {/* rent-wheel CarRentalSearch: radyo satırı */}
        <div
          className={cn(
            "flex flex-wrap",
            refineListing
              ? "mb-2 gap-x-3 gap-y-1.5 px-1 sm:mb-3 sm:gap-x-5 sm:px-2 lg:mb-4 lg:gap-x-6"
              : "mb-4 gap-x-6 gap-y-2 px-2",
          )}
          role="radiogroup"
          aria-label="Teslim seçeneği"
        >
          <label
            className={cn("flex cursor-pointer items-center", refineListing ? "min-w-0 gap-1.5 sm:gap-2" : "gap-2")}
          >
            <input
              type="radio"
              name="hero-return-option"
              checked={returnOption === "same"}
              onChange={() => handleReturnOption("same")}
              className={cn("shrink-0 accent-primary", refineListing ? "size-3.5 sm:size-4" : "size-4")}
            />
            {refineListing ? (
              <span className="text-xs font-medium text-foreground sm:text-sm" title="Aynı yere bırakacağım">
                <span className="lg:hidden">Aynı yer</span>
                <span className="hidden lg:inline">Aynı yere bırakacağım</span>
              </span>
            ) : (
              <span className="text-sm font-medium text-foreground">Aynı yere bırakacağım</span>
            )}
          </label>
          <label
            className={cn("flex cursor-pointer items-center", refineListing ? "min-w-0 gap-1.5 sm:gap-2" : "gap-2")}
          >
            <input
              type="radio"
              name="hero-return-option"
              checked={returnOption === "different"}
              onChange={() => handleReturnOption("different")}
              className={cn("shrink-0 accent-primary", refineListing ? "size-3.5 sm:size-4" : "size-4")}
            />
            {refineListing ? (
              <span className="text-xs font-medium text-foreground sm:text-sm" title="Farklı bir yere bırakacağım">
                <span className="lg:hidden">Farklı yer</span>
                <span className="hidden lg:inline">Farklı bir yere bırakacağım</span>
              </span>
            ) : (
              <span className="text-sm font-medium text-foreground">Farklı bir yere bırakacağım</span>
            )}
          </label>
        </div>

        <div
          className={cn(
            "grid grid-cols-1 gap-0 overflow-hidden rounded-2xl border border-border/50 bg-card shadow-[var(--shadow-search)]",
            refineListing && "rounded-xl shadow-sm sm:rounded-2xl sm:shadow-[var(--shadow-search)]",
            "lg:grid-cols-[1fr_auto]",
          )}
        >
          <div
            className={cn(
              "grid divide-y divide-border/60 transition-[grid-template-columns] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:divide-x lg:divide-y-0",
              refineListing
                ? differentDropoff
                  ? "grid-cols-1 lg:grid-cols-[1fr_1fr_auto_auto_auto_auto]"
                  : "grid-cols-1 lg:grid-cols-[1fr_auto_auto_auto_auto]"
                : differentDropoff
                  ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto_auto_auto]"
                  : "grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto_auto]",
            )}
          >
            {/* Alış yeri — LocationAutocomplete görünümü */}
            <div className={cn("relative flex min-w-0 items-center gap-2 sm:gap-3", cellPad)}>
              <MapPin className={pinCls} aria-hidden />
              <div className="min-w-0 flex-1">
                <span className="block text-[11px] font-medium text-muted-foreground sm:text-xs">
                  {refineListing ? (
                    <>
                      <span className="lg:hidden">Alış</span>
                      <span className="hidden lg:inline">Alış Yeri</span>
                    </>
                  ) : (
                    "Alış Yeri"
                  )}
                </span>
                <RentSelect
                  value={fromId}
                  onChange={handleFromChange}
                  options={pickupSelectOptions}
                  ariaLabel="Alış yeri"
                  className="w-full min-w-0"
                  triggerClassName={locTrigger}
                  triggerLabel={pickupTriggerLabel}
                  dropdownShell="hero"
                  showChevron={false}
                />
              </div>
            </div>

            {differentDropoff ? (
              <div
                key="dropoff-field"
                className="origin-left animate-[field-expand_450ms_cubic-bezier(0.22,1,0.36,1)]"
              >
                <div className={cn("relative flex min-w-0 items-center gap-2 sm:gap-3", cellPad)}>
                  <MapPin className={pinCls} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <span className="block text-[11px] font-medium text-muted-foreground sm:text-xs">
                      {refineListing ? (
                        <>
                          <span className="lg:hidden">Bırakış</span>
                          <span className="hidden lg:inline">Bırakış Yeri</span>
                        </>
                      ) : (
                        "Bırakış Yeri"
                      )}
                    </span>
                    <RentSelect
                      value={toId}
                      onChange={setToId}
                      options={returnSelectOptions}
                      ariaLabel="Bırakış yeri"
                      className="w-full min-w-0"
                      triggerClassName={locTrigger}
                      triggerLabel={returnTriggerLabel}
                      dropdownShell="hero"
                      showChevron={false}
                    />
                  </div>
                </div>
              </div>
            ) : null}

            <DayPickerPopover
              value={pickupDate}
              onChange={setPickupDateSafe}
              minDate={minDate}
              maxDate={maxSearchDate}
              label="Alış tarihi seçin"
              hideSurfaceLabel
              carSearchFieldLabel={refineListing ? "Alış" : "Alış tarihi"}
              variant="default"
              compact
              className="min-w-0"
              triggerClassName={listingDateTrigger}
            />

            <div
              className={cn(
                "flex min-w-0 flex-col justify-center sm:min-w-[100px] lg:min-w-[110px]",
                cellPad,
              )}
            >
              <span className="text-[11px] font-medium text-muted-foreground sm:text-xs">Saat</span>
              <select
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                aria-label="Alış saati"
                className={cn(
                  "h-7 min-w-0 cursor-pointer border-0 bg-transparent px-0 pr-5 font-semibold text-foreground shadow-none outline-none focus:ring-0 [color-scheme:light] rent-modern-select",
                  refineListing ? "text-sm sm:text-base" : "pr-6 text-base",
                )}
              >
                {!HOURS.includes(pickupTime) ? (
                  <option value={pickupTime}>
                    {pickupTime}
                  </option>
                ) : null}
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <DayPickerPopover
              value={returnDate}
              onChange={setReturnDate}
              minDate={returnDateMin}
              maxDate={maxSearchDate}
              label="Bırakış tarihi seçin"
              hideSurfaceLabel
              carSearchFieldLabel={refineListing ? "Bırakış" : "Bırakış tarihi"}
              variant="default"
              compact
              className="min-w-0"
              triggerClassName={listingDateTrigger}
            />

            <div
              className={cn(
                "flex min-w-0 flex-col justify-center sm:min-w-[100px] lg:min-w-[110px]",
                cellPad,
              )}
            >
              <span className="text-[11px] font-medium text-muted-foreground sm:text-xs">Saat</span>
              <select
                value={returnTime}
                onChange={(e) => setReturnTime(e.target.value)}
                aria-label="Bırakış saati"
                className={cn(
                  "h-7 min-w-0 cursor-pointer border-0 bg-transparent px-0 pr-5 font-semibold text-foreground shadow-none outline-none focus:ring-0 [color-scheme:light] rent-modern-select",
                  refineListing ? "text-sm sm:text-base" : "pr-6 text-base",
                )}
              >
                {!HOURS.includes(returnTime) ? (
                  <option value={returnTime}>
                    {returnTime}
                  </option>
                ) : null}
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={submit}
            className={cn(
              "flex h-auto w-full items-center justify-center gap-2 rounded-none bg-primary px-3 text-primary-foreground transition-colors hover:bg-[hsl(var(--sh-primary-glow))] sm:px-4 lg:h-full lg:min-h-0 lg:min-w-[88px] lg:flex-col",
              refineListing ? "min-h-11 sm:min-h-[3.25rem]" : "min-h-[3.25rem]",
            )}
            aria-label={refineListing ? "Aramayı güncelle" : "Araç bul"}
          >
            <Search className={refineListing ? "h-5 w-5 sm:h-6 sm:w-6" : "h-6 w-6"} strokeWidth={2.5} aria-hidden />
            <span className="ml-1 text-sm font-semibold sm:ml-2 sm:text-base lg:hidden">
              {refineListing ? "Güncelle" : "Ara"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
