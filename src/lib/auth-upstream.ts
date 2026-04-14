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

/** Refresh çerezi ömrü (saniye): ~30 gün */
export const COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/** Access JWT 2 saat ile uyumlu 2FA bekleyen çerez (saniye). */
export const TWO_FACTOR_PENDING_COOKIE_MAX_AGE_SECONDS = 2 * 60 * 60;
