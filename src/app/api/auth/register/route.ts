import { NextResponse } from "next/server";

import { getAuthUpstreamUrl } from "@/lib/auth-upstream";
import { parseAuthServiceError } from "@/lib/authError";

type RegisterBody = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  password?: string;
  registrationRole?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RegisterBody;
    const upstream = await fetch(`${getAuthUpstreamUrl()}/basicauth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const raw = await upstream.text();
    if (!upstream.ok) {
      let message = raw || `Kayıt hatası (${upstream.status})`;
      try {
        const parsed = JSON.parse(raw) as unknown;
        message = parseAuthServiceError(parsed) || message;
      } catch {
        /* plain text */
      }
      return NextResponse.json({ message }, { status: upstream.status || 400 });
    }

    return NextResponse.json({ ok: true, message: raw || "Kayıt tamam" }, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Sunucu hatası" }, { status: 500 });
  }
}
