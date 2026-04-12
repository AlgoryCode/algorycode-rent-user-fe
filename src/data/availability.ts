import { addDays, parseIsoDate, toIsoDate } from "@/lib/dates";

/** Bugünden itibaren göreli gün ofseti → ISO (demo veri) */
function fromToday(offset: number): string {
  return toIsoDate(addDays(new Date(), offset));
}

/**
 * Araç bazlı dolu günler (YYYY-MM-DD). Dashboard demo verisi.
 * Negatif ofsetler geçmiş günleri temsil eder; takvimde zaten gizlenir.
 */
export const vehicleBlockedDates: Record<string, string[]> = {
  "1": [
    fromToday(2),
    fromToday(3),
    fromToday(4),
    fromToday(15),
    fromToday(16),
    fromToday(17),
  ],
  "2": [fromToday(5), fromToday(6), fromToday(7), fromToday(20), fromToday(21)],
  "3": [fromToday(1), fromToday(8), fromToday(9), fromToday(22)],
  "4": [fromToday(10), fromToday(11), fromToday(12), fromToday(25)],
  "5": [fromToday(3), fromToday(4), fromToday(30), fromToday(31)],
  "6": [fromToday(6), fromToday(13), fromToday(14), fromToday(27)],
};

export function blockedSetForVehicle(vehicleId: string | null | undefined): Set<string> {
  const set = new Set<string>();
  if (vehicleId && vehicleBlockedDates[vehicleId]) {
    vehicleBlockedDates[vehicleId].forEach((d) => set.add(d));
    return set;
  }
  Object.values(vehicleBlockedDates)
    .flat()
    .forEach((d) => set.add(d));
  return set;
}

/** [from, to] dahil aralıkta dolu günlerin listesi */
export function blockedDaysInInclusiveRange(
  fromIso: string,
  toIso: string,
  blocked: Set<string>,
): string[] {
  const a = parseIsoDate(fromIso);
  const b = parseIsoDate(toIso);
  if (!a || !b) return [];
  const start = a <= b ? a : b;
  const end = a <= b ? b : a;
  const found: string[] = [];
  let d = new Date(start);
  while (d <= end) {
    const iso = toIsoDate(d);
    if (blocked.has(iso)) found.push(iso);
    d = addDays(d, 1);
  }
  return found;
}
