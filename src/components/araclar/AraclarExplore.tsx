"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FleetVehicle } from "@/data/fleet";
import { pickupLocations } from "@/data/locations";
import type { HeroHandoverOption } from "@/lib/handoverLocations";
import {
  applyFleetFilters,
  buildAraclarQueryString,
  hasRentalWindowInSearchParams,
  mergeRentalParamsIntoSearchParams,
  nightsFromSearchParams,
  parseFiltersFromParams,
  priceBoundsFromVehicles,
  type FleetFilterState,
  type SortKey,
} from "@/lib/fleetFilters";
import { compareIso } from "@/lib/calendarGrid";
import { addDays, parseIsoDate, toIsoDate } from "@/lib/dates";
import { VehicleCard } from "@/components/vehicle/VehicleCard";
import { DifferentDropoffToggle } from "@/components/ui/DifferentDropoffToggle";
import { LocationPinIcon } from "@/components/ui/LocationPinIcon";
import { RentSelect } from "@/components/ui/RentSelect";
import { HeroRentalRangeDatePickers } from "@/components/ui/HeroRentalRangeDatePickers";

const transmissions = [
  { id: "" as const, label: "Tümü" },
  { id: "otomatik" as const, label: "Otomatik" },
  { id: "manuel" as const, label: "Manuel" },
];

const fuels = [
  { id: "" as const, label: "Tümü" },
  { id: "benzin" as const, label: "Benzin" },
  { id: "dizel" as const, label: "Dizel" },
  { id: "hibrit" as const, label: "Hibrit" },
  { id: "elektrik" as const, label: "Elektrik" },
];

const sorts: { id: SortKey; label: string }[] = [
  { id: "onerilen", label: "Önerilen" },
  { id: "fiyat-artan", label: "Fiyat (artan)" },
  { id: "fiyat-azalan", label: "Fiyat (azalan)" },
  { id: "isim", label: "İsim (A-Z)" },
];

export function AraclarExplore({
  vehicles,
  pickupHandoverOptions,
  returnHandoverOptions,
}: {
  vehicles: FleetVehicle[];
  pickupHandoverOptions: HeroHandoverOption[];
  returnHandoverOptions: HeroHandoverOption[];
}) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [qInput, setQInput] = useState(() => sp.get("q") ?? "");

  const filters = useMemo(() => parseFiltersFromParams(sp), [sp]);

  const results = useMemo(() => applyFleetFilters(vehicles, filters), [filters, vehicles]);
  const nights = useMemo(() => nightsFromSearchParams(sp), [sp]);
  const rentalWindowInUrl = useMemo(
    () => hasRentalWindowInSearchParams(new URLSearchParams(sp.toString())),
    [sp],
  );
  const bounds = useMemo(() => priceBoundsFromVehicles(vehicles), [vehicles]);
  const categories = useMemo(() => [...new Set(vehicles.map((v) => v.category))].sort(), [vehicles]);
  const sortOptions = useMemo(() => sorts.map((s) => ({ value: s.id, label: s.label })), []);

  const pushFilters = useCallback(
    (next: Partial<FleetFilterState>) => {
      const merged: FleetFilterState = { ...filters, ...next };
      const qs = buildAraclarQueryString(new URLSearchParams(sp.toString()), merged, bounds);
      router.push(`${pathname}?${qs}`);
    },
    [bounds, filters, pathname, router, sp],
  );

  const clearAllFilters = () => {
    const p = new URLSearchParams();
    for (const k of [
      "alis",
      "teslim",
      "lokasyon",
      "lokasyonTeslim",
      "baslangicKonum",
      "alis_saat",
      "teslim_saat",
    ] as const) {
      const v = sp.get(k);
      if (v) p.set(k, v);
    }
    const q = p.toString();
    router.push(q ? `${pathname}?${q}` : pathname);
  };

  const querySuffix = sp.toString();

  useEffect(() => {
    const nextQ = qInput.trim();
    if (nextQ === filters.q) return;
    const id = window.setTimeout(() => {
      pushFilters({ q: nextQ });
    }, 260);
    return () => window.clearTimeout(id);
  }, [filters.q, pushFilters, qInput]);

  const hasActiveFilters =
    filters.q ||
    filters.categories.length > 0 ||
    filters.transmission ||
    filters.fuel ||
    filters.seatsMin != null ||
    filters.minPrice != null ||
    filters.maxPrice != null ||
    filters.startLocationId;

  return (
    <div className="pb-16 pt-[var(--header-h)]">
      <div className="relative overflow-hidden border-b border-border-subtle bg-bg-deep px-4 py-10 sm:px-6 sm:py-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(120deg, transparent 40%, rgba(201,169,98,0.35) 50%, transparent 60%)",
            backgroundSize: "200% 100%",
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-accent">Kürasyon filo</p>
            <h1 className="mt-3 max-w-3xl text-3xl font-bold leading-[1.12] tracking-tight text-text sm:text-4xl">
              Filonuzdaki <span className="text-accent">doğru aracı</span> seçin
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-text-muted sm:text-[15px]">
              Kurumsal güvenceyle şeffaf günlük fiyatlar; filtreler ve arama URL ile paylaşılabilir. Tarih ve
              alış / bırakış noktasını soldaki filtrelerde (mobilde &quot;Filtreler&quot;) seçin.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:py-10">
        <aside className="hidden w-full shrink-0 lg:block lg:w-72">
          <FilterPanel
            filters={filters}
            bounds={bounds}
            categories={categories}
            pushFilters={pushFilters}
            clearAllFilters={clearAllFilters}
            hasActiveFilters={!!hasActiveFilters}
            pickupLocationOptions={pickupHandoverOptions}
            returnLocationOptions={returnHandoverOptions}
          />
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mt-0 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-text-muted">
                <span className="font-semibold text-text">{results.length}</span> araç
                listeleniyor
                {nights != null && (
                  <span className="text-text-muted">
                    {" "}
                    · <span className="text-accent">{nights} gün</span> için fiyatlar
                    günlük bazlıdır
                  </span>
                )}
              </p>
              {hasActiveFilters && (
                <p className="mt-1 text-xs text-text-muted">
                  Filtreler URL ile paylaşılabilir — bağlantıyı kopyalayarak aynı aramayı
                  gönderebilirsiniz.
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <motion.button
                type="button"
                className="rounded-md border border-border-subtle px-3 py-2 text-[13px] font-medium text-text lg:hidden"
                whileTap={{ scale: 0.98 }}
                onClick={() => setMobileFiltersOpen(true)}
              >
                Filtreler
              </motion.button>
              <RentSelect
                value={filters.sort}
                onChange={(v) => pushFilters({ sort: v as SortKey })}
                options={sortOptions}
                ariaLabel="Sıralama"
                compact
                className="min-w-[10rem]"
              />
            </div>
          </div>

          <div className="mt-4 max-w-xl">
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Metin araması
            </span>
            <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
              <input
                type="search"
                placeholder="Marka, model, motor…"
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-border-subtle bg-bg-card px-3 py-2.5 text-[13px] text-text outline-none placeholder:text-text-muted/60 focus:border-accent/40"
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {results.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-10 border border-border-subtle bg-bg-card p-8 text-center sm:p-10"
              >
                <p className="text-xl font-semibold text-text">
                  {rentalWindowInUrl ? "Uygun araç bulunamadı" : "Sonuç bulunamadı"}
                </p>
                <p className="mt-2 text-sm text-text-muted">
                  {rentalWindowInUrl
                    ? "Seçtiğiniz tarih ve konum için şu an listelenecek uygun araç yok. Tarihleri veya alış noktasını değiştirip tekrar deneyebilirsiniz."
                    : "Filtreleri gevşetmeyi veya arama metnini temizlemeyi deneyin."}
                </p>
                <motion.button
                  type="button"
                  onClick={clearAllFilters}
                  className="mt-5 rounded-md bg-accent px-5 py-2.5 text-[13px] font-semibold text-accent-fg"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Filtreleri sıfırla
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-8 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-4"
              >
                {results.map((v, i) => (
                  <VehicleCard key={v.id} vehicle={v} querySuffix={querySuffix} revealDelay={i * 0.06} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {mobileFiltersOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              aria-label="Filtreleri kapat"
              onClick={() => setMobileFiltersOpen(false)}
            />
            <motion.div
              className="relative ml-auto flex h-full w-[min(100%,380px)] flex-col border-l border-border-subtle bg-bg-raised shadow-xl"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
            >
              <div className="flex items-center justify-between border-b border-border-subtle px-4 py-4">
                <p className="text-base font-semibold text-text">Filtreler</p>
                <button
                  type="button"
                  className="rounded-md border border-border-subtle px-3 py-1 text-[13px] text-text-muted"
                  onClick={() => setMobileFiltersOpen(false)}
                >
                  Kapat
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <FilterPanel
                  filters={filters}
                  bounds={bounds}
                  categories={categories}
                  pushFilters={(p) => {
                    pushFilters(p);
                  }}
                  clearAllFilters={() => {
                    clearAllFilters();
                    setMobileFiltersOpen(false);
                  }}
                  hasActiveFilters={!!hasActiveFilters}
                  pickupLocationOptions={pickupHandoverOptions}
                  returnLocationOptions={returnHandoverOptions}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function staticPickupHandoverList(): HeroHandoverOption[] {
  return pickupLocations.map((l) => ({
    id: (l.rentPickupHandoverId ?? l.id).trim() || l.id,
    label: l.label,
    countryCode: l.countryCode,
  }));
}

function shortHandoverLabel(full: string) {
  return full.replace("İstanbul ", "İst. ");
}

/** Alış / bırakış handover: URL (`lokasyon`, `lokasyonTeslim`) ile senkron. */
function FilterPanelLocations({
  filters,
  bounds,
  pickupFromProps,
  returnFromProps,
}: {
  filters: FleetFilterState;
  bounds: { min: number; max: number };
  pickupFromProps: HeroHandoverOption[];
  returnFromProps: HeroHandoverOption[];
}) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const pickups = pickupFromProps.length > 0 ? pickupFromProps : staticPickupHandoverList();
  const returns = returnFromProps.length > 0 ? returnFromProps : pickups;

  const [differentDropoff, setDifferentDropoff] = useState(false);
  const [returnId, setReturnId] = useState("");

  const spKey = sp.toString();
  useEffect(() => {
    const p = new URLSearchParams(spKey);
    const lok = p.get("lokasyon")?.trim() || p.get("baslangicKonum")?.trim() || "";
    const lt = p.get("lokasyonTeslim")?.trim() || lok;
    setDifferentDropoff(Boolean(lok && lt && lt !== lok));
    if (lt) setReturnId(lt);
    else if (lok) setReturnId(lok);
    else setReturnId("");
  }, [spKey]);

  const commitHandover = useCallback(
    (pick: string, drop: string, same: boolean) => {
      const pi = pick.trim();
      const di = same ? pi : drop.trim() || pi;
      const next = mergeRentalParamsIntoSearchParams(new URLSearchParams(sp.toString()), {
        lokasyon: pi,
        baslangicKonum: pi,
        lokasyonTeslim: di,
      });
      const fNext: FleetFilterState = { ...filters, startLocationId: pi };
      router.push(`${pathname}?${buildAraclarQueryString(next, fNext, bounds)}`);
    },
    [bounds, filters, pathname, router, sp],
  );

  const startOpts = useMemo(
    () => [
      { value: "", label: "Tüm konumlar" },
      ...pickups.map((l) => ({
        value: l.id,
        label: shortHandoverLabel(l.label),
        right: l.countryCode,
      })),
    ],
    [pickups],
  );

  const retOpts = useMemo(
    () =>
      returns.map((l) => ({
        value: l.id,
        label: shortHandoverLabel(l.label),
        right: l.countryCode,
      })),
    [returns],
  );

  const pickId = filters.startLocationId.trim();

  const onPickupChange = (v: string) => {
    const nextPick = v.trim();
    if (!nextPick) {
      setDifferentDropoff(false);
      commitHandover("", "", true);
      return;
    }
    if (!differentDropoff) {
      commitHandover(nextPick, nextPick, true);
      return;
    }
    let drop = returnId.trim();
    if (!drop || drop === nextPick) {
      drop = returns.find((o) => o.id !== nextPick)?.id ?? nextPick;
    }
    setReturnId(drop);
    commitHandover(nextPick, drop, false);
  };

  const onReturnChange = (v: string) => {
    setReturnId(v);
    if (!pickId) return;
    commitHandover(pickId, v, false);
  };

  const onDifferentToggle = (diff: boolean) => {
    if (!pickId) return;
    setDifferentDropoff(diff);
    if (!diff) {
      commitHandover(pickId, pickId, true);
      setReturnId(pickId);
      return;
    }
    let drop = returnId.trim();
    if (!drop || drop === pickId) {
      drop = returns.find((o) => o.id !== pickId)?.id ?? pickId;
    }
    setReturnId(drop);
    commitHandover(pickId, drop, false);
  };

  const returnSelectValue =
    returnId && returns.some((o) => o.id === returnId)
      ? returnId
      : (returns.find((o) => o.id !== pickId)?.id ?? pickId);

  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
        <LocationPinIcon className="size-3.5" />
        Kiralama başlangıç konumu
      </p>
      <div className="mt-3">
        <RentSelect
          value={filters.startLocationId}
          onChange={onPickupChange}
          options={startOpts}
          ariaLabel="Kiralama başlangıç konumu"
          className="w-full"
          leadingIcon={<LocationPinIcon className="size-3.5" />}
          optionLeadingIcon={<LocationPinIcon className="size-3.5" />}
        />
      </div>

      {pickId ? (
        <>
          <div className="mt-3">
            <DifferentDropoffToggle checked={differentDropoff} onChange={onDifferentToggle} />
          </div>
          {differentDropoff ? (
            <div className="mt-3">
              <span className="text-xs font-medium text-text-muted">Bırakış yeri</span>
              <RentSelect
                value={returnSelectValue}
                onChange={onReturnChange}
                options={retOpts}
                ariaLabel="Bırakış yeri"
                className="mt-1 w-full"
              />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/** Sol filtre sütunu: tarih/saat URL’ye yazılır; liste anında güncellenir. */
function FilterPanelRentalDates({
  filters,
  bounds,
}: {
  filters: FleetFilterState;
  bounds: { min: number; max: number };
}) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const spKey = sp.toString();

  const [pickupDate, setPickupDate] = useState(() => toIsoDate(addDays(new Date(), 1)));
  const [returnDate, setReturnDate] = useState(() => toIsoDate(addDays(new Date(), 2)));
  const [pickupTime, setPickupTime] = useState("10:00");
  const [returnTime, setReturnTime] = useState("10:00");

  useEffect(() => {
    const params = new URLSearchParams(spKey);
    const alis = params.get("alis")?.trim();
    const teslim = params.get("teslim")?.trim();
    const as = params.get("alis_saat")?.trim();
    const ts = params.get("teslim_saat")?.trim();
    if (alis && parseIsoDate(alis)) setPickupDate(alis);
    if (teslim && parseIsoDate(teslim)) setReturnDate(teslim);
    if (as) setPickupTime(as);
    if (ts) setReturnTime(ts);
  }, [spKey]);

  const maxSearchDate = useMemo(() => toIsoDate(addDays(new Date(), 400)), []);
  const minDate = useMemo(() => toIsoDate(addDays(new Date(), 0)), []);

  const pushRentalDates = useCallback(
    (patch: Partial<{ alis: string; teslim: string; alis_saat: string; teslim_saat: string }>) => {
      const alis = patch.alis ?? pickupDate;
      const teslimRaw = patch.teslim ?? returnDate;
      const p0 = parseIsoDate(alis);
      let teslim = teslimRaw;
      if (p0) {
        const r0 = parseIsoDate(teslimRaw);
        if (!r0 || compareIso(teslimRaw, alis) <= 0) teslim = toIsoDate(addDays(p0, 1));
      }
      const next = mergeRentalParamsIntoSearchParams(new URLSearchParams(sp.toString()), {
        alis,
        teslim,
        alis_saat: patch.alis_saat ?? pickupTime,
        teslim_saat: patch.teslim_saat ?? returnTime,
      });
      router.push(`${pathname}?${buildAraclarQueryString(next, filters, bounds)}`);
    },
    [bounds, filters, pathname, pickupDate, pickupTime, returnDate, returnTime, router, sp],
  );

  return (
    <div className="rounded-lg border border-border-subtle/60 bg-bg-deep/15 px-2.5 py-2 dark:bg-white/[0.03]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">Tarih ve saat</p>
      <p className="mt-0.5 text-[10px] leading-tight text-text-muted">Tarihe tıklayınca takvim açılır.</p>
      <div className="mt-2 min-w-0">
        <HeroRentalRangeDatePickers
          layout="heroSearchBar"
          compact
          desktopPopoverAlign="left"
          className="w-full min-w-0"
          minDate={minDate}
          maxDate={maxSearchDate}
          pickupDate={pickupDate}
          returnDate={returnDate}
          onRangeCommit={(p, r) => {
            setPickupDate(p);
            setReturnDate(r);
            pushRentalDates({ alis: p, teslim: r });
          }}
          pickTime={pickupTime}
          returnTime={returnTime}
          onPickTime={(t) => {
            setPickupTime(t);
            pushRentalDates({ alis_saat: t });
          }}
          onReturnTime={(t) => {
            setReturnTime(t);
            pushRentalDates({ teslim_saat: t });
          }}
        />
      </div>
    </div>
  );
}

function parseOptionalNonNegativeTry(raw: string): number | null | "invalid" {
  const t = raw.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return "invalid";
  return n;
}

function FilterPanel({
  filters,
  bounds,
  categories,
  pushFilters,
  clearAllFilters,
  hasActiveFilters,
  pickupLocationOptions,
  returnLocationOptions,
}: {
  filters: FleetFilterState;
  bounds: { min: number; max: number };
  categories: string[];
  pushFilters: (p: Partial<FleetFilterState>) => void;
  clearAllFilters: () => void;
  hasActiveFilters: boolean;
  pickupLocationOptions: HeroHandoverOption[];
  returnLocationOptions: HeroHandoverOption[];
}) {
  const [minPriceDraft, setMinPriceDraft] = useState(() =>
    filters.minPrice != null ? String(filters.minPrice) : "",
  );
  const [maxPriceDraft, setMaxPriceDraft] = useState(() =>
    filters.maxPrice != null ? String(filters.maxPrice) : "",
  );

  useEffect(() => {
    setMinPriceDraft(filters.minPrice != null ? String(filters.minPrice) : "");
    setMaxPriceDraft(filters.maxPrice != null ? String(filters.maxPrice) : "");
  }, [filters.minPrice, filters.maxPrice]);

  const appliedMinStr = filters.minPrice != null ? String(filters.minPrice) : "";
  const appliedMaxStr = filters.maxPrice != null ? String(filters.maxPrice) : "";
  const priceDraftDirty =
    minPriceDraft.trim() !== appliedMinStr || maxPriceDraft.trim() !== appliedMaxStr;

  const applyBudgetFilter = useCallback(() => {
    const minP = parseOptionalNonNegativeTry(minPriceDraft);
    const maxP = parseOptionalNonNegativeTry(maxPriceDraft);
    if (minP === "invalid" || maxP === "invalid") return;
    pushFilters({ minPrice: minP, maxPrice: maxP });
  }, [maxPriceDraft, minPriceDraft, pushFilters]);

  return (
    <div className="space-y-6 border-2 border-border-subtle bg-bg-card p-5 sm:p-6">
      <FilterPanelRentalDates filters={filters} bounds={bounds} />

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          Günlük bütçe
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-xs text-text-muted">
            Min (₺)
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-border-subtle bg-bg-card px-2 py-2 text-[13px] text-text"
              min={0}
              value={minPriceDraft}
              placeholder={String(bounds.min)}
              onChange={(e) => setMinPriceDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (priceDraftDirty) applyBudgetFilter();
                }
              }}
            />
          </label>
          <label className="text-xs text-text-muted">
            Max (₺)
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-border-subtle bg-bg-card px-2 py-2 text-[13px] text-text"
              min={0}
              value={maxPriceDraft}
              placeholder="İsteğe bağlı"
              onChange={(e) => setMaxPriceDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (priceDraftDirty) applyBudgetFilter();
                }
              }}
            />
          </label>
        </div>
        <motion.button
          type="button"
          disabled={!priceDraftDirty}
          whileTap={priceDraftDirty ? { scale: 0.98 } : undefined}
          onClick={applyBudgetFilter}
          className="mt-3 w-full rounded-lg bg-accent py-2 text-[13px] font-semibold text-accent-fg transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
        >
          Filtrele
        </motion.button>
      </div>

      <FilterPanelLocations
        filters={filters}
        bounds={bounds}
        pickupFromProps={pickupLocationOptions}
        returnFromProps={returnLocationOptions}
      />

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          Kategori
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {categories.map((c) => {
            const on = filters.categories.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => {
                  const set = new Set(filters.categories);
                  if (on) set.delete(c);
                  else set.add(c);
                  pushFilters({ categories: [...set] });
                }}
                className={`border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                  on
                    ? "border-accent bg-accent/12 text-accent"
                    : "border-border-subtle text-text-muted hover:border-accent/35 hover:text-text"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          Vites
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {transmissions.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => pushFilters({ transmission: t.id })}
              className={`border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
                filters.transmission === t.id
                  ? "border-accent bg-accent/12 text-accent"
                  : "border-border-subtle text-text-muted hover:text-text"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          Yakıt
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {fuels.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => pushFilters({ fuel: t.id })}
              className={`border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide capitalize ${
                filters.fuel === t.id
                  ? "border-accent bg-accent/12 text-accent"
                  : "border-border-subtle text-text-muted hover:text-text"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          Minimum koltuk
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[null, 2, 4, 5].map((n) => (
            <button
              key={n ?? "any"}
              type="button"
              onClick={() => pushFilters({ seatsMin: n })}
              className={`border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
                filters.seatsMin === n
                  ? "border-accent bg-accent/12 text-accent"
                  : "border-border-subtle text-text-muted hover:text-text"
              }`}
            >
              {n == null ? "Tümü" : `${n}+`}
            </button>
          ))}
        </div>
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearAllFilters}
          className="w-full rounded-lg border border-border-subtle py-2.5 text-[13px] text-text-muted transition-colors hover:border-accent/30 hover:text-text"
        >
          Tüm filtreleri temizle
        </button>
      )}

      <Link
        href="/"
        className="block text-center text-xs text-text-muted underline-offset-4 hover:text-text hover:underline"
      >
        Ana sayfaya dön
      </Link>
    </div>
  );
}
