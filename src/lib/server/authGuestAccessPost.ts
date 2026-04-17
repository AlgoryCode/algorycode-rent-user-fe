import { NextResponse } from "next/server";

import { getExpFromAccessToken } from "@/lib/auth-user";
import { COOKIE_MAX_AGE_SECONDS, getAuthUpstreamGuestSessionPath, getAuthUpstreamUrl } from "@/lib/auth-upstream";
import { applyRentFeRolesCookie } from "@/lib/rbac/role-cookie";

type Body = { email?: string };

function normalizeEmail(raw: string): string | null {
  const e = raw.trim().toLowerCase();
  if (e.length < 3 || e.length > 320) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return null;
  return e;
}

/**
 * BFF: misafir access JWT + çerezler.
 * Route’lar: `POST /api/auth/guest/access-token` (birincil), `POST /api/auth/guest-session` (geriye dönük).
 * Upstream: `AUTH_UPSTREAM_GUEST_SESSION_PATH` veya varsayılan `/guest/access-token`.
 */
export async function postAuthGuestAccess(req: Request): Promise<Response> {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const email = typeof body.email === "string" ? normalizeEmail(body.email) : null;
    if (!email) {
      return NextResponse.json({ message: "Geçerli bir e-posta girin." }, { status: 400 });
    }

    const base = getAuthUpstreamUrl();
    const path = getAuthUpstreamGuestSessionPath();
    const url = `${base}${path}`;
    let upstream: Response;
    try {
      upstream = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email }),
        cache: "no-store",
      });
    } catch (err) {
      console.error("[api/auth/guest-access] upstream fetch failed:", url, err);
      const detail = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        {
          message: `Kimlik servisine ulaşılamadı (${detail}). AUTH_UPSTREAM / gateway ve guest endpoint yolunu kontrol edin.`,
        },
        { status: 503 },
      );
    }

    const data = (await upstream.json().catch(async () => ({
      message: await upstream.text().catch(() => "Misafir oturumu açılamadı"),
    }))) as Record<string, unknown> & {
      message?: string;
      accessToken?: string;
      access_token?: string;
      refreshToken?: string;
      refresh_token?: string;
      guestSessionId?: string;
    };

    if (!upstream.ok) {
      return NextResponse.json(
        { message: typeof data?.message === "string" ? data.message : "Misafir oturumu açılamadı" },
        { status: upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502 },
      );
    }

    const accessToken = data?.accessToken ?? data?.access_token;
    const refreshToken = data?.refreshToken ?? data?.refresh_token;
    const accessTokenExpiresAt = getExpFromAccessToken(typeof accessToken === "string" ? accessToken : undefined);

    const response = NextResponse.json(
      {
        ...data,
        accessTokenExpiresAt,
        guestSessionId: typeof data.guestSessionId === "string" ? data.guestSessionId : undefined,
      },
      { status: 200 },
    );

    const cookieOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: COOKIE_MAX_AGE_SECONDS,
    };
    if (typeof accessToken === "string" && accessToken) {
      response.cookies.set("algory_access_token", accessToken, cookieOpts);
      response.cookies.set("accessToken", accessToken, cookieOpts);
    }
    const clearCookie = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 0,
    };
    if (typeof refreshToken === "string" && refreshToken) {
      response.cookies.set("algory_refresh_token", refreshToken, cookieOpts);
      response.cookies.set("refreshToken", refreshToken, cookieOpts);
    } else {
      response.cookies.set("algory_refresh_token", "", clearCookie);
      response.cookies.set("refreshToken", "", clearCookie);
    }
    if (typeof accessToken === "string" && accessToken) {
      applyRentFeRolesCookie(response, accessToken, data as Record<string, unknown>);
    }
    return response;
  } catch (err) {
    console.error("[api/auth/guest-access]", err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ message: `Sunucu hatası: ${detail}` }, { status: 500 });
  }
}
