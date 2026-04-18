import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { accessTokenIsGuestJwt } from "@/lib/auth-user";

/** Tarayıcı → gateway istekleri için: httpOnly access JWT (aynı origin). */
export async function GET() {
  const store = await cookies();
  const accessToken =
    store.get("algory_access_token")?.value?.trim() || store.get("accessToken")?.value?.trim() || null;
  const isGuest = accessTokenIsGuestJwt(accessToken);
  return NextResponse.json({ accessToken: accessToken || null, isGuest }, { status: 200 });
}
