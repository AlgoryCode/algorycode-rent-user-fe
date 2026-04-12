/** wa.me için ülke kodu dahil, + olmadan rakamlar */
export const SITE_SUPPORT_PHONE_WA = "902120000000";

export const SITE_SUPPORT_PHONE_TEL = "tel:+902120000000";

export const SITE_SUPPORT_PHONE_DISPLAY = "+90 (212) 000 00 00";

const defaultWhatsAppText = "Merhaba, rezervasyon hakkında bilgi almak istiyorum.";

export const SITE_SUPPORT_WHATSAPP_URL = `https://wa.me/${SITE_SUPPORT_PHONE_WA}?text=${encodeURIComponent(defaultWhatsAppText)}`;
