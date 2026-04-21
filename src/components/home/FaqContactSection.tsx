"use client";

import Link from "next/link";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { Reveal } from "@/components/ui/Reveal";
import { SITE_SUPPORT_PHONE_DISPLAY, SITE_SUPPORT_PHONE_TEL } from "@/lib/siteContact";

const FAQ_KEYS = [
  { q: "home.faq.q1" as const, a: "home.faq.a1" as const },
  { q: "home.faq.q2" as const, a: "home.faq.a2" as const },
  { q: "home.faq.q3" as const, a: "home.faq.a3" as const },
  { q: "home.faq.q4" as const, a: "home.faq.a4" as const },
];

export function FaqContactSection() {
  const { t } = useI18n();

  return (
    <section
      id="sss"
      className="border-t border-border-subtle bg-bg-raised/40 py-14 sm:py-16"
      aria-labelledby="home-faq-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <Reveal>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">{t("home.faqSection.kicker")}</p>
              <h2 id="home-faq-heading" className="mt-2 text-2xl font-semibold tracking-tight text-text sm:text-3xl">
                {t("home.faqSection.title")}
              </h2>
              <p className="mt-3 max-w-xl text-sm text-text-muted">{t("home.faqSection.subtitle")}</p>
            </Reveal>
            <div className="mt-8 space-y-2">
              {FAQ_KEYS.map((item, i) => (
                <Reveal key={item.q} delay={i * 0.05}>
                  <details className="group rounded-xl border border-neutral-200/90 bg-white open:shadow-sm">
                    <summary className="cursor-pointer list-none px-4 py-3.5 text-sm font-semibold text-text outline-none transition-colors marker:content-none hover:bg-neutral-50/80 sm:px-5 sm:py-4 sm:text-[15px] [&::-webkit-details-marker]:hidden">
                      <span className="flex items-center justify-between gap-3">
                        {t(item.q)}
                        <span className="text-xs font-normal text-text-muted transition-transform group-open:rotate-180">▾</span>
                      </span>
                    </summary>
                    <div className="border-t border-border-subtle/60 px-4 pb-4 pt-2 text-[13px] leading-relaxed text-text-muted sm:px-5 sm:pb-5">
                      {t(item.a)}
                    </div>
                  </details>
                </Reveal>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5">
            <Reveal y={16}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">{t("home.contactSection.kicker")}</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text sm:text-3xl">
                {t("home.contactSection.title")}
              </h2>
              <p className="mt-3 text-sm text-text-muted">{t("home.contactSection.subtitle")}</p>
              <div className="mt-6 rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-sm sm:p-6">
                <p className="text-sm font-medium text-text">concierge@algorycode.rent</p>
                <a href="mailto:concierge@algorycode.rent" className="mt-2 inline-block text-sm text-accent hover:underline">
                  {t("home.contactSection.emailCta")}
                </a>
                <p className="mt-4 text-sm font-medium text-text">
                  <a href={SITE_SUPPORT_PHONE_TEL} className="text-accent hover:underline">
                    {SITE_SUPPORT_PHONE_DISPLAY}
                  </a>
                </p>
                <Link
                  href="/#iletisim"
                  className="mt-6 inline-flex min-h-11 items-center rounded-lg border border-border-subtle bg-bg-raised/50 px-4 text-sm font-semibold text-text transition-colors hover:border-accent/30 hover:bg-bg-raised"
                >
                  {t("home.contactSection.footerLink")}
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
