import type { FleetVehicle, FuelType, Transmission } from "@/data/fleet";
import { compareIso } from "@/lib/calendarGrid";
import { getLocationById } from "@/data/locations";
import { parseIsoDate, rentalNights } from "@/lib/dates";

/** URL slug veya UUID; API araçlarında `defaultPickupHandoverLocationId` UUID olabilir. */
function locationFilterMatchesVehicle(startLocationId: string, v: FleetVehicle): boolean {
  if (!startLocationId) return true;
  if (v.pickupLocationId === startLocationId) return true;
  if (v.defaultPickupHandoverLocationId === startLocationId) return true;
  const loc = getLocationById(startLocationId);
  if (!loc) return true;
  const hid = v.defaultPickupHandoverLocationId;
  if (hid && loc.rentPickupHandoverId && hid === loc.rentPickupHandoverId) return true;
  if (hid && loc.rentReturnHandoverId && hid === loc.rentReturnHandoverId) return true;
  return false;
}

export type SortKey = "onerilen" | "fiyat-artan" | "fiyat-azalan" | "isim";

export type FleetFilterState = {
  q: string;
  categories: string[];
  transmission: Transmission | "";
  fuel: FuelType | "";
  seatsMin: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  sort: SortKey;
  startLocationId: string;
};

/** Fiyat filtresi URL’si ve aralık UI’ı için; liste boşsa geniş varsayılan. */
export function priceBoundsFromVehicles(vehicles: FleetVehicle[]): { min: number; max: number } {
  const prices = vehicles.map((v) => v.pricePerDay).filter((n) => Number.isFinite(n) && n >= 0);
  if (prices.length === 0) return { min: 0, max: 100_000 };
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) return { min: Math.max(0, min - 1), max: max + 1 };
  return { min, max };
}

export function defaultFilterState(): FleetFilterState {
  return {
    q: "",
    categories: [],
    transmission: "",
    fuel: "",
    seatsMin: null,
    minPrice: null,
    maxPrice: null,
    sort: "onerilen",
    startLocationId: "",
  };
}

export function parseFiltersFromParams(
  params: URLSearchParams,
): FleetFilterState {
  const cats = params.get("kategori");
  const minP = params.get("minFiyat");
  const maxP = params.get("maxFiyat");
  const seats = params.get("koltuk");
  const vites = params.get("vites") as Transmission | "";
  const yakit = params.get("yakit") as FuelType | "";
  const sort = (params.get("siralama") as SortKey) || "onerilen";
  const startLocationId =
    params.get("baslangicKonum")?.trim() || params.get("lokasyon")?.trim() || "";
  const validSort: SortKey = [
    "onerilen",
    "fiyat-artan",
    "fiyat-azalan",
    "isim",
  ].includes(sort)
    ? sort
    : "onerilen";

  return {
    q: params.get("q")?.trim() ?? "",
    categories: cats ? cats.split(",").filter(Boolean) : [],
    transmission: vites === "otomatik" || vites === "manuel" ? vites : "",
    fuel:
      yakit === "benzin" ||
      yakit === "dizel" ||
      yakit === "hibrit" ||
      yakit === "elektrik"
        ? yakit
        : "",
    seatsMin: seats ? Math.min(7, Math.max(2, parseInt(seats, 10) || 0)) : null,
    minPrice: minP ? parseInt(minP, 10) : null,
    maxPrice: maxP ? parseInt(maxP, 10) : null,
    sort: validSort,
    startLocationId,
  };
}

export function filtersToSearchParams(
  f: FleetFilterState,
  extras: Record<string, string | undefined>,
  priceBounds: { min: number; max: number } = { min: 0, max: 50_000_000 },
): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.categories.length) p.set("kategori", f.categories.join(","));
  if (f.transmission) p.set("vites", f.transmission);
  if (f.fuel) p.set("yakit", f.fuel);
  if (f.seatsMin) p.set("koltuk", String(f.seatsMin));
  const { min } = priceBounds;
  if (f.minPrice != null && f.minPrice > min) p.set("minFiyat", String(f.minPrice));
  if (f.maxPrice != null) p.set("maxFiyat", String(f.maxPrice));
  if (f.sort !== "onerilen") p.set("siralama", f.sort);
  for (const [k, v] of Object.entries(extras)) {
    if (v) p.set(k, v);
  }
  const loc = f.startLocationId?.trim() ?? "";
  if (loc) {
    p.set("baslangicKonum", loc);
    p.set("lokasyon", loc);
  } else {
    p.delete("lokasyon");
    p.delete("baslangicKonum");
  }
  return p.toString();
}

function matchesQuery(v: FleetVehicle, q: string): boolean {
  if (!q) return true;
  const n = q.toLowerCase();
  return (
    v.name.toLowerCase().includes(n) ||
    v.brand.toLowerCase().includes(n) ||
    v.category.toLowerCase().includes(n) ||
    v.engine.toLowerCase().includes(n)
  );
}

export function applyFleetFilters(
  vehicles: FleetVehicle[],
  f: FleetFilterState,
): FleetVehicle[] {
  let list = vehicles.filter((v) => {
    if (!matchesQuery(v, f.q)) return false;
    if (f.categories.length && !f.categories.includes(v.category)) return false;
    if (f.transmission && v.transmission !== f.transmission) return false;
    if (f.fuel && v.fuel !== f.fuel) return false;
    if (f.seatsMin != null && v.seats < f.seatsMin) return false;
    if (f.minPrice != null && v.pricePerDay < f.minPrice) return false;
    if (f.maxPrice != null && v.pricePerDay > f.maxPrice) return false;
    if (f.startLocationId && !locationFilterMatchesVehicle(f.startLocationId, v)) return false;
    return true;
  });

  switch (f.sort) {
    case "fiyat-artan":
      list = [...list].sort((a, b) => a.pricePerDay - b.pricePerDay);
      break;
    case "fiyat-azalan":
      list = [...list].sort((a, b) => b.pricePerDay - a.pricePerDay);
      break;
    case "isim":
      list = [...list].sort((a, b) => a.name.localeCompare(b.name, "tr"));
      break;
    default:
      list = [...list].sort((a, b) => {
        const ab = a.badge ? 1 : 0;
        const bb = b.badge ? 1 : 0;
        if (bb !== ab) return bb - ab;
        return a.pricePerDay - b.pricePerDay;
      });
  }
  return list;
}

/** Hero / URL’de alış–teslim tarihi seçilmiş mi (gün sayısından bağımsız; aynı gün dahil). */
export function hasRentalWindowInSearchParams(params: URLSearchParams): boolean {
  const a = params.get("alis");
  const t = params.get("teslim");
  if (!a || !t) return false;
  if (!parseIsoDate(a) || !parseIsoDate(t)) return false;
  return compareIso(t, a) >= 0;
}

/** Tarih aralığı seçiliyse gösterim için gün sayısı (URL’den) */
export function nightsFromSearchParams(params: URLSearchParams): number | null {
  const a = params.get("alis");
  const t = params.get("teslim");
  if (!a || !t) return null;
  const d1 = parseIsoDate(a);
  const d2 = parseIsoDate(t);
  if (!d1 || !d2 || d2 <= d1) return null;
  return rentalNights(d1, d2);
}

/** Kiralama penceresi alanlarını mevcut sorguya yazar (boş string = parametreyi siler). */
export function mergeRentalParamsIntoSearchParams(
  sp: URLSearchParams,
  patch: Partial<{
    alis: string;
    teslim: string;
    lokasyon: string;
    lokasyonTeslim: string;
    baslangicKonum: string;
    alis_saat: string;
    teslim_saat: string;
  }>,
): URLSearchParams {
  const p = new URLSearchParams(sp.toString());
  for (const [key, val] of Object.entries(patch)) {
    if (val === undefined) continue;
    const s = String(val).trim();
    if (s === "") p.delete(key);
    else p.set(key, s);
  }
  return p;
}

/** Mevcut tarih/lokasyon parametrelerini koruyarak filtre sorgusu üretir */
export function buildAraclarQueryString(
  sp: URLSearchParams,
  f: FleetFilterState,
  priceBounds?: { min: number; max: number },
): string {
  const extras: Record<string, string | undefined> = {};
  for (const k of [
    "alis",
    "teslim",
    "lokasyon",
    "lokasyonTeslim",
    "baslangicKonum",
    "alis_saat",
    "teslim_saat",
    "arac",
  ] as const) {
    const v = sp.get(k);
    if (v) extras[k] = v;
  }
  return filtersToSearchParams(f, extras, priceBounds);
}
