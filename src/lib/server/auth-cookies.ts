import { NextResponse } from "next/server";

import {
  COOKIE_MAX_AGE_SECONDS,
  TWO_FACTOR_PENDING_COOKIE_MAX_AGE_SECONDS,
} from "@/lib/auth-upstream";
import { clearRentFeRolesCookie } from "@/lib/rbac/role-cookie";
import { RENT_GUEST_SESSION_COOKIE } from "@/lib/server/rentGuestSessionCookie";

const baseOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

const cookieOptions = { ...baseOptions, maxAge: COOKIE_MAX_AGE_SECONDS };

export function clearLegacyAlgoryAuthCookies(response: NextResponse) {
  const clear = { ...cookieOptions, maxAge: 0 };
  response.cookies.set("algory_access_token", "", clear);
  response.cookies.set("algory_refresh_token", "", clear);
}

export function setAuthCookies(response: NextResponse, accessToken?: string, refreshToken?: string) {
  if (accessToken) {
    response.cookies.set("accessToken", accessToken, cookieOptions);
  }
  if (refreshToken) {
    response.cookies.set("refreshToken", refreshToken, cookieOptions);
  }
  clearLegacyAlgoryAuthCookies(response);
}

export function setTwoFactorPendingCookie(response: NextResponse, token: string) {
  response.cookies.set("algory_2fa_pending", token, {
    ...baseOptions,
    maxAge: TWO_FACTOR_PENDING_COOKIE_MAX_AGE_SECONDS,
  });
}

export function clearAuthCookies(response: NextResponse) {
  const clearOptions = { ...cookieOptions, maxAge: 0 };
  response.cookies.set("accessToken", "", clearOptions);
  response.cookies.set("refreshToken", "", clearOptions);
  clearLegacyAlgoryAuthCookies(response);
  response.cookies.set("algory_2fa_pending", "", { ...baseOptions, maxAge: 0 });
  clearRentFeRolesCookie(response);
  response.cookies.set(RENT_GUEST_SESSION_COOKIE, "", clearOptions);
}
