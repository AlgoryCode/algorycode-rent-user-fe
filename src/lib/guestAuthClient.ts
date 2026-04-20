import { clearBffBearerCache } from "@/lib/bff-access-token";
import { getPanelSameOriginAxios } from "@/lib/panel-same-origin-axios";

/** Araç sayfası misafir kapısı → `/rezervasyon` geçişinde sihirbazın aynı soruyu ardışık sormaması için URL işareti. */
export const RENT_RESERVATION_GUEST_ACK_QUERY = "guestAck";

/** Misafir e-posta ön dolumu (tek seferlik; URL strip edilir). */
export const RENT_GUEST_PREFILL_EMAIL_QUERY = "guestEmail";

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export type EmailCheckResult = { exists: boolean; failOpen?: boolean };

export async function checkEmailRegisteredOnBff(email: string): Promise<EmailCheckResult> {
  const { status, data: j } = await getPanelSameOriginAxios().post<{
    exists?: boolean;
    message?: string;
    failOpen?: boolean;
  }>(
    "/api/auth/check-email",
    { email: email.trim() },
    { validateStatus: () => true },
  );
  if (status < 200 || status >= 300) {
    throw new Error(typeof j?.message === "string" ? j.message : "E-posta kontrolü başarısız.");
  }
  return { exists: Boolean(j?.exists), failOpen: Boolean(j?.failOpen) };
}

/** Misafir JWT yok; httpOnly `rent_guest_session` çerezi ({@code sid}, {@code email}). */
export async function startRentGuestSessionOnBff(email: string): Promise<void> {
  const trimmed = email.trim();
  if (!isEmail(trimmed)) {
    throw new Error("Geçerli bir e-posta girin.");
  }
  const { status, data: j } = await getPanelSameOriginAxios().post<{ message?: string }>(
    "/api/rent/guest/session",
    { email: trimmed },
    { validateStatus: () => true },
  );
  if (status < 200 || status >= 300) {
    throw new Error(typeof j?.message === "string" ? j.message : "Misafir oturumu açılamadı.");
  }
  clearBffBearerCache();
}
