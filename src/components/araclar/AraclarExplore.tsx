"use client";

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
import { VehicleCard } from "@/components/vehicle/VehicleCard";
import { DifferentDropoffToggle } from "@/components/ui/DifferentDropoffToggle";
import { LocationPinIcon } from "@/components/ui/LocationPinIcon";
import { RentSelect } from "@/components/ui/RentSelect";
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
      <div className="relative overflow-hidden border-b border-border-subtle bg-bg-raised px-4 py-10 sm:px-6 sm:py-12">
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
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-accent">Kürasyon filo</p>
            <h1 className="mt-3 max-w-3xl text-3xl font-bold leading-[1.12] tracking-tight text-text sm:text-4xl">
              Filonuzdaki <span className="text-accent">doğru aracı</span> seçin
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-text-muted sm:text-[15px]">
              Kurumsal güvenceyle şeffaf günlük fiyatlar; filtreler ve arama URL ile paylaşılabilir. Tarih ve
              alış / bırakış noktasını soldaki filtrelerde (mobilde &quot;Filtreler&quot;) seçin.
            </p>
          </div>
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
              <button
                type="button"
                className="rounded-md border border-border-subtle px-3 py-2 text-[13px] font-medium text-text active:scale-[0.98] lg:hidden"
                onClick={() => setMobileFiltersOpen(true)}
              >
                Filtreler
              </button>
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

          {results.length === 0 ? (
              <div className="mt-10 border border-border-subtle bg-bg-card p-8 text-center sm:p-10">
                <p className="text-xl font-semibold text-text">
                  {!rentalWindowInUrl
                    ? "Aramayı başlatın"
                    : vehicles.length === 0
                      ? "Uygun araç bulunamadı"
                      : "Sonuç bulunamadı"}
                </p>
                <p className="mt-2 text-sm text-text-muted">
                  {!rentalWindowInUrl
                    ? "Sol menüden veya üstteki formdan alış ve teslim tarihlerini seçin; uygun araçlar bu sayfada listelenir. Tarih seçildiğinde liste sunucudan yüklenir."
                    : vehicles.length === 0
                      ? "Seçtiğiniz tarih ve konum için şu an listelenecek uygun araç yok. Tarihleri veya alış noktasını değiştirip tekrar deneyebilirsiniz."
                      : "Filtreleri gevşetmeyi veya arama metnini temizlemeyi deneyin."}
                </p>
                {rentalWindowInUrl ? (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="mt-5 rounded-md bg-btn-solid px-5 py-2.5 text-[13px] font-semibold text-btn-solid-fg"
                  >
                    Filtreleri sıfırla
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="mt-8 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-4">
                {results.map((v, i) => (
                  <VehicleCard key={v.id} vehicle={v} querySuffix={querySuffix} revealDelay={i * 0.06} />
                ))}
              </div>
            )}
        </div>
      </div>

      {mobileFiltersOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Filtreleri kapat"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="relative ml-auto flex h-full w-[min(100%,380px)] flex-col border-l border-border-subtle bg-bg-raised shadow-xl">
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
          </div>
        </div>
      ) : null}
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
  const pickupFallback = pickupFromProps.length > 0 ? pickupFromProps : staticPickupHandoverList();
  const returns = returnFromProps.length > 0 ? returnFromProps : pickupFallback;
  /** Kiralama başlangıcı: önce DB `RETURN` (teslim) handover listesi; boşsa `PICKUP` / statik yedek. */
  const pickups = returnFromProps.length > 0 ? returnFromProps : pickupFallback;

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
  const [clearFiltersConfirmOpen, setClearFiltersConfirmOpen] = useState(false);

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
    <>
    <div className="overflow-hidden rounded-xl border-0 bg-bg-card shadow-none">
      <div className="flex flex-col divide-y divide-border-subtle [&>*]:px-5 [&>*]:py-4 sm:[&>*]:px-6 sm:[&>*]:py-5">
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

      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={!priceDraftDirty}
          onClick={applyBudgetFilter}
          className="w-full rounded-lg bg-btn-solid py-2.5 text-[13px] font-semibold text-btn-solid-fg transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
        >
          Filtrele
        </button>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={() => setClearFiltersConfirmOpen(true)}
            className="w-full rounded-lg border border-border-subtle py-2.5 text-[13px] text-text-muted transition-colors hover:border-accent/30 hover:text-text"
          >
            Tüm filtreleri temizle
          </button>
        ) : null}
      </div>
      </div>
    </div>

    {clearFiltersConfirmOpen ? (
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-[2px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="clear-filters-title"
        onClick={() => setClearFiltersConfirmOpen(false)}
      >
        <div
          className="w-full max-w-sm rounded-2xl border border-border-subtle bg-bg-card p-5 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <p id="clear-filters-title" className="text-base font-semibold text-text">
            Emin misiniz?
          </p>
          <p className="mt-2 text-sm leading-relaxed text-text-muted">
            Tüm filtreler sıfırlanır. Alış / teslim tarihleri ve konum parametreleri URL&apos;de olduğu gibi kalır.
          </p>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="w-full rounded-lg border border-border-subtle py-2.5 text-[13px] font-medium text-text sm:w-auto sm:min-w-[6.5rem]"
              onClick={() => setClearFiltersConfirmOpen(false)}
            >
              Vazgeç
            </button>
            <button
              type="button"
              className="w-full rounded-lg bg-rose-600/90 py-2.5 text-[13px] font-semibold text-white sm:w-auto sm:min-w-[6.5rem]"
              onClick={() => {
                clearAllFilters();
                setClearFiltersConfirmOpen(false);
              }}
            >
              Evet, temizle
            </button>
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
}
