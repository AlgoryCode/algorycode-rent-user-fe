"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { ChevronDownIcon } from "@/components/ui/Icons";
import { LOCALE_FLAG } from "@/lib/i18n/config";

const LangCurrencySheet = dynamic(
  () => import("@/components/i18n/LangCurrencySheet").then((m) => ({ default: m.LangCurrencySheet })),
  { ssr: false },
);

export function LanguageSwitcher({ tone = "default" }: { tone?: "default" | "navy" | "navbar" }) {
  const { locale, currency, t } = useI18n();
  const [sheetOpen, setSheetOpen] = useState(false);

  const btnNavy =
    "inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-md border border-white/20 bg-white/10 pl-2.5 pr-2 text-left text-[13px] font-semibold tabular-nums text-white shadow-none outline-none transition-colors duration-200 hover:bg-white/15 sm:pl-3 sm:text-sm";
  const btnDefault =
    "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-border-subtle bg-bg-card pl-2.5 pr-2 text-left text-[13px] font-semibold tabular-nums text-text shadow-sm outline-none transition-colors duration-200 hover:bg-bg-raised sm:text-sm";
  /** Üst şerit: shadcn uyumlu, dar alanda para birimi gizlenebilir */
  const btnNavbar =
    "inline-flex h-8 cursor-pointer items-center gap-1 rounded-md border border-border/60 bg-muted/45 pl-1.5 pr-1 text-left text-[11px] font-semibold tabular-nums text-foreground shadow-none outline-none transition-colors hover:bg-muted sm:h-9 sm:gap-1.5 sm:pl-2 sm:pr-1.5 sm:text-[13px]";

  const ringOpen =
    tone === "navy"
      ? "ring-1 ring-white/40"
      : tone === "navbar"
        ? "ring-2 ring-ring ring-offset-2 ring-offset-background"
        : "ring-1 ring-accent/35";

  const chevronMuted =
    tone === "navy" ? "text-white/55" : tone === "navbar" ? "text-muted-foreground" : "text-text-muted";

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className={`${
          tone === "navy" ? btnNavy : tone === "navbar" ? btnNavbar : btnDefault
        } ${sheetOpen ? ringOpen : ""}`}
        aria-label={t("lang.currencyAria")}
        aria-expanded={sheetOpen}
        aria-haspopup="dialog"
      >
        <span className="text-[15px] leading-none sm:text-base" aria-hidden>
          {LOCALE_FLAG[locale]}
        </span>
        <span className="hidden min-[360px]:inline tracking-wide">{currency}</span>
        <ChevronDownIcon
          className={`size-3 shrink-0 transition-transform duration-150 sm:size-[14px] ${chevronMuted} ${sheetOpen ? "rotate-180" : ""}`}
        />
      </button>

      <LangCurrencySheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
