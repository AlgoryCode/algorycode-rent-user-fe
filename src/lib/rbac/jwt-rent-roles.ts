import type { RentAppRole } from "@/lib/rbac/rent-roles";
import { isRentAppRole } from "@/lib/rbac/rent-roles";

/**
 * Edge / tarayıcı uyumlu JWT payload okuma (imza doğrulaması yok — yalnızca claim çıkarma).
 */
export function decodeJwtPayloadJson(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
    const json = atob(b64 + pad);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function stripRolePrefix(value: string): string {
  const v = value.trim();
  if (v.startsWith("ROLE_")) return v.slice("ROLE_".length);
  return v;
}

function collectStrings(value: unknown, out: string[]) {
  if (typeof value === "string" && value.trim()) {
    out.push(stripRolePrefix(value));
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "string") out.push(stripRolePrefix(item));
    }
  }
}

/**
 * JWT içinden Rent panel rollerini çıkarır (farklı auth sağlayıcı claim düzenlerine toleranslı).
 */
export function extractRentRolesFromJwtPayload(payload: Record<string, unknown>): RentAppRole[] {
  const raw: string[] = [];

  collectStrings(payload.roles, raw);
  collectStrings(payload.role, raw);
  collectStrings(payload.authorities, raw);
  collectStrings(payload.scope, raw);
  if (typeof payload.scope === "string") {
    raw.push(...payload.scope.split(/\s+/).map(stripRolePrefix));
  }

  const realm = payload.realm_access;
  if (realm != null && typeof realm === "object" && "roles" in realm) {
    collectStrings((realm as { roles?: unknown }).roles, raw);
  }

  const resourceAccess = payload.resource_access;
  if (resourceAccess != null && typeof resourceAccess === "object") {
    for (const v of Object.values(resourceAccess)) {
      if (v != null && typeof v === "object" && "roles" in v) {
        collectStrings((v as { roles?: unknown }).roles, raw);
      }
    }
  }

  const seen = new Set<RentAppRole>();
  const roles: RentAppRole[] = [];
  for (const r of raw) {
    if (!isRentAppRole(r)) continue;
    if (seen.has(r)) continue;
    seen.add(r);
    roles.push(r);
  }
  return roles;
}
