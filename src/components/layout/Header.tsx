"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { LoginModal } from "@/components/auth/LoginModal";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { MobileDrawerLangCurrency } from "@/components/i18n/MobileDrawerLangCurrency";
import { useI18n } from "@/components/i18n/LocaleProvider";
import {
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  CalendarDaysIcon,
  Cog6ToothIcon,
  XMarkIcon,
} from "@/components/ui/Icons";
import { fetchHasBffMemberSession } from "@/lib/bff-access-token";
import { clearClientAuthSession, getStoredAuthUser } from "@/lib/authSession";
import type { MessageKey } from "@/lib/i18n/messages";

const NAV_LINKS: { href: string; labelKey: MessageKey }[] = [
  { href: "/araclar", labelKey: "nav.vehicles" },
  { href: "/#nasil", labelKey: "nav.howItWorks" },
  { href: "/#iletisim", labelKey: "nav.contact" },
];

export function Header() {
  const pathname = usePathname();
  const { t } = useI18n();
  /** SSR ile ilk istemci boyaması aynı olmalı; oturum bilgisi mount sonrası okunur. */
  const [isAuthed, setIsAuthed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const profile = isAuthed ? getStoredAuthUser() : null;
  const profileFullName = profile?.fullName?.trim() ?? "";
  const profileEmail = profile?.email?.trim() ?? "";

  const initials = useMemo(() => {
    if (!isAuthed) return "U";
    if (profileFullName) {
      const parts = profileFullName.split(/\s+/).filter(Boolean);
      return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "U";
    }
    if (profileEmail) return profileEmail[0]?.toUpperCase() ?? "U";
    return "U";
  }, [isAuthed, profileFullName, profileEmail]);

  const displayName = profileFullName || profileEmail || t("header.guestUser");
  const displayEmail = profileEmail;

  useEffect(() => {
    void fetchHasBffMemberSession().then(setIsAuthed);
  }, [pathname]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const close = () => {
      if (mq.matches) setMobileNavOpen(false);
    };
    mq.addEventListener("change", close);
    return () => mq.removeEventListener("change", close);
  }, []);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    if (mobileNavOpen) setMenuOpen(false);
  }, [mobileNavOpen]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileNavOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  const navLinkClass =
    "rounded-md px-3 py-2.5 text-[15px] font-medium text-white/75 transition-colors hover:bg-white/10 hover:text-white md:py-2.5 md:text-[15px] lg:text-[16px]";

  const mobileNavLinkClass =
    "flex items-center gap-3 rounded-md px-3 py-3.5 text-[16px] font-medium text-white/90 transition-colors hover:bg-white/10";

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-navy-hero">
      <LoginModal
        open={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        redirectTo={pathname}
        onLoggedIn={() => void fetchHasBffMemberSession().then(setIsAuthed)}
      />
      <div className="mx-auto flex min-h-[var(--header-h)] max-w-6xl items-center justify-between gap-3 px-4 py-2 sm:px-6 sm:py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-5 md:gap-6 lg:gap-8">
          <Link href="/" className="shrink-0 text-base font-semibold tracking-tight sm:text-lg">
            <span className="text-white">Algorycode</span>
            <span className="text-steel"> Rent</span>
          </Link>
          <nav className="hidden min-w-0 items-center gap-0.5 md:flex" aria-label={t("nav.ariaMain")}>
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className={navLinkClass}>
                {t(l.labelKey)}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-md border border-white/20 text-white transition-colors hover:bg-white/10 md:hidden"
            aria-label={t("header.mobileMenuTitle")}
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen((v) => !v)}
          >
            <Bars3Icon className="size-[22px]" />
          </button>
          <div className="hidden items-center gap-2 sm:gap-2.5 md:flex">
            <LanguageSwitcher tone="navy" />
            {isAuthed ? (
              <>
                <Link
                  href="/hesabim?section=rezervasyonlar"
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-white/25 bg-white/5 px-3.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-white/10"
                >
                  <CalendarDaysIcon className="size-[18px] shrink-0 text-white/85" aria-hidden />
                  {t("header.myReservations")}
                </Link>
                <div className="relative" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setMenuOpen((v) => !v)}
                    className={`flex size-10 shrink-0 items-center justify-center rounded-full border border-white/85 bg-white text-[11px] font-semibold tracking-tight text-navy-hero shadow-sm outline-none transition-colors duration-200 hover:bg-white/95 sm:text-xs ${
                      menuOpen ? "ring-2 ring-white/70" : ""
                    }`}
                    aria-label={t("header.accountMenu")}
                    aria-expanded={menuOpen}
                    aria-haspopup="menu"
                  >
                    {initials}
                  </button>
                  {menuOpen && (
                    <div
                      className="absolute right-0 top-[calc(100%+0.375rem)] z-50 min-w-0 max-w-[min(16rem,calc(100dvw-2rem))] w-[min(16rem,calc(100dvw-2rem))] overflow-hidden rounded-lg border border-white/20 bg-navy-hero p-1 shadow-[0_16px_48px_rgba(0,8,40,0.45)] ring-1 ring-white/10"
                      role="menu"
                    >
                      <div className="mb-1 border-b border-white/10 px-2.5 pb-2.5 pt-2">
                        <div className="flex gap-2.5">
                          <div
                            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-semibold text-white"
                            aria-hidden="true"
                          >
                            {initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-medium leading-tight text-white">
                              {displayName}
                            </p>
                            {displayEmail ? (
                              <p
                                className="mt-0.5 truncate text-xs leading-tight text-white/55"
                                title={displayEmail}
                              >
                                {displayEmail}
                              </p>
                            ) : (
                              <p className="mt-0.5 text-xs leading-tight text-white/55">
                                {t("header.emailMissing")}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <Link
                          href="/hesabim?section=profil"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-white/90 transition-colors duration-150 hover:bg-white/10"
                          role="menuitem"
                        >
                          <Cog6ToothIcon className="size-[15px] text-white/55" />
                          {t("header.settings")}
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            void (async () => {
                              await clearClientAuthSession();
                              setIsAuthed(false);
                              setMenuOpen(false);
                              window.location.href = "/";
                            })();
                          }}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-white/90 transition-colors duration-150 hover:bg-white/10"
                          role="menuitem"
                        >
                          <ArrowRightOnRectangleIcon className="size-[15px] text-white/55" />
                          {t("header.signOut")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <button
                    type="button"
                    onClick={() => setLoginModalOpen(true)}
                    className="inline-flex h-10 items-center rounded-md border border-white/35 bg-transparent px-3.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-white/10 sm:px-4 sm:text-[15px]"
                  >
                    {t("header.login")}
                  </button>
                </motion.div>
                <Link
                  href="/uye-ol"
                  className="inline-flex h-10 items-center rounded-md bg-btn-solid px-3.5 text-sm font-semibold text-btn-solid-fg shadow-md transition-[filter,box-shadow] hover:brightness-110 hover:shadow-lg active:scale-[0.98] sm:px-4 sm:text-[15px]"
                >
                  {t("header.signUp")}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileNavOpen && (
          <>
            <motion.button
              key="mobile-backdrop"
              type="button"
              aria-label={t("header.closeMenu")}
              className="fixed inset-x-0 top-[var(--header-h)] bottom-0 z-[42] bg-black/50 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileNavOpen(false)}
            />
            <motion.aside
              key="mobile-drawer"
              role="dialog"
              aria-modal="true"
              aria-label={t("header.mobileMenuTitle")}
              className="fixed left-0 top-[var(--header-h)] z-[43] flex h-[calc(100dvh-var(--header-h))] w-[min(20.5rem,92vw)] flex-col border-r border-white/10 bg-navy-hero-drawer shadow-[6px_0_40px_rgba(0,0,0,0.45)] md:hidden"
              initial={{ x: "-105%" }}
              animate={{ x: 0 }}
              exit={{ x: "-105%" }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex shrink-0 items-center justify-end border-b border-white/10 px-2 py-2">
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="inline-flex size-10 items-center justify-center rounded-md text-white transition-colors hover:bg-white/10"
                  aria-label={t("header.closeMenu")}
                >
                  <XMarkIcon className="size-6" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
                {isAuthed && (
                  <div className="border-b border-white/10 px-4 pb-5 pt-2">
                    <div className="flex flex-col items-center text-center">
                      <div
                        className="flex size-[4.5rem] shrink-0 items-center justify-center rounded-full border-2 border-white/30 bg-white/10 text-xl font-semibold tracking-tight text-white"
                        aria-hidden
                      >
                        {initials}
                      </div>
                      <p className="mt-3 max-w-full truncate text-base font-semibold text-white">{displayName}</p>
                      {displayEmail ? (
                        <p className="mt-1 max-w-full truncate text-sm text-white/55" title={displayEmail}>
                          {displayEmail}
                        </p>
                      ) : (
                        <p className="mt-1 text-sm text-white/55">{t("header.emailMissing")}</p>
                      )}
                    </div>
                  </div>
                )}

                <nav className="px-1 py-1" aria-label={t("nav.ariaMain")}>
                  {NAV_LINKS.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className={mobileNavLinkClass}
                      onClick={() => setMobileNavOpen(false)}
                    >
                      {t(l.labelKey)}
                    </Link>
                  ))}
                </nav>

                <MobileDrawerLangCurrency />

                <div className="border-t border-white/10 px-1 py-2">
                  {isAuthed ? (
                    <div className="flex flex-col">
                      <Link
                        href="/hesabim?section=rezervasyonlar"
                        className={mobileNavLinkClass}
                        onClick={() => setMobileNavOpen(false)}
                      >
                        <CalendarDaysIcon className="size-[18px] shrink-0 text-white/70" aria-hidden />
                        {t("header.myReservations")}
                      </Link>
                      <Link
                        href="/hesabim?section=profil"
                        className={mobileNavLinkClass}
                        onClick={() => setMobileNavOpen(false)}
                      >
                        <Cog6ToothIcon className="size-[18px] shrink-0 text-white/70" aria-hidden />
                        {t("header.settings")}
                      </Link>
                      <button
                        type="button"
                        className={`${mobileNavLinkClass} w-full text-left`}
                        onClick={() => {
                          void (async () => {
                            await clearClientAuthSession();
                            setIsAuthed(false);
                            setMobileNavOpen(false);
                            window.location.href = "/";
                          })();
                        }}
                      >
                        <ArrowRightOnRectangleIcon className="size-[18px] shrink-0 text-white/70" aria-hidden />
                        {t("header.signOut")}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1 px-2 pb-4 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setMobileNavOpen(false);
                          setLoginModalOpen(true);
                        }}
                        className={mobileNavLinkClass}
                      >
                        {t("header.login")}
                      </button>
                      <Link
                        href="/uye-ol"
                        className={`${mobileNavLinkClass} border border-sky-500/40 bg-sky-500/15 text-sky-100 hover:bg-sky-500/25`}
                        onClick={() => setMobileNavOpen(false)}
                      >
                        {t("header.signUp")}
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
