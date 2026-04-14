import { NextResponse } from "next/server";

import { getExpFromAccessToken } from "@/lib/auth-user";
import {
  COOKIE_MAX_AGE_SECONDS,
  TWO_FACTOR_PENDING_COOKIE_MAX_AGE_SECONDS,
  getAuthUpstreamUrl,
} from "@/lib/auth-upstream";
import { applyRentFeRolesCookie } from "@/lib/rbac/role-cookie";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const token = rawBody.startsWith("{")
      ? ((JSON.parse(rawBody) as { idToken?: string })?.idToken ?? "")
      : rawBody;

    const upstream = await fetch(`${getAuthUpstreamUrl()}/google-auth/login`, {
      method: "POST",
      headers: { "Content-Type": "text/plain", Accept: "application/json" },
      body: token,
      cache: "no-store",
    });

    const text = await upstream.text();
    let data: Record<string, unknown> = {};
    try {
      data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch {
      data = { message: text || "Beklenmeyen yanıt" };
    }

    if (!upstream.ok) {
      return NextResponse.json(
        { message: typeof data.message === "string" ? data.message : "Google ile giriş başarısız" },
        { status: upstream.status || 401 },
      );
    }

    if (data.requiresTwoFactor === true && data.twoFactorToken) {
      const response = NextResponse.json(
        {
          requiresTwoFactor: true,
          userId: data.userId,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
        },
        { status: 200 },
      );
      const pendingOpts = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        path: "/",
        maxAge: TWO_FACTOR_PENDING_COOKIE_MAX_AGE_SECONDS,
      };
      response.cookies.set("algory_2fa_pending", String(data.twoFactorToken), pendingOpts);
      return response;
    }

    const accessToken = (data.accessToken as string) || (data.access_token as string);
    const refreshToken = (data.refreshToken as string) || (data.refresh_token as string);
    const accessTokenExpiresAt = getExpFromAccessToken(accessToken);

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
    if (refreshToken) {
      response.cookies.set("algory_refresh_token", refreshToken, cookieOpts);
      response.cookies.set("refreshToken", refreshToken, cookieOpts);
    }
    if (accessToken) {
      applyRentFeRolesCookie(response, accessToken, data as Record<string, unknown>);
    }
    return response;
  } catch {
    return NextResponse.json({ message: "Sunucu hatası" }, { status: 500 });
  }
}
