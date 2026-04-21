import { buildRentGuestGatewayUrl } from "@/lib/server/rentGuestUpstream";
import { extractHandoverRowsFromApiPayload } from "@/lib/rentReadModel";

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
  const label = asString(o.name).trim() || asString(o.label).trim();
  if (!id || !label) return null;
  const cc = asString(o.countryCode).trim().toUpperCase() || fallbackCc;
  const lineOrder = typeof o.lineOrder === "number" && Number.isFinite(o.lineOrder) ? o.lineOrder : 0;
  return { id, label, countryCode: cc, lineOrder };
}

async function fetchHandoverLocationsJson(kind?: "PICKUP" | "RETURN"): Promise<unknown[]> {
  const qs = new URLSearchParams();
  if (kind) qs.set("kind", kind);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";

  if (typeof window !== "undefined") {
    const { fetchHandoverLocationsFromRentApi } = await import("@/lib/rentApi");
    const data = await fetchHandoverLocationsFromRentApi(kind ? { kind } : undefined);
    return extractHandoverRowsFromApiPayload(data);
  }

  /** RSC: JWT olmadan korumalı `/rent/...` 401 verir; her zaman misafir (public) gateway. */
  const url = `${buildRentGuestGatewayUrl("/handover-locations")}${suffix}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: {
      revalidate: 120,
      tags: ["handover-locations", kind ? `handover-locations-${kind}` : "handover-locations-all"],
    },
  });
  if (!res.ok) return [];
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return [];
  }
  return extractHandoverRowsFromApiPayload(data);
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
