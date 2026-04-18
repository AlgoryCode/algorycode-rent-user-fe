import { NextResponse } from "next/server";

import { buildRentGuestGatewayUrl } from "@/lib/server/rentGuestUpstream";

export const dynamic = "force-dynamic";

/** Gateway `/rent/guest/handover-locations` — JWT yok. */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const qs = url.searchParams.toString();
    const upstream = `${buildRentGuestGatewayUrl("/handover-locations")}${qs ? `?${qs}` : ""}`;
    const upstreamRes = await fetch(upstream, {
      headers: { Accept: "application/json" },
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
