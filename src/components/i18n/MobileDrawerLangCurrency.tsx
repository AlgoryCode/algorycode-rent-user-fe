"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/components/i18n/LocaleProvider";
import {
  CURRENCIES,
  CURRENCY_QUERY_TEXT,
  LOCALE_FLAG,
  LOCALE_QUERY_TEXT,
  LOCALES,
  type CurrencyCode,
  type Locale,
} from "@/lib/i18n/config";

const LOCALE_LABELS: Record<Locale, string> = {
  tr: "Türkçe",
  en: "English",
  sq: "Shqip",
};

function tokenMatch(haystack: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const h = haystack.toLowerCase();
  return q
    .split(/\s+/)
    .filter(Boolean)
    .every((tok) => h.includes(tok));
}

const inputNavy =
  "w-full rounded-md border border-white/20 bg-black/20 px-2.5 py-2 text-[13px] text-white outline-none placeholder:text-white/40 focus:border-white/40 focus:ring-1 focus:ring-white/30";

const sectionLabel = "text-[10px] font-bold uppercase tracking-widest text-white/50";

const rowLang = (active: boolean) =>
  active
    ? "bg-white/10 font-semibold text-steel"
    : "text-white/85 hover:bg-white/10";

const rowCur = (active: boolean) =>
  active
    ? "bg-white/10 font-semibold text-steel"
    : "text-white/85 hover:bg-white/10";

/** Mobil yan menü: dil ve para birimi satır listesi (açılır panel yok). */
export function MobileDrawerLangCurrency() {
  const { locale, setLocale, currency, setCurrency, t } = useI18n();
  const [langQuery, setLangQuery] = useState("");
  const [curQuery, setCurQuery] = useState("");

  const filteredLocales = useMemo(() => {
    return LOCALES.filter((code) => {
      const hay = `${code} ${LOCALE_LABELS[code]} ${LOCALE_QUERY_TEXT[code]}`;
      return tokenMatch(hay, langQuery);
    });
  }, [langQuery]);

  const filteredCurrencies = useMemo(() => {
    return CURRENCIES.filter((code) => {
      const meta = CURRENCY_QUERY_TEXT[code];
      const hay = `${meta.short} ${meta.name} ${meta.q}`;
      return tokenMatch(hay, curQuery);
    });
  }, [curQuery]);

  return (
    <div className="border-t border-white/10">
      <div className="px-3 py-3">
        <p className={sectionLabel}>{t("lang.sectionLanguage")}</p>
        <input
          type="search"
          value={langQuery}
          onChange={(e) => setLangQuery(e.target.value)}
          placeholder={t("lang.searchLanguage")}
          className={`mt-2 ${inputNavy}`}
          aria-label={t("lang.searchLanguage")}
        />
        <ul className="mt-2 space-y-0.5" role="listbox" aria-label={t("lang.sectionLanguage")}>
          {filteredLocales.length === 0 ? (
            <li className="px-1 py-3 text-center text-xs text-white/45">{t("lang.noResults")}</li>
          ) : (
            filteredLocales.map((code) => (
              <li key={code} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={locale === code}
                  onClick={() => setLocale(code)}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-[15px] transition-colors ${rowLang(locale === code)}`}
                >
                  <span className="text-lg leading-none" aria-hidden>
                    {LOCALE_FLAG[code]}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">{LOCALE_LABELS[code]}</span>
                  <span className="w-5 shrink-0 text-center text-xs opacity-80">
                    {locale === code ? "✓" : ""}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="border-t border-white/10 px-3 py-3">
        <p className={sectionLabel}>{t("lang.sectionCurrency")}</p>
        <input
          type="search"
          value={curQuery}
          onChange={(e) => setCurQuery(e.target.value)}
          placeholder={t("lang.searchCurrency")}
          className={`mt-2 ${inputNavy}`}
          aria-label={t("lang.searchCurrency")}
        />
        <ul className="mt-2 space-y-0.5" role="listbox" aria-label={t("lang.sectionCurrency")}>
          {filteredCurrencies.length === 0 ? (
            <li className="px-1 py-3 text-center text-xs text-white/45">{t("lang.noResults")}</li>
          ) : (
            filteredCurrencies.map((code) => {
              const meta = CURRENCY_QUERY_TEXT[code];
              return (
                <li key={code} role="none">
                  <button
                    type="button"
                    role="option"
                    aria-selected={currency === code}
                    onClick={() => setCurrency(code)}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition-colors ${rowCur(currency === code)}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold tabular-nums tracking-wide">{meta.short}</p>
                      <p className="truncate text-xs leading-snug text-white/50">{meta.name}</p>
                    </div>
                    <span className="w-5 shrink-0 text-center text-xs opacity-80">
                      {currency === code ? "✓" : ""}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
