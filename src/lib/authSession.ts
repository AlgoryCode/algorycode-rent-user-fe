export type AuthUserProfile = {
  userId?: number;
  fullName?: string;
  email?: string;
  phone?: string;
};

const ACCESS_COOKIE_KEYS = [
  "access_token",
  "accessToken",
  "algory_access_token",
  "token",
  "auth_token",
] as const;
const USER_STORAGE_KEY = "rent.auth.user";

export function hasAuthTokenInCookie(cookieValue: string): boolean {
  const raw = cookieValue || "";
  return ACCESS_COOKIE_KEYS.some((k) => new RegExp(`(?:^|; )${k}=`).test(raw));
}

export function hasClientAuthToken(): boolean {
  if (typeof document === "undefined") return false;
  return hasAuthTokenInCookie(document.cookie || "");
}

function getCookieByName(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function getClientAccessToken(): string | null {
  for (const k of ACCESS_COOKIE_KEYS) {
    const v = getCookieByName(k);
    if (v) return v;
  }
  return null;
}

export function readUserIdFromJwt(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as {
      userId?: unknown;
      sub?: unknown;
    };
    if (typeof decoded.userId === "number") return decoded.userId;
    if (typeof decoded.sub === "string") {
      const n = Number(decoded.sub);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function setClientAccessToken(token: string, days = 7) {
  if (typeof document === "undefined" || !token) return;
  const maxAge = Math.max(60, Math.floor(days * 24 * 60 * 60));
  document.cookie = `access_token=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; samesite=lax`;
}

export function clearClientAuthSession() {
  if (typeof document !== "undefined") {
    for (const k of [
      "access_token",
      "accessToken",
      "algory_access_token",
      "refreshToken",
      "refresh_token",
      "algory_refresh_token",
      "token",
      "auth_token",
    ]) {
      document.cookie = `${k}=; path=/; max-age=0; samesite=lax`;
    }
  }
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(USER_STORAGE_KEY);
  }
}

export function setStoredAuthUser(profile: AuthUserProfile) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile));
}

export function getStoredAuthUser(): AuthUserProfile | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUserProfile;
  } catch {
    return null;
  }
}
