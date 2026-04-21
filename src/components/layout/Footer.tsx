"use client";

import Link from "next/link";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { SITE_SUPPORT_PHONE_DISPLAY } from "@/lib/siteContact";

export function Footer() {
  const { t } = useI18n();
  const year = new Date().getFullYear();

  return (
    <footer id="iletisim" className="shrink-0 border-t border-border-subtle bg-bg-raised shadow-[inset_0_1px_0_rgba(201,169,98,0.08)]">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-base font-semibold text-text">
              <span className="text-accent">Algorycode</span> Rent
            </p>
            <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-text-muted">{t("footer.tagline")}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">{t("footer.explore")}</p>
            <ul className="mt-3 space-y-1.5 text-[13px] text-text-muted">
              {(
                [
                  ["/#filomuz", "footer.linkFleet"],
                  ["#", "footer.linkCorporate"],
                  ["#", "footer.linkBlog"],
                ] as const
              ).map(([href, key]) => (
                <li key={key}>
                  <Link href={href} className="hover:text-text">
                    {t(key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">{t("footer.support")}</p>
            <ul className="mt-3 space-y-1.5 text-[13px] text-text-muted">
              {(
                [
                  ["/#sss", "footer.linkFaq"],
                  ["#", "footer.linkDamage"],
                  ["#", "footer.linkReturns"],
                ] as const
              ).map(([href, key]) => (
                <li key={key}>
                  <Link href={href} className="hover:text-text">
                    {t(key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">{t("footer.contact")}</p>
            <p className="mt-3 text-[13px] text-text-muted">
              concierge@algorycode.rent
              <br />
              {SITE_SUPPORT_PHONE_DISPLAY}
            </p>
          </div>
        </div>
        <p className="mt-8 border-t border-border-subtle pt-6 text-center text-[11px] text-text-muted">
          {t("footer.rights", { year })}
        </p>
      </div>
    </footer>
  );
}
