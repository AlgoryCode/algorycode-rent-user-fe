import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/** Tarayıcı → gateway istekleri için: httpOnly access JWT (aynı origin). */
export async function GET() {
  const store = await cookies();
  const accessToken =
    store.get("algory_access_token")?.value?.trim() || store.get("accessToken")?.value?.trim() || null;
  return NextResponse.json({ accessToken: accessToken || null }, { status: 200 });
}
