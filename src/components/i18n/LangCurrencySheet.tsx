"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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

const CURRENCY_LABEL_TR: Record<CurrencyCode, string> = {
  TRY: "Türk Lirası",
  USD: "ABD Doları",
  EUR: "Euro",
  GBP: "İngiliz Sterlini",
  CHF: "İsviçre Frangı",
  SAR: "Suudi Arabistan Riyali",
};

const CURRENCY_SYMBOL: Record<CurrencyCode, string> = {
  TRY: "₺",
  USD: "$",
  EUR: "€",
  GBP: "£",
  CHF: "Fr.",
  SAR: "﷼",
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

function currencyRowLabel(code: CurrencyCode, loc: Locale): string {
  if (loc === "tr") return CURRENCY_LABEL_TR[code];
  return CURRENCY_QUERY_TEXT[code].name;
}

const inputLight =
  "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-accent/50 focus:ring-2 focus:ring-accent/20";

const sectionLabel = "text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Açılışta mount: taslak dil/para birimi o anki i18n değerleriyle başlar (effect gerekmez). */
function LangCurrencySheetInner({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const { locale, setLocale, currency, setCurrency, t } = useI18n();
  const [draftLocale, setDraftLocale] = useState(locale);
  const [draftCurrency, setDraftCurrency] = useState(currency);
  const [langQuery, setLangQuery] = useState("");
  const [curQuery, setCurQuery] = useState("");

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpenChange]);

  const filteredLocales = useMemo(() => {
    return LOCALES.filter((code) => {
      const hay = `${code} ${LOCALE_LABELS[code]} ${LOCALE_QUERY_TEXT[code]}`;
      return tokenMatch(hay, langQuery);
    });
  }, [langQuery]);

  const filteredCurrencies = useMemo(() => {
    return CURRENCIES.filter((code) => {
      const meta = CURRENCY_QUERY_TEXT[code];
      const hay = `${meta.short} ${meta.name} ${meta.q} ${CURRENCY_LABEL_TR[code]}`;
      return tokenMatch(hay, curQuery);
    });
  }, [curQuery]);

  const save = () => {
    setLocale(draftLocale);
    setCurrency(draftCurrency);
    onOpenChange(false);
  };

  return (
    <motion.div
      key="lang-cur-overlay"
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 md:items-center md:justify-center md:p-4"
      role="presentation"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => onOpenChange(false)}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lang-currency-sheet-title"
        className="relative flex max-h-[90vh] w-full max-w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.28)] md:max-w-sm md:rounded-2xl"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="max-h-[90vh] overflow-y-auto overscroll-contain p-4 [-webkit-overflow-scrolling:touch]">
          <h2 id="lang-currency-sheet-title" className="text-lg font-semibold tracking-tight text-neutral-900">
            {t("lang.sheetTitle")}
          </h2>
          <p className="mt-1 text-sm text-neutral-500">{t("lang.sheetSubtitle")}</p>

          <div className="mt-6 flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <p className={sectionLabel}>{t("lang.sectionCurrency")}</p>
              <input
                type="search"
                value={curQuery}
                onChange={(e) => setCurQuery(e.target.value)}
                placeholder={t("lang.searchCurrency")}
                className={inputLight}
                aria-label={t("lang.searchCurrency")}
              />
              <ul
                className="max-h-[min(12rem,38vh)] space-y-1 overflow-y-auto overscroll-contain pr-0.5"
                role="listbox"
                aria-label={t("lang.sectionCurrency")}
              >
                {filteredCurrencies.length === 0 ? (
                  <li className="py-3 text-center text-sm text-neutral-400">{t("lang.noResults")}</li>
                ) : (
                  filteredCurrencies.map((code) => {
                    const meta = CURRENCY_QUERY_TEXT[code];
                    const sym = CURRENCY_SYMBOL[code];
                    const active = draftCurrency === code;
                    return (
                      <li key={code} role="none">
                        <button
                          type="button"
                          role="option"
                          aria-selected={active}
                          onClick={() => setDraftCurrency(code)}
                          className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
                            active
                              ? "border-accent/35 bg-accent/8 font-semibold text-neutral-900"
                              : "border-transparent text-neutral-800 hover:bg-neutral-50"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-[15px] font-medium leading-snug">{currencyRowLabel(code, draftLocale)}</p>
                            <p className="mt-0.5 text-xs tabular-nums text-neutral-500">
                              {meta.short} {sym}
                            </p>
                          </div>
                          <span className="w-6 shrink-0 text-center text-sm text-accent">{active ? "✓" : ""}</span>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>

            <div className="flex flex-col gap-4">
              <p className={sectionLabel}>{t("lang.sectionLanguage")}</p>
              <input
                type="search"
                value={langQuery}
                onChange={(e) => setLangQuery(e.target.value)}
                placeholder={t("lang.searchLanguage")}
                className={inputLight}
                aria-label={t("lang.searchLanguage")}
              />
              <ul
                className="max-h-[min(11rem,32vh)] space-y-1 overflow-y-auto overscroll-contain pr-0.5"
                role="listbox"
                aria-label={t("lang.sectionLanguage")}
              >
                {filteredLocales.length === 0 ? (
                  <li className="py-3 text-center text-sm text-neutral-400">{t("lang.noResults")}</li>
                ) : (
                  filteredLocales.map((code) => {
                    const active = draftLocale === code;
                    return (
                      <li key={code} role="none">
                        <button
                          type="button"
                          role="option"
                          aria-selected={active}
                          onClick={() => setDraftLocale(code)}
                          className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-[15px] transition-colors ${
                            active
                              ? "border-accent/35 bg-accent/8 font-semibold text-neutral-900"
                              : "border-transparent text-neutral-800 hover:bg-neutral-50"
                          }`}
                        >
                          <span className="text-xl leading-none" aria-hidden>
                            {LOCALE_FLAG[code]}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{LOCALE_LABELS[code]}</span>
                          <span className="w-6 shrink-0 text-center text-sm text-accent">{active ? "✓" : ""}</span>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          </div>

          <button
            type="button"
            onClick={save}
            className="mt-6 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white shadow-sm transition-[filter] hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {t("lang.save")}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function LangCurrencySheet({ open, onOpenChange }: Props) {
  if (typeof document === "undefined") return null;

  return createPortal(open ? <LangCurrencySheetInner onOpenChange={onOpenChange} /> : null, document.body);
}
