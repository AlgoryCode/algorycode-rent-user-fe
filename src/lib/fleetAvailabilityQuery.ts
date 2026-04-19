import { getLocationById } from "@/data/locations";
import { compareIso } from "@/lib/calendarGrid";
import { parseIsoDate } from "@/lib/dates";

/** URL’de doğrudan `handover_locations.id` (UUID) kullanıldığında slug çözümüne gerek yok. */
function looksLikeHandoverUuid(value: string): boolean {
  const s = value.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

/** Rent API `GET /vehicles` uygunluk sorgusu (tarihler zorunlu; handover’lar opsiyonel). */
export type FleetAvailabilityQuery = {
  availableFrom: string;
  availableTo: string;
  pickupHandoverLocationId?: string;
  returnHandoverLocationId?: string;
  /** true: tam aralık dolu olsa bile alış + ertesi gün müsait araçlar dahil (kullanıcı arama). */
  includePartialAvailability?: boolean;
};

function firstParam(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

/** Next `searchParams` kaydını tek değer string haritasına indirger. */
export function flattenSearchParams(
  sp: Record<string, string | string[] | undefined> | URLSearchParams,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof URLSearchParams !== "undefined" && sp instanceof URLSearchParams) {
    sp.forEach((v, k) => {
      const s = v.trim();
      if (s) out[k] = s;
    });
    return out;
  }
  for (const [k, v] of Object.entries(sp as Record<string, string | string[] | undefined>)) {
    const s = firstParam(v)?.trim();
    if (s) out[k] = s;
  }
  return out;
}

/**
 * Hero / araclar URL’inden (`alis`, `teslim`, `lokasyon` …) API uygunluk parametreleri üretir.
 * Tarihler geçersiz veya eksikse `undefined` (tam liste).
 */
export function parseFleetAvailabilityFromFlatParams(
  flat: Record<string, string>,
): FleetAvailabilityQuery | undefined {
  const alis = flat.alis ?? flat.pickup;
  const teslim = flat.teslim ?? flat.dropoff;
  if (!alis || !teslim) return undefined;
  if (!parseIsoDate(alis) || !parseIsoDate(teslim)) return undefined;
  if (compareIso(teslim, alis) < 0) return undefined;

  const lokasyonSlug = flat.baslangicKonum || flat.lokasyon;
  const teslimSlug = flat.lokasyonTeslim || lokasyonSlug;

  let pickupHandoverLocationId: string | undefined;
  let returnHandoverLocationId: string | undefined;
  if (lokasyonSlug) {
    if (looksLikeHandoverUuid(lokasyonSlug)) pickupHandoverLocationId = lokasyonSlug.trim();
    else {
      const loc = getLocationById(lokasyonSlug);
      pickupHandoverLocationId = loc?.rentPickupHandoverId;
    }
  }
  if (teslimSlug) {
    if (looksLikeHandoverUuid(teslimSlug)) returnHandoverLocationId = teslimSlug.trim();
    else {
      const loc = getLocationById(teslimSlug);
      returnHandoverLocationId = loc?.rentReturnHandoverId ?? loc?.rentPickupHandoverId;
    }
  }

  const q: FleetAvailabilityQuery = {
    availableFrom: alis,
    availableTo: teslim,
    includePartialAvailability: true,
  };
  if (pickupHandoverLocationId) q.pickupHandoverLocationId = pickupHandoverLocationId;
  if (returnHandoverLocationId) q.returnHandoverLocationId = returnHandoverLocationId;
  if (
    q.pickupHandoverLocationId &&
    q.returnHandoverLocationId &&
    q.pickupHandoverLocationId === q.returnHandoverLocationId
  ) {
    delete q.returnHandoverLocationId;
  }
  return q;
}

export function fleetAvailabilityToSearchParams(q: FleetAvailabilityQuery): URLSearchParams {
  const p = new URLSearchParams();
  p.set("availableFrom", q.availableFrom);
  p.set("availableTo", q.availableTo);
  if (q.pickupHandoverLocationId) p.set("pickupHandoverLocationId", q.pickupHandoverLocationId);
  if (q.returnHandoverLocationId) p.set("returnHandoverLocationId", q.returnHandoverLocationId);
  if (q.includePartialAvailability) p.set("includePartialAvailability", "true");
  return p;
}

/** Ana sayfa → araclar “aynı arama” linki için tarih/lokasyon parametrelerini koru. */
export function buildAraclarPreserveQuery(flat: Record<string, string>): string {
  const u = new URLSearchParams();
  for (const k of [
    "alis",
    "teslim",
    "lokasyon",
    "lokasyonTeslim",
    "baslangicKonum",
    "alis_saat",
    "teslim_saat",
  ] as const) {
    const v = flat[k];
    if (v) u.set(k, v);
  }
  return u.toString();
}
