"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { formatMoney, formatMoneyDecimal } from "@/data/fleet";
import {
  CURRENCY_STORAGE_KEY,
  DEFAULT_CURRENCY,
  DEFAULT_LOCALE,
  isCurrency,
  isLocale,
  LOCALE_STORAGE_KEY,
  type CurrencyCode,
  type Locale,
} from "@/lib/i18n/config";
import { formatMessage, messages, type MessageKey } from "@/lib/i18n/messages";

type I18nContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  currency: CurrencyCode;
  setCurrency: (next: CurrencyCode) => void;
  /** Filo fiyatları TRY; seçilen para biriminde gösterim */
  formatPrice: (amountTry: number) => string;
  formatPriceDecimal: (amountTry: number) => string;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [currency, setCurrencyState] = useState<CurrencyCode>(DEFAULT_CURRENCY);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
      if (raw && isLocale(raw)) setLocaleState(raw);
      const cur = localStorage.getItem(CURRENCY_STORAGE_KEY);
      if (cur && isCurrency(cur)) setCurrencyState(cur);
    } catch {
      /* ignore */
    }
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const setCurrency = useCallback((next: CurrencyCode) => {
    setCurrencyState(next);
    try {
      localStorage.setItem(CURRENCY_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useCallback(
    (key: MessageKey, params?: Record<string, string | number>) => {
      const raw = messages[locale][key] ?? messages[DEFAULT_LOCALE][key] ?? String(key);
      return formatMessage(raw, params);
    },
    [locale],
  );

  const formatPrice = useCallback((amountTry: number) => formatMoney(amountTry, currency), [currency]);

  const formatPriceDecimal = useCallback(
    (amountTry: number) => formatMoneyDecimal(amountTry, currency),
    [currency],
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      currency,
      setCurrency,
      formatPrice,
      formatPriceDecimal,
      t,
    }),
    [currency, formatPrice, formatPriceDecimal, locale, setCurrency, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within LocaleProvider");
  }
  return ctx;
}
