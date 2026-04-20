import {
  clearGatewayBearerCache,
  getGatewayBearerCache,
  setGatewayBearerCache,
} from "@/lib/gateway-bearer-cache-state";

const TTL_MS = 45_000;

export function clearBffBearerCache() {
  clearGatewayBearerCache();
}

export type BffAccessState = { accessToken: string | null; isGuestJwt: boolean };

export async function fetchBffAccessState(): Promise<BffAccessState> {
  if (typeof window === "undefined") {
    return { accessToken: null, isGuestJwt: false };
  }
  const now = Date.now();
  const hit = getGatewayBearerCache(now);
  if (hit) {
    return { accessToken: hit.token, isGuestJwt: hit.isGuestJwt };
  }
  const { getPanelSameOriginAxios } = await import("@/lib/panel-same-origin-axios");
  const { data, status } = await getPanelSameOriginAxios().get<{ accessToken?: string | null; isGuest?: boolean }>(
    "/api/auth/access-token",
    { validateStatus: (s) => s < 500 },
  );
  if (status !== 200) {
    clearGatewayBearerCache();
    return { accessToken: null, isGuestJwt: false };
  }
  const t = data?.accessToken?.trim();
  if (!t) {
    clearGatewayBearerCache();
    return { accessToken: null, isGuestJwt: false };
  }
  const isGuestJwt = Boolean(data?.isGuest);
  setGatewayBearerCache(t, now + TTL_MS, isGuestJwt);
  return { accessToken: t, isGuestJwt };
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
