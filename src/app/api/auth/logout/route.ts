import axios from "axios";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getAuthUpstreamUrl } from "@/lib/auth-upstream";
import { clearAuthCookies } from "@/lib/server/auth-cookies";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const refreshToken =
      cookieStore.get("refreshToken")?.value?.trim() ||
      cookieStore.get("algory_refresh_token")?.value?.trim() ||
      null;
    if (refreshToken) {
      await axios
        .post(`${getAuthUpstreamUrl()}/basicauth/logout`, { refreshToken }, {
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          validateStatus: () => true,
          timeout: 15_000,
        })
        .catch(() => undefined);
    }
  } catch {
    /* best-effort */
  }

  const response = NextResponse.json({ ok: true }, { status: 200 });
  clearAuthCookies(response);
  return response;
}
