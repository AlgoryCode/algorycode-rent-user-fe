import { pickupLocations } from "@/data/locations";
import { parseIsoDate, rentalNights } from "@/lib/dates";

export function firstSearchParam(
  v: string | string[] | undefined,
): string | undefined {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && v[0]) return v[0];
  return undefined;
}

/** Rezervasyon URL’si için zorunlu alanlar ve tutarlı tarih/lokasyon kontrolü */
export function isCompleteBookingQuery(p: {
  arac: string | undefined;
  alis: string | undefined;
  teslim: string | undefined;
  lokasyon: string | undefined;
  lokasyonTeslim?: string | undefined;
}): boolean {
  if (!p.arac?.trim()) return false;
  if (!p.alis || !p.teslim || !p.lokasyon) return false;
  if (!pickupLocations.some((l) => l.id === p.lokasyon)) return false;
  if (
    p.lokasyonTeslim &&
    !pickupLocations.some((l) => l.id === p.lokasyonTeslim)
  ) {
    return false;
  }
  const a = parseIsoDate(p.alis);
  const b = parseIsoDate(p.teslim);
  if (!a || !b || b < a) return false;
  return rentalNights(a, b) >= 1;
}
