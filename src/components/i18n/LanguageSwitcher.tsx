"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { ChevronDownIcon } from "@/components/ui/Icons";
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
const inputDefault =
  "w-full rounded-md border border-border-subtle bg-bg-card px-2.5 py-2 text-[13px] text-text outline-none placeholder:text-text-muted focus:border-accent/40 focus:ring-1 focus:ring-accent/25";

export function LanguageSwitcher({ tone = "default" }: { tone?: "default" | "navy" }) {
  const { locale, setLocale, currency, setCurrency, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [langQuery, setLangQuery] = useState("");
  const [curQuery, setCurQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setLangQuery("");
      setCurQuery("");
    }
  }, [open]);

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

  const btnNavy =
    "inline-flex h-10 items-center gap-1.5 rounded-md border border-white/20 bg-white/10 pl-2.5 pr-2 text-left text-[13px] font-semibold tabular-nums text-white shadow-none outline-none transition-colors duration-200 hover:bg-white/15 sm:pl-3 sm:text-sm";
  const btnDefault =
    "inline-flex h-9 items-center gap-1.5 rounded-md border border-border-subtle bg-bg-card pl-2.5 pr-2 text-left text-[13px] font-semibold tabular-nums text-text shadow-sm outline-none transition-colors duration-200 hover:bg-bg-raised sm:text-sm";

  const divider = tone === "navy" ? "border-white/10" : "border-border-subtle";
  const sectionLabel =
    tone === "navy"
      ? "text-[10px] font-bold uppercase tracking-widest text-white/50"
      : "text-[10px] font-bold uppercase tracking-widest text-text-muted";

  const rowLang = (code: Locale) =>
    tone === "navy"
      ? `hover:bg-white/10 ${locale === code ? "bg-white/10 font-semibold text-steel" : "text-white/80"}`
      : `hover:bg-bg-raised ${locale === code ? "bg-bg-raised font-semibold text-accent" : "text-text-muted"}`;

  const rowCur = (code: CurrencyCode) =>
    tone === "navy"
      ? `hover:bg-white/10 ${currency === code ? "bg-white/10 font-semibold text-steel" : "text-white/80"}`
      : `hover:bg-bg-raised ${currency === code ? "bg-bg-raised font-semibold text-accent" : "text-text-muted"}`;

  const panelBg =
    tone === "navy"
      ? "border-white/15 bg-navy-hero text-white ring-1 ring-black/25"
      : "border-border-subtle bg-bg-card";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${tone === "navy" ? btnNavy : btnDefault} ${
          open ? (tone === "navy" ? "ring-1 ring-white/40" : "ring-1 ring-accent/35") : ""
        }`}
        aria-label={t("lang.currencyAria")}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className="text-base leading-none" aria-hidden>
          {LOCALE_FLAG[locale]}
        </span>
        <span className="tracking-wide">{currency}</span>
        <ChevronDownIcon
          className={`size-[14px] shrink-0 transition-transform duration-150 ${tone === "navy" ? "text-white/55" : "text-text-muted"} ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className={`absolute right-0 top-[calc(100%+0.375rem)] z-50 min-w-0 max-w-[min(22rem,calc(100dvw-1.25rem))] w-[min(22rem,calc(100dvw-1.25rem))] overflow-hidden rounded-xl border shadow-2xl ${panelBg}`}
          role="dialog"
          aria-label={t("lang.menuTitle")}
        >
          <div
            className={`grid min-h-0 max-h-[min(72dvh,26rem)] grid-cols-1 divide-y ${divider} md:grid-cols-2 md:divide-x md:divide-y-0`}
          >
            <div className="flex min-h-0 min-w-0 flex-col p-2.5 md:max-h-full">
              <p className={sectionLabel}>{t("lang.sectionLanguage")}</p>
              <input
                type="search"
                value={langQuery}
                onChange={(e) => setLangQuery(e.target.value)}
                placeholder={t("lang.searchLanguage")}
                className={`mt-1.5 ${tone === "navy" ? inputNavy : inputDefault}`}
                aria-label={t("lang.searchLanguage")}
              />
              <div className="mt-2 max-h-44 min-h-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] md:max-h-[min(15rem,38vh)]">
                {filteredLocales.length === 0 ? (
                  <p
                    className={`px-1 py-3 text-center text-xs ${tone === "navy" ? "text-white/45" : "text-text-muted"}`}
                  >
                    {t("lang.noResults")}
                  </p>
                ) : (
                  <ul className="space-y-0.5" role="listbox">
                    {filteredLocales.map((code) => (
                      <li key={code} role="none">
                        <button
                          type="button"
                          role="option"
                          aria-selected={locale === code}
                          onClick={() => setLocale(code)}
                          className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[13px] transition-colors duration-100 ${rowLang(code)}`}
                        >
                          <span className="text-base leading-none" aria-hidden>
                            {LOCALE_FLAG[code]}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{LOCALE_LABELS[code]}</span>
                          <span className="w-4 shrink-0 text-center text-[11px] opacity-70">
                            {locale === code ? "✓" : ""}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="flex min-h-0 min-w-0 flex-col p-2.5 md:max-h-full">
              <p className={sectionLabel}>{t("lang.sectionCurrency")}</p>
              <input
                type="search"
                value={curQuery}
                onChange={(e) => setCurQuery(e.target.value)}
                placeholder={t("lang.searchCurrency")}
                className={`mt-1.5 ${tone === "navy" ? inputNavy : inputDefault}`}
                aria-label={t("lang.searchCurrency")}
              />
              <div className="mt-2 max-h-44 min-h-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] md:max-h-[min(15rem,38vh)]">
                {filteredCurrencies.length === 0 ? (
                  <p
                    className={`px-1 py-3 text-center text-xs ${tone === "navy" ? "text-white/45" : "text-text-muted"}`}
                  >
                    {t("lang.noResults")}
                  </p>
                ) : (
                  <ul className="space-y-0.5" role="listbox">
                    {filteredCurrencies.map((code) => {
                      const meta = CURRENCY_QUERY_TEXT[code];
                      return (
                        <li key={code} role="none">
                          <button
                            type="button"
                            role="option"
                            aria-selected={currency === code}
                            onClick={() => setCurrency(code)}
                            className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors duration-100 ${rowCur(code)}`}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-semibold tabular-nums tracking-wide">{meta.short}</p>
                              <p
                                className={`truncate text-[11px] leading-tight ${tone === "navy" ? "text-white/45" : "text-text-muted"}`}
                              >
                                {meta.name}
                              </p>
                            </div>
                            <span className="w-4 shrink-0 text-center text-[11px] opacity-70">
                              {currency === code ? "✓" : ""}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className={`border-t px-2.5 py-2 ${divider}`}>
            <button
              type="button"
              className={`w-full rounded-md py-2 text-center text-xs font-semibold uppercase tracking-wide transition-colors ${
                tone === "navy"
                  ? "bg-white/10 text-white hover:bg-white/15"
                  : "bg-bg-raised text-text hover:bg-border-subtle/50"
              }`}
              onClick={() => setOpen(false)}
            >
              {t("lang.close")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
