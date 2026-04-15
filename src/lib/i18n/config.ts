export const LOCALE_STORAGE_KEY = "rent-locale";

export const LOCALES = ["tr", "en", "sq"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "tr";

/** Üst bar dil göstergesi (para birimi ayrı seçilir) */
export const LOCALE_FLAG: Record<Locale, string> = {
  tr: "🇹🇷",
  en: "🇬🇧",
  sq: "🇦🇱",
};

export type CurrencyCode = "TRY" | "USD" | "EUR" | "GBP" | "CHF" | "SAR";

export const CURRENCIES: readonly CurrencyCode[] = ["TRY", "USD", "EUR", "GBP", "CHF", "SAR"];

export const DEFAULT_CURRENCY: CurrencyCode = "TRY";

export const CURRENCY_STORAGE_KEY = "rent-currency";

export function isCurrency(value: string): value is CurrencyCode {
  return (CURRENCIES as readonly string[]).includes(value);
}

/**
 * Filo fiyatları TRY cinsinden; gösterim için gösterge kur (yaklaşık, bilgilendirme).
 * Gerçek ödeme / API tarafı TRY üzerinden kalır.
 */
/** Gösterge kurlar (TRY bazlı, bilgilendirme). */
export function fromTryAmount(amountTry: number, currency: CurrencyCode): number {
  if (currency === "TRY") return amountTry;
  const perUnitTry: Record<Exclude<CurrencyCode, "TRY">, number> = {
    USD: 33.5,
    EUR: 36.2,
    GBP: 43,
    CHF: 38,
    SAR: 8.9,
  };
  return amountTry / perUnitTry[currency];
}

/** Dil seçicide arama: kod, yerel ad, anahtar kelimeler (küçük harf). */
export const LOCALE_QUERY_TEXT: Record<Locale, string> = {
  tr: "tr tur turkce turkish turkiye turkey türkçe",
  en: "en english ingilizce britain uk united states us american",
  sq: "sq shqip albanian albania shqiperi",
};

/** Para seçicide arama + listede kısa açıklama (İngilizce nötr etiket). */
export const CURRENCY_QUERY_TEXT: Record<
  CurrencyCode,
  { short: string; name: string; q: string }
> = {
  TRY: { short: "TRY", name: "Turkish lira", q: "try tl turk lira turkiye turkey" },
  USD: { short: "USD", name: "US dollar", q: "usd dollar us america dolar" },
  EUR: { short: "EUR", name: "Euro", q: "eur euro avro europe ab" },
  GBP: { short: "GBP", name: "British pound", q: "gbp pound sterling ingiltere uk british" },
  CHF: { short: "CHF", name: "Swiss franc", q: "chf franc isviçre swiss switzerland" },
  SAR: { short: "SAR", name: "Saudi riyal", q: "sar riyal suudi arabia saudi" },
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}
