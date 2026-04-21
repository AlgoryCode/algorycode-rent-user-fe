import {
  clearGatewayBearerCache,
  getGatewayBearerCache,
  setGatewayBearerCache,
} from "@/lib/gateway-bearer-cache-state";

/** Üst sınır: BFF’den access okuma sıklığı (JWT uzun olsa bile). */
const MAX_CACHE_MS = 45_000;
/** JWT bitiminden şu kadar önce yenileme dene (sunucu saat kayması için). */
const PROACTIVE_REFRESH_BEFORE_EXP_MS = 120_000;
/** Önbelleği JWT exp’ten önce bırak ki bir sonraki çözümlemede yenileme fırsatı olsun. */
const CACHE_STOP_BEFORE_EXP_MS = 20_000;

export function clearBffBearerCache() {
  clearGatewayBearerCache();
}

export type BffAccessState = { accessToken: string | null; isGuestJwt: boolean };

function expToMs(exp: number | null | undefined): number | null {
  if (exp == null || !Number.isFinite(exp)) return null;
  return exp > 1e12 ? exp : exp * 1000;
}

async function readAccessFromBff(): Promise<{
  token: string | null;
  isGuestJwt: boolean;
  expMs: number | null;
}> {
  const { getPanelSameOriginAxios } = await import("@/lib/panel-same-origin-axios");
  const { data, status } = await getPanelSameOriginAxios().get<{
    accessToken?: string | null;
    isGuest?: boolean;
    accessTokenExpiresAt?: number | null;
  }>("/api/auth/access-token", { validateStatus: (s) => s < 500 });
  if (status !== 200) {
    return { token: null, isGuestJwt: false, expMs: null };
  }
  const t = data?.accessToken?.trim() ?? null;
  if (!t) {
    return { token: null, isGuestJwt: false, expMs: null };
  }
  const expMs = expToMs(data?.accessTokenExpiresAt ?? null);
  return { token: t, isGuestJwt: Boolean(data?.isGuest), expMs };
}

export async function fetchBffAccessState(): Promise<BffAccessState> {
  if (typeof window === "undefined") {
    return { accessToken: null, isGuestJwt: false };
  }
  const now = Date.now();
  const hit = getGatewayBearerCache(now);
  if (hit) {
    return { accessToken: hit.token, isGuestJwt: hit.isGuestJwt };
  }

  let { token, isGuestJwt, expMs } = await readAccessFromBff();
  if (!token) {
    clearGatewayBearerCache();
    return { accessToken: null, isGuestJwt: false };
  }

  /** Süresi dolmuş veya bitmek üzereyse tek seferde `POST /api/auth/refresh` (401’e kalmasın). */
  const shouldProactiveRefresh =
    expMs != null && expMs <= now + PROACTIVE_REFRESH_BEFORE_EXP_MS;
  if (shouldProactiveRefresh) {
    const { refreshPanelSession } = await import("@/lib/panel-same-origin-axios");
    const ok = await refreshPanelSession();
    if (ok) {
      const next = await readAccessFromBff();
      token = next.token;
      isGuestJwt = next.isGuestJwt;
      expMs = next.expMs;
    }
    if (!token) {
      clearGatewayBearerCache();
      return { accessToken: null, isGuestJwt: false };
    }
    const tCheck = Date.now();
    if (!ok && expMs != null && expMs <= tCheck) {
      clearGatewayBearerCache();
      return { accessToken: null, isGuestJwt: false };
    }
  }

  const after = Date.now();
  const cacheCap = after + MAX_CACHE_MS;
  const cacheUntil =
    expMs != null ? Math.min(cacheCap, expMs - CACHE_STOP_BEFORE_EXP_MS) : cacheCap;
  setGatewayBearerCache(token, Math.max(after + 3_000, cacheUntil), isGuestJwt);
  return { accessToken: token, isGuestJwt };
}

export async function resolveBffAccessToken(): Promise<string | null> {
  const s = await fetchBffAccessState();
  return s.accessToken;
}

export async function fetchHasBffSession(): Promise<boolean> {
  const s = await fetchBffAccessState();
  return Boolean(s.accessToken);
}

export async function fetchHasBffMemberSession(): Promise<boolean> {
  const s = await fetchBffAccessState();
  return Boolean(s.accessToken) && !s.isGuestJwt;
}
