import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { decodeJwtPayloadJson, extractRentRolesFromJwtPayload } from "@/lib/rbac/jwt-rent-roles";
import { hasRentManagerAccess } from "@/lib/rbac/rent-roles";
import { requiresRentManagerForPath } from "@/lib/rbac/route-policy";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!requiresRentManagerForPath(pathname)) {
    return NextResponse.next();
  }

  const token =
    request.cookies.get("accessToken")?.value?.trim() ||
    request.cookies.get("algory_access_token")?.value?.trim() ||
    "";

  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/giris-yap";
    url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  const payload = decodeJwtPayloadJson(token);
  const roles = payload ? extractRentRolesFromJwtPayload(payload) : [];
  if (!hasRentManagerAccess(roles)) {
    const url = request.nextUrl.clone();
    url.pathname = "/hesabim";
    url.searchParams.set("yetkisiz", "1");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

/**
 * `RENT_ROUTE_RULES` içindeki `rent_manager` önekleriyle aynı kalmalı (Turbopack statik matcher ister).
 * Yeni korumalı rota: buraya + `route-policy.ts` içine ekleyin.
 */
export const config = {
  matcher: ["/odemeler", "/odemeler/:path*", "/kullanicilar", "/kullanicilar/:path*"],
};
