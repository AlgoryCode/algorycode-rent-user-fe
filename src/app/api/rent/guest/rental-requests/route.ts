import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { buildRentGuestGatewayUrl } from "@/lib/server/rentGuestUpstream";
import { readRentGuestSessionFromCookies } from "@/lib/server/rentGuestSessionCookie";

export const dynamic = "force-dynamic";

/** Misafir çerezdeki `sid` → `userId` (UUID) olarak rent’e iletilir. */
export async function POST(req: Request) {
  try {
    const store = await cookies();
    const session = readRentGuestSessionFromCookies(store);
    if (!session) {
      return NextResponse.json({ message: "Misafir oturumu yok. E-posta ile devam edin." }, { status: 401 });
    }
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ message: "Geçersiz gövde." }, { status: 400 });
    }
    const customer = body.customer as Record<string, unknown> | undefined;
    const custEmail = typeof customer?.email === "string" ? customer.email.trim().toLowerCase() : "";
    if (custEmail && custEmail !== session.email) {
      return NextResponse.json({ message: "E-posta misafir oturumu ile eşleşmiyor." }, { status: 403 });
    }
    const merged = { ...body, userId: session.sid };
    const upstream = buildRentGuestGatewayUrl("/rental-requests");
    const upstreamRes = await fetch(upstream, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(merged),
      cache: "no-store",
    });
    const ct = upstreamRes.headers.get("content-type") || "application/json";
    const buf = await upstreamRes.arrayBuffer();
    return new NextResponse(buf, {
      status: upstreamRes.status,
      headers: { "Content-Type": ct },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ message: `Rent gateway’e ulaşılamadı: ${msg}` }, { status: 503 });
  }
}
