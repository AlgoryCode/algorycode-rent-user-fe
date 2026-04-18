function parseAccessTokenPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
    const json = Buffer.from(b64 + pad, "base64").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Eski misafir JWT’leri ({@code guest: true}) — yeni akışta misafir JWT üretilmez. */
export function accessTokenIsGuestJwt(token: string | null | undefined): boolean {
  if (!token) return false;
  const payload = parseAccessTokenPayload(token);
  return payload?.guest === true;
}

/**
 * JWT access token’dan exp (epoch saniye). Sunucu route’larında kullanılır.
 * exp > 1e12 ise ms kabul edilip saniyeye çevrilir.
 */
export function getExpFromAccessToken(token?: string | null): number | null {
  if (!token) return null;
  const payload = parseAccessTokenPayload(token);
  if (!payload) return null;
  const exp = payload.exp;
  if (typeof exp !== "number") return null;
  return exp > 1e12 ? Math.floor(exp / 1000) : exp;
}
