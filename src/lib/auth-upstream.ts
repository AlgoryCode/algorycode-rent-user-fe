import { getAuthApiRoot } from "@/lib/api-base";

const trimTrailingSlash = (s: string) => s.replace(/\/+$/, "");

/**
 * Next `/api/auth/*` route’larından AuthService’e giden kök.
 * `AUTH_UPSTREAM` / `NEXT_PUBLIC_AUTH_UPSTREAM` doluysa doğrudan AuthService (örn. http://localhost:8099).
 * Aksi halde `getAuthApiRoot()` = `{gateway}/authservice`.
 */
export function getAuthUpstreamUrl(): string {
  const direct = process.env.AUTH_UPSTREAM?.trim() || process.env.NEXT_PUBLIC_AUTH_UPSTREAM?.trim();
  if (direct) return trimTrailingSlash(direct);
  return getAuthApiRoot();
}

/** AuthService’de e-posta kayıt kontrolü path’i (host yok, `/` ile başlar). */
export function getAuthUpstreamEmailCheckPath(): string {
  const p = process.env.AUTH_UPSTREAM_EMAIL_CHECK_PATH?.trim() || "/basicauth/email-registered/check";
  return p.startsWith("/") ? p : `/${p}`;
}

/** AuthService misafir oturumu path’i. */
export function getAuthUpstreamGuestSessionPath(): string {
  const p = process.env.AUTH_UPSTREAM_GUEST_SESSION_PATH?.trim() || "/guest/access-token";
  return p.startsWith("/") ? p : `/${p}`;
}

/** `GET` veya `POST` (varsayılan POST). GET ise sorgu `?email=` */
export function getAuthUpstreamEmailCheckMethod(): "GET" | "POST" {
  const m = process.env.AUTH_UPSTREAM_EMAIL_CHECK_METHOD?.trim().toUpperCase();
  return m === "GET" ? "GET" : "POST";
}

/** Refresh çerezi ömrü (saniye): ~30 gün */
export const COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/** Access JWT 2 saat ile uyumlu 2FA bekleyen çerez (saniye). */
export const TWO_FACTOR_PENDING_COOKIE_MAX_AGE_SECONDS = 2 * 60 * 60;
