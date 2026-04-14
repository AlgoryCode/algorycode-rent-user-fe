/**
 * Rent uygulamasında kullanılan panel rolleri (AuthService enum adlarıyla uyumlu).
 * Diğer domain rolleri (QR_*) burada listelenmez; JWT’den gelse bile yönlendirme için yok sayılır.
 */
export const RENT_APP_ROLES = ["RENT_USER", "RENT_MANAGER", "RENT_ADMIN"] as const;

export type RentAppRole = (typeof RENT_APP_ROLES)[number];

const RENT_ROLE_SET = new Set<string>(RENT_APP_ROLES);

export function isRentAppRole(value: string): value is RentAppRole {
  return RENT_ROLE_SET.has(value);
}

/** Virgül/boşluk ayrımlı veya tek değer. */
function stripRolePrefix(value: string): string {
  const v = value.trim();
  if (v.startsWith("ROLE_")) return v.slice("ROLE_".length);
  return v;
}

export function parseRentRoleList(raw: string | null | undefined): RentAppRole[] {
  if (raw == null || !String(raw).trim()) return [];
  const parts = String(raw)
    .split(/[,\s]+/)
    .map((s) => stripRolePrefix(s))
    .filter(Boolean);
  const out: RentAppRole[] = [];
  const seen = new Set<RentAppRole>();
  for (const p of parts) {
    if (!isRentAppRole(p)) continue;
    if (seen.has(p)) continue;
    seen.add(p);
    out.push(p);
  }
  return out;
}

/** Ödemeler / kullanıcılar gibi yönetici sayfaları. */
export function hasRentManagerAccess(roles: readonly RentAppRole[]): boolean {
  return roles.some((r) => r === "RENT_MANAGER" || r === "RENT_ADMIN");
}
