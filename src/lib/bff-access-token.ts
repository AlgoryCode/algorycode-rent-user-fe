/** httpOnly access JWT’yi gateway Bearer için okur (aynı origin `/api/auth/access-token`). */

let bearerCache: { token: string; exp: number } | null = null;
const TTL_MS = 45_000;

export function clearBffBearerCache() {
  bearerCache = null;
}

export async function resolveBffAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const now = Date.now();
  if (bearerCache && bearerCache.exp > now) {
    return bearerCache.token;
  }
  const r = await fetch("/api/auth/access-token", { credentials: "same-origin", cache: "no-store" });
  if (!r.ok) {
    bearerCache = null;
    return null;
  }
  const j = (await r.json()) as { accessToken?: string | null };
  const t = j.accessToken?.trim();
  if (!t) {
    bearerCache = null;
    return null;
  }
  bearerCache = { token: t, exp: now + TTL_MS };
  return t;
}

export async function fetchHasBffSession(): Promise<boolean> {
  const t = await resolveBffAccessToken();
  return Boolean(t);
}
