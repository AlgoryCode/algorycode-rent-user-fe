import type { RentRentalDto } from "@/lib/rentApi";
import { addDays, parseIsoDate, toIsoDate } from "@/lib/dates";

function rentalCountsForCalendar(raw: RentRentalDto): boolean {
  const s = String(raw.status ?? "active").toLowerCase();
  return s !== "cancelled";
}

function rowVehicleId(raw: RentRentalDto): string {
  const v = raw.vehicleId ?? raw.vehicle_id;
  return v != null ? String(v) : "";
}

export function expandInclusiveRangeIntoSet(startIso: string, endIso: string, target: Set<string>): void {
  const a = parseIsoDate(startIso);
  const b = parseIsoDate(endIso);
  if (!a || !b) return;
  const start = a <= b ? a : b;
  const end = a <= b ? b : a;
  let d = new Date(start);
  while (d <= end) {
    target.add(toIsoDate(d));
    d = addDays(d, 1);
  }
}

/** `GET /vehicles/{id}/calendar/occupancy` yanıtı: kiralama + talep aralıkları; uçlar dahil. */
export type CalendarOccupancyRange = { startDate: string; endDate: string };

export function blockedIsoDateSetFromOccupancyRanges(ranges: CalendarOccupancyRange[]): Set<string> {
  const out = new Set<string>();
  for (const r of ranges) {
    const start = String(r.startDate ?? "").trim();
    const end = String(r.endDate ?? "").trim();
    if (!start || !end) continue;
    expandInclusiveRangeIntoSet(start, end, out);
  }
  return out;
}

/** Kiralama kayıtlarından (iptal hariç) YYYY-MM-DD dolu gün kümesi — yalnızca `vehicleId` eşleşen satırlar. */
export function blockedIsoDateSetFromRentals(rows: RentRentalDto[], vehicleId: string): Set<string> {
  const out = new Set<string>();
  const vid = vehicleId.trim();
  if (!vid) return out;
  for (const r of rows) {
    if (rowVehicleId(r) !== vid) continue;
    if (!rentalCountsForCalendar(r)) continue;
    const start = String(r.startDate ?? r.start_date ?? "");
    const end = String(r.endDate ?? r.end_date ?? "");
    expandInclusiveRangeIntoSet(start, end, out);
  }
  return out;
}
