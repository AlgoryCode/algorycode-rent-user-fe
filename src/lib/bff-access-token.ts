/** httpOnly access JWT’yi gateway Bearer için okur (aynı origin `/api/auth/access-token`). */

let bearerCache: { token: string; exp: number; isGuestJwt: boolean } | null = null;
const TTL_MS = 45_000;

export function clearBffBearerCache() {
  bearerCache = null;
}

export type BffAccessState = { accessToken: string | null; isGuestJwt: boolean };

/** Misafir ve üye aynı çerez adını kullanır; {@code isGuestJwt} üye “giriş yapıldı” UI’ından ayrım için. */
export async function fetchBffAccessState(): Promise<BffAccessState> {
  if (typeof window === "undefined") {
    return { accessToken: null, isGuestJwt: false };
  }
  const now = Date.now();
  if (bearerCache && bearerCache.exp > now) {
    return {
      accessToken: bearerCache.token,
      isGuestJwt: bearerCache.isGuestJwt,
    };
  }
  const r = await fetch("/api/auth/access-token", { credentials: "same-origin", cache: "no-store" });
  if (!r.ok) {
    bearerCache = null;
    return { accessToken: null, isGuestJwt: false };
  }
  const j = (await r.json()) as { accessToken?: string | null; isGuest?: boolean };
  const t = j.accessToken?.trim();
  if (!t) {
    bearerCache = null;
    return { accessToken: null, isGuestJwt: false };
  }
  const isGuestJwt = Boolean(j.isGuest);
  bearerCache = { token: t, exp: now + TTL_MS, isGuestJwt };
  return { accessToken: t, isGuestJwt };
}

export async function resolveBffAccessToken(): Promise<string | null> {
  const s = await fetchBffAccessState();
  return s.accessToken;
}

/** Herhangi bir Bearer (misafir veya üye) — rezervasyon API’si için. */
export async function fetchHasBffSession(): Promise<boolean> {
  const s = await fetchBffAccessState();
  return Boolean(s.accessToken);
}

/** Üye oturumu: JWT misafir claim’i taşımıyor (header “hesabım” vb.). */
export async function fetchHasBffMemberSession(): Promise<boolean> {
  const s = await fetchBffAccessState();
  return Boolean(s.accessToken) && !s.isGuestJwt;
}
