import axios from "axios";
import { NextResponse } from "next/server";

import { getExpFromAccessToken } from "@/lib/auth-user";
import { getAuthUpstreamUrl } from "@/lib/auth-upstream";
import { applyRentFeRolesCookie } from "@/lib/rbac/role-cookie";
import { setAuthCookies, setTwoFactorPendingCookie } from "@/lib/server/auth-cookies";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const token = rawBody.startsWith("{")
      ? ((JSON.parse(rawBody) as { idToken?: string })?.idToken ?? "")
      : rawBody;

    const upstream = await axios.post<Record<string, unknown>>(
      `${getAuthUpstreamUrl()}/google-auth/login`,
      token,
      {
        headers: { "Content-Type": "text/plain", Accept: "application/json" },
        validateStatus: () => true,
        timeout: 20_000,
      },
    );

    const data =
      typeof upstream.data === "object" && upstream.data != null
        ? (upstream.data as Record<string, unknown>)
        : {};

    if (upstream.status < 200 || upstream.status >= 300) {
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
      setTwoFactorPendingCookie(response, String(data.twoFactorToken));
      return response;
    }

    const accessToken = (data.accessToken as string) || (data.access_token as string);
    const refreshToken = (data.refreshToken as string) || (data.refresh_token as string);
    const accessTokenExpiresAt = getExpFromAccessToken(accessToken);

    const response = NextResponse.json({ ...data, accessTokenExpiresAt }, { status: 200 });

    if (accessToken || refreshToken) {
      setAuthCookies(
        response,
        typeof accessToken === "string" ? accessToken : undefined,
        typeof refreshToken === "string" ? refreshToken : undefined,
      );
    }
    if (accessToken) {
      applyRentFeRolesCookie(response, accessToken, data);
    }
    return response;
  } catch {
    return NextResponse.json({ message: "Sunucu hatası" }, { status: 500 });
  }
}
