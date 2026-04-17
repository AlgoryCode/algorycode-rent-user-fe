import { clearBffBearerCache } from "@/lib/bff-access-token";

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export type EmailCheckResult = { exists: boolean; failOpen?: boolean };

export async function checkEmailRegisteredOnBff(email: string): Promise<EmailCheckResult> {
  const r = await fetch("/api/auth/check-email", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ email: email.trim() }),
  });
  const j = (await r.json().catch(() => ({}))) as {
    exists?: boolean;
    message?: string;
    failOpen?: boolean;
  };
  if (!r.ok) {
    throw new Error(typeof j.message === "string" ? j.message : "E-posta kontrolü başarısız.");
  }
  return { exists: Boolean(j.exists), failOpen: Boolean(j.failOpen) };
}

export async function startGuestSessionOnBff(email: string): Promise<void> {
  const trimmed = email.trim();
  if (!isEmail(trimmed)) {
    throw new Error("Geçerli bir e-posta girin.");
  }
  const r = await fetch("/api/auth/guest/access-token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ email: trimmed }),
  });
  const j = (await r.json().catch(() => ({}))) as { message?: string };
  if (!r.ok) {
    throw new Error(typeof j.message === "string" ? j.message : "Misafir oturumu açılamadı.");
  }
  clearBffBearerCache();
}
