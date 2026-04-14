import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getExpFromAccessToken } from "@/lib/auth-user";
import { COOKIE_MAX_AGE_SECONDS, getAuthUpstreamUrl } from "@/lib/auth-upstream";
import { applyRentFeRolesCookie, clearRentFeRolesCookie } from "@/lib/rbac/role-cookie";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const refreshToken =
      cookieStore.get("algory_refresh_token")?.value || cookieStore.get("refreshToken")?.value || null;

    if (!refreshToken?.trim()) {
      const res = NextResponse.json({ message: "Refresh token yok" }, { status: 401 });
      const clearOpts = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        path: "/",
        maxAge: 0,
      };
      res.cookies.set("algory_access_token", "", clearOpts);
      res.cookies.set("algory_refresh_token", "", clearOpts);
      res.cookies.set("accessToken", "", clearOpts);
      res.cookies.set("refreshToken", "", clearOpts);
      clearRentFeRolesCookie(res);
      return res;
    }

    const upstream = await fetch(`${getAuthUpstreamUrl()}/basicauth/refreshToken`, {
      method: "POST",
      headers: { Cookie: `refreshToken=${refreshToken.trim()}` },
      cache: "no-store",
    });

    const raw = await upstream.text();
    let data: {
      message?: string;
      accessToken?: string;
      refreshToken?: string;
      access_token?: string;
      refresh_token?: string;
    } = {};
    try {
      data = raw ? (JSON.parse(raw) as typeof data) : {};
    } catch {
      data = { message: raw || "Beklenmeyen yanıt" };
    }

    if (!upstream.ok) {
      const status = upstream.status || 401;
      const response = NextResponse.json(
        { message: typeof data?.message === "string" ? data.message : "Token yenilenemedi" },
        { status },
      );
      if (status === 401) {
        const clearCookieOptions = {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax" as const,
          path: "/",
          maxAge: 0,
        };
        response.cookies.set("algory_access_token", "", clearCookieOptions);
        response.cookies.set("algory_refresh_token", "", clearCookieOptions);
        response.cookies.set("accessToken", "", clearCookieOptions);
        response.cookies.set("refreshToken", "", clearCookieOptions);
        clearRentFeRolesCookie(response);
      }
      return response;
    }

    const accessToken = data?.accessToken ?? data?.access_token;
    const newRefresh = data?.refreshToken ?? data?.refresh_token;
    const accessTokenExpiresAt = getExpFromAccessToken(typeof accessToken === "string" ? accessToken : undefined);

    const response = NextResponse.json({ ...data, accessTokenExpiresAt }, { status: 200 });

    const cookieOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: COOKIE_MAX_AGE_SECONDS,
    };
    if (accessToken) {
      response.cookies.set("algory_access_token", accessToken, cookieOpts);
      response.cookies.set("accessToken", accessToken, cookieOpts);
    }
    if (newRefresh) {
      response.cookies.set("algory_refresh_token", newRefresh, cookieOpts);
      response.cookies.set("refreshToken", newRefresh, cookieOpts);
    }
    if (accessToken) {
      applyRentFeRolesCookie(response, accessToken, data as Record<string, unknown>);
    }
    return response;
  } catch {
    return NextResponse.json({ message: "Sunucu hatası" }, { status: 500 });
  }
}
