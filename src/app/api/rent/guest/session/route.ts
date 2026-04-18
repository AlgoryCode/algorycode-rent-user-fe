import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";

import {
  normalizeRentGuestEmail,
  rentGuestSessionCookieOptions,
  RENT_GUEST_SESSION_COOKIE,
  serializeRentGuestSession,
} from "@/lib/server/rentGuestSessionCookie";

export const dynamic = "force-dynamic";

type Body = { email?: string };

/** Misafir: JWT yok; httpOnly çerezde `{ sid, email }`. */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const email = typeof body.email === "string" ? normalizeRentGuestEmail(body.email) : null;
    if (!email) {
      return NextResponse.json({ message: "Geçerli bir e-posta girin." }, { status: 400 });
    }
    const sid = randomUUID();
    const response = NextResponse.json({ ok: true, guestSessionId: sid });
    response.cookies.set(RENT_GUEST_SESSION_COOKIE, serializeRentGuestSession({ sid, email }), rentGuestSessionCookieOptions());
    return response;
  } catch {
    return NextResponse.json({ message: "Sunucu hatası" }, { status: 500 });
  }
}

/** Oturum var mı (istemci; çerez içeriği dönmez). */
export async function GET() {
  const store = await cookies();
  const raw = store.get(RENT_GUEST_SESSION_COOKIE)?.value;
  const ok = Boolean(raw?.trim());
  return NextResponse.json({ ok }, { status: 200 });
}
