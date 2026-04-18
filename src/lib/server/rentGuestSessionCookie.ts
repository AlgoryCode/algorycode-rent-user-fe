export const RENT_GUEST_SESSION_COOKIE = "rent_guest_session";

export const RENT_GUEST_SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export type RentGuestSessionPayload = { sid: string; email: string };

function normalizeEmail(raw: string): string | null {
  const e = raw.trim().toLowerCase();
  if (e.length < 3 || e.length > 320) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return null;
  return e;
}

export function parseRentGuestSessionCookie(raw: string | undefined): RentGuestSessionPayload | null {
  if (!raw?.trim()) return null;
  try {
    const decoded = decodeURIComponent(raw.trim());
    const j = JSON.parse(decoded) as { sid?: unknown; email?: unknown };
    const sid = typeof j.sid === "string" ? j.sid.trim() : "";
    const email = typeof j.email === "string" ? normalizeEmail(j.email) : null;
    if (!sid || !email) return null;
    return { sid, email };
  } catch {
    return null;
  }
}

export function readRentGuestSessionFromCookies(store: {
  get(name: string): { value: string } | undefined;
}): RentGuestSessionPayload | null {
  const raw = store.get(RENT_GUEST_SESSION_COOKIE)?.value;
  return parseRentGuestSessionCookie(raw);
}

export function serializeRentGuestSession(payload: RentGuestSessionPayload): string {
  return encodeURIComponent(JSON.stringify({ sid: payload.sid, email: payload.email }));
}

export function rentGuestSessionCookieOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: RENT_GUEST_SESSION_MAX_AGE_SECONDS,
  };
}

export { normalizeEmail as normalizeRentGuestEmail };
