/**
 * JWT access token’dan exp (epoch saniye). Sunucu route’larında kullanılır.
 * exp > 1e12 ise ms kabul edilip saniyeye çevrilir.
 */
export function getExpFromAccessToken(token?: string | null): number | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
    const json = Buffer.from(b64 + pad, "base64").toString("utf8");
    const payload = JSON.parse(json) as { exp?: number };
    if (typeof payload.exp !== "number") return null;
    return payload.exp > 1e12 ? Math.floor(payload.exp / 1000) : payload.exp;
  } catch {
    return null;
  }
}
