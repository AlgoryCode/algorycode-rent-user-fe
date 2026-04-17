"use client";

import { useState } from "react";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { LangCurrencySheet } from "@/components/i18n/LangCurrencySheet";
import { ChevronDownIcon } from "@/components/ui/Icons";
import { LOCALE_FLAG, type Locale } from "@/lib/i18n/config";

const LOCALE_LABELS: Record<Locale, string> = {
  tr: "Türkçe",
  en: "English",
  sq: "Shqip",
};

/** Mobil menü: dil/para birimi referans düzeninde tam ekran alt sayfa modalı. */
export function MobileDrawerLangCurrency() {
  const { locale, currency, t } = useI18n();
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <div className="border-t border-white/10 px-1 py-2">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-3.5 text-left text-[16px] font-medium text-white/90 transition-colors hover:bg-white/10"
          aria-label={t("lang.currencyAria")}
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
        >
          <span className="flex min-w-0 flex-1 items-center gap-3">
            <span className="text-xl leading-none" aria-hidden>
              {LOCALE_FLAG[locale]}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate">{t("lang.sheetRow")}</span>
              <span className="mt-0.5 block truncate text-xs font-normal text-white/50">
                {LOCALE_LABELS[locale]} · {currency}
              </span>
            </span>
          </span>
          <ChevronDownIcon className={`size-5 shrink-0 text-white/50 transition-transform ${sheetOpen ? "rotate-180" : ""}`} />
        </button>
      </div>
      <LangCurrencySheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
}
