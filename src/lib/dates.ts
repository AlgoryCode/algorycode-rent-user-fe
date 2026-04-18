/** YYYY-MM-DD */
export function parseIsoDate(s: string | null | undefined): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(d: Date, days: number): Date {
  const n = new Date(d);
  n.setDate(n.getDate() + days);
  return n;
}

/** Inclusive start, exclusive end convention: nights = ceil diff in days for rental */
export function rentalNights(pickup: Date, returnDate: Date): number {
  const ms = returnDate.getTime() - pickup.getTime();
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  return Math.max(1, days);
}

export function formatTrDate(iso: string): string {
  const d = parseIsoDate(iso);
  if (!d) return iso;
  return d.toLocaleDateString("tr-TR", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Tam ISO veya offset’li datetime; yalnızca `YYYY-MM-DD` ise saat yok kabul edilir (`formatTrDate`). */
export function formatTrDateTime(iso: string): string {
  const t = (iso || "").trim();
  if (!t) return t;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    return formatTrDate(t);
  }
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) {
    const day = parseIsoDate(t.slice(0, 10));
    if (!day) return iso;
    return formatTrDate(toIsoDate(day));
  }
  const datePart = d.toLocaleDateString("tr-TR", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timePart = d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  return `${datePart} · ${timePart}`;
}

export function todayIso(): string {
  return toIsoDate(new Date());
}
