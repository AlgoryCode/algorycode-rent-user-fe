import axios from "axios";
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
    const upstream = await axios.post<string | Record<string, unknown>>(
      `${getAuthUpstreamUrl()}/basicauth/register`,
      body,
      {
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        validateStatus: () => true,
        timeout: 20_000,
      },
    );

    if (upstream.status < 200 || upstream.status >= 300) {
      const raw =
        typeof upstream.data === "string"
          ? upstream.data
          : upstream.data != null && typeof upstream.data === "object" && "message" in upstream.data
            ? String((upstream.data as { message?: unknown }).message ?? "")
            : JSON.stringify(upstream.data ?? "");
      let message = raw || `Kayıt hatası (${upstream.status})`;
      if (typeof upstream.data === "object" && upstream.data != null) {
        message = parseAuthServiceError(upstream.data) || message;
      }
      return NextResponse.json({ message }, { status: upstream.status || 400 });
    }

    const okMessage =
      typeof upstream.data === "string" && upstream.data.trim()
        ? upstream.data.trim()
        : upstream.data != null &&
            typeof upstream.data === "object" &&
            "message" in upstream.data &&
            typeof (upstream.data as { message?: unknown }).message === "string"
          ? (upstream.data as { message: string }).message
          : "Kayıt tamam";
    return NextResponse.json({ ok: true, message: okMessage }, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Sunucu hatası" }, { status: 500 });
  }
}
