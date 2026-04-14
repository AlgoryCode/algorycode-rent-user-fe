import { RENT_FE_ROLES_COOKIE } from "@/lib/rbac/role-cookie";
import type { RentAppRole } from "@/lib/rbac/rent-roles";
import { parseRentRoleList } from "@/lib/rbac/rent-roles";

function readCookieRaw(name: string, cookieHeader: string): string | null {
  const parts = cookieHeader.split(";").map((p) => p.trim());
  const prefix = `${name}=`;
  for (const p of parts) {
    if (p.startsWith(prefix)) return decodeURIComponent(p.slice(prefix.length));
  }
  return null;
}

/** İstemci: `document.cookie` üzerinden rol listesi (menü gösterimi). */
export function readRentFeRolesFromDocumentCookie(): RentAppRole[] {
  if (typeof document === "undefined") return [];
  return parseRentRoleList(readCookieRaw(RENT_FE_ROLES_COOKIE, document.cookie) ?? "");
}

/** Sunucu / middleware isteği: `Cookie` başlığı. */
export function readRentFeRolesFromCookieHeader(cookieHeader: string | null | undefined): RentAppRole[] {
  if (!cookieHeader?.trim()) return [];
  return parseRentRoleList(readCookieRaw(RENT_FE_ROLES_COOKIE, cookieHeader) ?? "");
}
