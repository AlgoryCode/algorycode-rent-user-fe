"use client";

import Link from "next/link";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";

/** Tüm sitede kullanılan üst şerit: marka, dil/para, Araçlar, kayıt + giriş */
export function QuestMiniChrome() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-card/80 backdrop-blur-md supports-[backdrop-filter]:bg-card/70">
      <div className="container mx-auto flex min-h-[var(--header-h)] flex-wrap items-center justify-between gap-x-2 gap-y-2 px-3 py-2 sm:gap-x-3 sm:px-4 sm:py-2.5">
        <Link
          href="/"
          className="min-w-0 shrink text-base font-extrabold leading-tight tracking-tight text-foreground sm:text-lg"
        >
          Algorycode <span className="text-primary">Rent</span>
        </Link>

        <nav
          className="flex min-w-0 max-w-[100%] flex-1 flex-wrap items-center justify-end gap-1.5 sm:max-w-none sm:flex-nowrap sm:gap-2"
          aria-label="Ana navigasyon"
        >
          <LanguageSwitcher tone="navbar" />
          <Link
            href="/araclar"
            className="rounded-md px-2 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:px-3 sm:text-sm"
          >
            Araçlar
          </Link>
          <Link
            href="/uye-ol"
            className="rounded-md border border-primary/40 bg-background px-2.5 py-1.5 text-xs font-semibold text-primary shadow-sm transition-colors hover:bg-muted sm:px-3 sm:text-sm"
          >
            Kayıt ol
          </Link>
          <Link
            href="/giris-yap"
            className="rounded-md bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-[hsl(var(--sh-primary-glow))] sm:px-3 sm:text-sm"
          >
            Giriş yap
          </Link>
        </nav>
      </div>
    </header>
  );
}
