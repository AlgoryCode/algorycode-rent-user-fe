"use client";

import { useState } from "react";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { LangCurrencySheet } from "@/components/i18n/LangCurrencySheet";
import { ChevronDownIcon } from "@/components/ui/Icons";
import { LOCALE_FLAG } from "@/lib/i18n/config";

export function LanguageSwitcher({ tone = "default" }: { tone?: "default" | "navy" }) {
  const { locale, currency, t } = useI18n();
  const [sheetOpen, setSheetOpen] = useState(false);

  const btnNavy =
    "inline-flex h-10 items-center gap-1.5 rounded-md border border-white/20 bg-white/10 pl-2.5 pr-2 text-left text-[13px] font-semibold tabular-nums text-white shadow-none outline-none transition-colors duration-200 hover:bg-white/15 sm:pl-3 sm:text-sm";
  const btnDefault =
    "inline-flex h-9 items-center gap-1.5 rounded-md border border-border-subtle bg-bg-card pl-2.5 pr-2 text-left text-[13px] font-semibold tabular-nums text-text shadow-sm outline-none transition-colors duration-200 hover:bg-bg-raised sm:text-sm";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className={`${tone === "navy" ? btnNavy : btnDefault} ${
          sheetOpen ? (tone === "navy" ? "ring-1 ring-white/40" : "ring-1 ring-accent/35") : ""
        }`}
        aria-label={t("lang.currencyAria")}
        aria-expanded={sheetOpen}
        aria-haspopup="dialog"
      >
        <span className="text-base leading-none" aria-hidden>
          {LOCALE_FLAG[locale]}
        </span>
        <span className="tracking-wide">{currency}</span>
        <ChevronDownIcon
          className={`size-[14px] shrink-0 transition-transform duration-150 ${tone === "navy" ? "text-white/55" : "text-text-muted"} ${sheetOpen ? "rotate-180" : ""}`}
        />
      </button>

      <LangCurrencySheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
