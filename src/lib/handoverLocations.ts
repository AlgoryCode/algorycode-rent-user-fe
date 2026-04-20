import axios from "axios";

import { getRentApiRoot } from "@/lib/api-base";

export type HeroHandoverOption = {
  id: string;
  label: string;
  countryCode: string;
};

function asString(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function parseRow(row: unknown, fallbackCc: string): (HeroHandoverOption & { lineOrder: number }) | null {
  if (row == null || typeof row !== "object") return null;
  const o = row as Record<string, unknown>;
  const id = asString(o.id).trim();
  const name = asString(o.name).trim();
  if (!id || !name) return null;
  const cc = asString(o.countryCode).trim().toUpperCase() || fallbackCc;
  const lineOrder = typeof o.lineOrder === "number" && Number.isFinite(o.lineOrder) ? o.lineOrder : 0;
  return { id, label: name, countryCode: cc, lineOrder };
}

async function fetchHandoverLocationsJson(kind?: "PICKUP" | "RETURN"): Promise<unknown[]> {
  const qs = new URLSearchParams();
  if (kind) qs.set("kind", kind);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";

  if (typeof window !== "undefined") {
    const { fetchHandoverLocationsFromRentApi } = await import("@/lib/rentApi");
    const data = await fetchHandoverLocationsFromRentApi(kind ? { kind } : undefined);
    return Array.isArray(data) ? data : [];
  }

  const { getAccessTokenFromCookies } = await import("@/lib/server/rentAccessToken");
  const token = await getAccessTokenFromCookies();
  const url = `${getRentApiRoot()}/handover-locations${suffix}`;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const { status, data } = await axios.get<unknown>(url, { headers, timeout: 20_000, validateStatus: () => true });
  if (status < 200 || status >= 300) return [];
  return Array.isArray(data) ? data : [];
}

/** Ana sayfa / hero: katalog sırası (`lineOrder`, ad). */
export async function fetchHeroHandoverOptions(kind: "PICKUP" | "RETURN"): Promise<HeroHandoverOption[]> {
  const rows = await fetchHandoverLocationsJson(kind);
  const parsed: (HeroHandoverOption & { lineOrder: number })[] = [];
  for (const row of rows) {
    const o = parseRow(row, "TR");
    if (o) parsed.push(o);
  }
  parsed.sort((a, b) => a.lineOrder - b.lineOrder || a.label.localeCompare(b.label, "tr"));
  return parsed.map((o) => ({ id: o.id, label: o.label, countryCode: o.countryCode }));
}
