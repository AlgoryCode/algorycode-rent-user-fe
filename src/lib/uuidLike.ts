/**
 * Kiralama / handover tarafında gelen UUID’ler (v1–v7, nil UUID vb.).
 * Eski sıkı RFC varyant kontrolü (yalnızca v1–v5) v6/v7 ile reddediyordu → rezervasyon sayfası gate’i yanlışlıkla `/araclar`’a düşüyordu.
 */
export const UUID_LIKE_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isLikelyUuidString(s: string): boolean {
  return UUID_LIKE_RE.test(s.trim());
}
