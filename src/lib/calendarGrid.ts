import { parseIsoDate } from "@/lib/dates";

export const WEEKDAYS_TR = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];

export function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function mondayIndexFromJsWeekday(jsDay: number) {
  return jsDay === 0 ? 6 : jsDay - 1;
}

export function calendarCells(year: number, monthIndex: number): (number | null)[] {
  const dim = daysInMonth(year, monthIndex);
  const first = mondayIndexFromJsWeekday(new Date(year, monthIndex, 1).getDay());
  const cells: (number | null)[] = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  while (cells.length < 42) cells.push(null);
  return cells;
}

export function compareIso(a: string, b: string): number {
  return a.localeCompare(b);
}

export function monthStart(year: number, month: number) {
  return new Date(year, month, 1);
}

export function canGoPrevCalendar(year: number, month: number, minD: Date) {
  return monthStart(year, month) > monthStart(minD.getFullYear(), minD.getMonth());
}

export function canGoNextCalendar(
  year: number,
  month: number,
  maxDateStr: string | undefined,
) {
  if (!maxDateStr) return true;
  const maxP = parseIsoDate(maxDateStr);
  if (!maxP) return true;
  const ny = month === 11 ? year + 1 : year;
  const nm = month === 11 ? 0 : month + 1;
  const firstNext = new Date(ny, nm, 1);
  return firstNext.getTime() <= maxP.getTime();
}
