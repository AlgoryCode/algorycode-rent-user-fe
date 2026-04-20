"use client";

export type GatewayBearerEntry = { token: string; exp: number; isGuestJwt: boolean };

let gatewayBearerCache: GatewayBearerEntry | null = null;

export function clearGatewayBearerCache() {
  gatewayBearerCache = null;
}

export function getGatewayBearerCache(now: number): GatewayBearerEntry | null {
  if (gatewayBearerCache && gatewayBearerCache.exp > now) return gatewayBearerCache;
  return null;
}

export function setGatewayBearerCache(token: string, exp: number, isGuestJwt: boolean) {
  gatewayBearerCache = { token, exp, isGuestJwt };
}
