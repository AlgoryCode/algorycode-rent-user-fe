import { NextResponse } from "next/server";

import {
  getAuthUpstreamEmailCheckMethod,
  getAuthUpstreamEmailCheckPath,
  getAuthUpstreamUrl,
} from "@/lib/auth-upstream";

export const dynamic = "force-dynamic";

type Body = { email?: string };

/** Gateway/AuthService yokken sadece FE denemek için: `AUTH_EMAIL_CHECK_OFFLINE=true` */
function isEmailCheckOffline(): boolean {
  const v = process.env.AUTH_EMAIL_CHECK_OFFLINE?.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

/**
 * Upstream 404/5xx iken `exists: false` + `failOpen` (misafir akışı kırılmasın).
 * - production: yalnızca `AUTH_EMAIL_CHECK_FAIL_OPEN=true`
 * - development: varsayılan açık; kapatmak için `AUTH_EMAIL_CHECK_FAIL_OPEN=false`
 */
function isEmailCheckFailOpen(): boolean {
  const v = process.env.AUTH_EMAIL_CHECK_FAIL_OPEN?.trim().toLowerCase();
  if (v === "false" || v === "0" || v === "no") return false;
  if (v === "true" || v === "1" || v === "yes") return true;
  return process.env.NODE_ENV === "development";
}

function extractUpstreamDetail(data: Record<string, unknown>): string | null {
  if (typeof data.message === "string" && data.message.trim()) return data.message.trim();
  if (typeof data.error === "string" && data.error.trim()) return data.error.trim();
  if (typeof data.detail === "string" && data.detail.trim()) return data.detail.trim();
  const errs = data.errors;
  if (Array.isArray(errs) && errs[0] != null && typeof errs[0] === "object") {
    const d = (errs[0] as Record<string, unknown>).defaultMessage;
    if (typeof d === "string" && d.trim()) return d.trim();
  }
  return null;
}

function normalizeEmail(raw: string): string | null {
  const e = raw.trim().toLowerCase();
  if (e.length < 3 || e.length > 320) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return null;
  return e;
}

function parseExists(data: Record<string, unknown>): boolean {
  if (typeof data.exists === "boolean") return data.exists;
  if (typeof data.registered === "boolean") return data.registered;
  if (typeof data.isRegistered === "boolean") return data.isRegistered;
  if (typeof data.emailExists === "boolean") return data.emailExists;
  const nested = data.data;
  if (nested && typeof nested === "object") {
    const o = nested as Record<string, unknown>;
    if (typeof o.exists === "boolean") return o.exists;
    if (typeof o.registered === "boolean") return o.registered;
  }
  return false;
}

function upstreamErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    const c = "cause" in err && err.cause instanceof Error ? err.cause.message : "";
    return [err.message, c].filter(Boolean).join(" — ");
  }
  return String(err);
}

/** E-posta sistemde kayıtlı mı? (AuthService — path `AUTH_UPSTREAM_EMAIL_CHECK_PATH` ile override.) */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const email = typeof body.email === "string" ? normalizeEmail(body.email) : null;
    if (!email) {
      return NextResponse.json({ message: "Geçerli bir e-posta girin." }, { status: 400 });
    }

    if (isEmailCheckOffline()) {
      return NextResponse.json({ exists: false, offline: true }, { status: 200 });
    }

    const base = getAuthUpstreamUrl();
    const path = getAuthUpstreamEmailCheckPath();
    const method = getAuthUpstreamEmailCheckMethod();
    const url =
      method === "GET"
        ? `${base}${path}?${new URLSearchParams({ email }).toString()}`
        : `${base}${path}`;

    let upstream: Response;
    try {
      upstream = await fetch(url, {
        method,
        headers:
          method === "GET"
            ? { Accept: "application/json" }
            : { "Content-Type": "application/json", Accept: "application/json" },
        body: method === "GET" ? undefined : JSON.stringify({ email }),
        cache: "no-store",
      });
    } catch (err) {
      console.error("[api/auth/check-email] upstream fetch failed:", url, err);
      return NextResponse.json(
        {
          message: `Kimlik servisine ulaşılamadı (${upstreamErrorMessage(err)}). Gateway veya AUTH_UPSTREAM adresini kontrol edin; geçici olarak AUTH_EMAIL_CHECK_OFFLINE=true ile kayıt kontrolünü atlayabilirsiniz.`,
        },
        { status: 503 },
      );
    }

    const rawText = await upstream.text();
    let data: Record<string, unknown> = {};
    try {
      data = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : {};
    } catch {
      data = { message: rawText || "Beklenmeyen yanıt" };
    }

    if (!upstream.ok) {
      const extracted = extractUpstreamDetail(data);
      const msg = extracted ?? `E-posta kontrolü başarısız (${upstream.status})`;
      const st = Number.isFinite(upstream.status) && upstream.status >= 400 ? upstream.status : 502;

      const canFailOpen =
        isEmailCheckFailOpen() && (upstream.status === 404 || upstream.status >= 500);
      if (canFailOpen) {
        console.warn("[api/auth/check-email] fail-open (upstream error):", upstream.status, url, msg);
        return NextResponse.json({ exists: false, failOpen: true }, { status: 200 });
      }

      return NextResponse.json(
        {
          message: `${msg} (${url})`,
        },
        { status: st },
      );
    }

    return NextResponse.json({ exists: parseExists(data) }, { status: 200 });
  } catch (err) {
    console.error("[api/auth/check-email]", err);
    return NextResponse.json(
      {
        message: `Sunucu hatası: ${upstreamErrorMessage(err)}`,
      },
      { status: 500 },
    );
  }
}
