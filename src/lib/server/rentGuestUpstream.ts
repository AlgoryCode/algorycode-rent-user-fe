import { resolveBaseApiUrl } from "@/lib/api-base";

/** Gateway’de JWT filtresi olmayan misafir rent öneki (`/rent/guest/...` → rent-service kökü). */
export function buildRentGuestGatewayUrl(path: string): string {
  const origin = resolveBaseApiUrl().replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${origin}/rent/guest${p}`;
}
