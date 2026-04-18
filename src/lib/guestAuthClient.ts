import { clearBffBearerCache } from "@/lib/bff-access-token";

/** Araç sayfası misafir kapısı → `/rezervasyon` geçişinde sihirbazın aynı soruyu ardışık sormaması için URL işareti. */
export const RENT_RESERVATION_GUEST_ACK_QUERY = "guestAck";

/** Misafir e-posta ön dolumu (tek seferlik; URL strip edilir). */
export const RENT_GUEST_PREFILL_EMAIL_QUERY = "guestEmail";

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

/** Misafir JWT yok; httpOnly `rent_guest_session` çerezi ({@code sid}, {@code email}). */
export async function startRentGuestSessionOnBff(email: string): Promise<void> {
  const trimmed = email.trim();
  if (!isEmail(trimmed)) {
    throw new Error("Geçerli bir e-posta girin.");
  }
  const r = await fetch("/api/rent/guest/session", {
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
