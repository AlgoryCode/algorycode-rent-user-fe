import { addDays, parseIsoDate, toIsoDate } from "@/lib/dates";

export type TrHolidaySpan = {
  startIso: string;
  endIso: string;
  /** Lejant satırı (görünür aralıkta gösterilir) */
  legend: string;
};

function fixedNational(y: number): TrHolidaySpan[] {
  const y4 = String(y);
  return [
    {
      startIso: `${y4}-04-23`,
      endIso: `${y4}-04-23`,
      legend: "23 Nisan: Ulusal Egemenlik ve Çocuk Bayramı",
    },
    {
      startIso: `${y4}-05-01`,
      endIso: `${y4}-05-01`,
      legend: "1 Mayıs: Emek ve Dayanışma Günü",
    },
    {
      startIso: `${y4}-05-19`,
      endIso: `${y4}-05-19`,
      legend: "19 Mayıs: Atatürk’ü Anma, Gençlik ve Spor Bayramı",
    },
    {
      startIso: `${y4}-07-15`,
      endIso: `${y4}-07-15`,
      legend: "15 Temmuz: Demokrasi ve Millî Birlik Günü",
    },
    {
      startIso: `${y4}-08-30`,
      endIso: `${y4}-08-30`,
      legend: "30 Ağustos: Zafer Bayramı",
    },
    {
      startIso: `${y4}-10-29`,
      endIso: `${y4}-10-29`,
      legend: "29 Ekim: Cumhuriyet Bayramı",
    },
  ];
}

/** Dini bayramlar yıla göre değişir; tablo dışı yıllarda yalnızca sabit resmi tatiller kullanılır. */
const MOVING_BY_YEAR: Record<number, TrHolidaySpan[]> = {
  2025: [
    {
      startIso: "2025-03-30",
      endIso: "2025-04-01",
      legend: "30 Mart – 1 Nisan: Ramazan Bayramı",
    },
    {
      startIso: "2025-06-05",
      endIso: "2025-06-08",
      legend: "5–8 Haziran: Kurban Bayramı",
    },
    {
      startIso: "2025-06-04",
      endIso: "2025-06-04",
      legend: "4 Haziran: Kurban Bayramı Arifesi",
    },
  ],
  2026: [
    {
      startIso: "2026-03-30",
      endIso: "2026-04-01",
      legend: "30 Mart – 1 Nisan: Ramazan Bayramı",
    },
    {
      startIso: "2026-05-26",
      endIso: "2026-05-26",
      legend: "26 Mayıs: Kurban Bayramı Arifesi",
    },
    {
      startIso: "2026-05-27",
      endIso: "2026-05-30",
      legend: "27–30 Mayıs: Kurban Bayramı",
    },
  ],
  2027: [
    {
      startIso: "2027-03-09",
      endIso: "2027-03-11",
      legend: "9–11 Mart: Ramazan Bayramı",
    },
    {
      startIso: "2027-05-16",
      endIso: "2027-05-16",
      legend: "16 Mayıs: Kurban Bayramı Arifesi",
    },
    {
      startIso: "2027-05-17",
      endIso: "2027-05-20",
      legend: "17–20 Mayıs: Kurban Bayramı",
    },
  ],
};

export function trHolidaySpansForYear(year: number): TrHolidaySpan[] {
  return [...fixedNational(year), ...(MOVING_BY_YEAR[year] ?? [])];
}

/** Görünür [fromIso, toIso] ile kesişen tatiller (lejant). */
export function trHolidaysOverlappingRange(fromIso: string, toIso: string): TrHolidaySpan[] {
  const y0 = Number(fromIso.slice(0, 4));
  const y1 = Number(toIso.slice(0, 4));
  const out: TrHolidaySpan[] = [];
  const seen = new Set<string>();
  for (let y = y0; y <= y1; y++) {
    for (const s of trHolidaySpansForYear(y)) {
      if (seen.has(s.legend)) continue;
      if (s.endIso < fromIso || s.startIso > toIso) continue;
      seen.add(s.legend);
      out.push(s);
    }
  }
  return out.sort((a, b) => a.startIso.localeCompare(b.startIso));
}

export function trHolidayDotSetForRange(fromIso: string, toIso: string): Set<string> {
  const dots = new Set<string>();
  for (const span of trHolidaysOverlappingRange(fromIso, toIso)) {
    let d = parseIsoDate(span.startIso);
    const end = parseIsoDate(span.endIso);
    if (!d || !end) continue;
    const lim = end.getTime();
    while (d.getTime() <= lim) {
      const iso = toIsoDate(d);
      if (iso >= fromIso && iso <= toIso) dots.add(iso);
      d = addDays(d, 1);
    }
  }
  return dots;
}
