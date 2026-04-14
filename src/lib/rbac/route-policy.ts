import type { RentAppRole } from "@/lib/rbac/rent-roles";
import { hasRentManagerAccess } from "@/lib/rbac/rent-roles";

/**
 * Rota erişim kuralı: pathname prefix eşleşmesi (en uzun eşleşme kazanır).
 * Yeni korumalı sayfa eklerken yalnızca bu listeyi güncellemeniz yeterli.
 */
export type RentRouteAccess = "public" | "rent_manager";

export type RentRouteRule = {
  /** Örn. "/odemeler" — alt yollar da kapsanır */
  pathPrefix: string;
  access: RentRouteAccess;
  /** Panel menüsünde gösterilsin mi (yönetici linkleri tek kaynak) */
  showInManagerNav?: boolean;
  navLabel?: string;
};

function normalizePath(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  return pathname.endsWith("/") && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
}

export const RENT_ROUTE_RULES: RentRouteRule[] = [
  {
    pathPrefix: "/odemeler",
    access: "rent_manager",
    showInManagerNav: true,
    navLabel: "Ödemeler",
  },
  {
    pathPrefix: "/kullanicilar",
    access: "rent_manager",
    showInManagerNav: true,
    navLabel: "Kullanıcılar",
  },
];

/** Middleware `matcher` için — `RENT_ROUTE_RULES` ile tek kaynak. */
export const RENT_MANAGER_PATH_PREFIXES: string[] = RENT_ROUTE_RULES.filter((r) => r.access === "rent_manager").map(
  (r) => normalizePath(r.pathPrefix),
);

/** En spesifik (en uzun prefix) kuralı döndürür; yoksa public. */
export function matchRentRouteRule(pathname: string): RentRouteRule | null {
  const path = normalizePath(pathname);
  let best: RentRouteRule | null = null;
  let bestLen = -1;
  for (const rule of RENT_ROUTE_RULES) {
    const prefix = normalizePath(rule.pathPrefix);
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      if (prefix.length > bestLen) {
        best = rule;
        bestLen = prefix.length;
      }
    }
  }
  return best;
}

export function rentRouteAccessForPath(pathname: string): RentRouteAccess {
  return matchRentRouteRule(pathname)?.access ?? "public";
}

export function requiresRentManagerForPath(pathname: string): boolean {
  return rentRouteAccessForPath(pathname) === "rent_manager";
}

export function canAccessRentPath(roles: readonly RentAppRole[], pathname: string): boolean {
  const access = rentRouteAccessForPath(pathname);
  if (access === "public") return true;
  if (access === "rent_manager") return hasRentManagerAccess(roles);
  return true;
}

/** Header vb. için: yöneticiye gösterilecek nav girdileri (tek kaynak). */
export function getRentManagerNavLinks(): { href: string; label: string }[] {
  return RENT_ROUTE_RULES.filter((r) => r.showInManagerNav && r.navLabel).map((r) => ({
    href: normalizePath(r.pathPrefix),
    label: r.navLabel as string,
  }));
}
