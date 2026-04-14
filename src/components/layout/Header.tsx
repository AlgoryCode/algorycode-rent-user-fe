"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { ArrowRightOnRectangleIcon, CalendarDaysIcon, UserCircleNavIcon } from "@/components/ui/Icons";
import { fetchHasBffSession } from "@/lib/bff-access-token";
import { clearClientAuthSession, getStoredAuthUser } from "@/lib/authSession";

const links = [
  { href: "/araclar", label: "Araçlar" },
  { href: "/#filomuz", label: "Filo" },
  { href: "/#nasil", label: "Nasıl çalışır" },
  { href: "/#iletisim", label: "İletişim" },
];

export function Header() {
  const pathname = usePathname();
  /** SSR ile ilk istemci boyaması aynı olmalı; oturum bilgisi mount sonrası okunur. */
  const [isAuthed, setIsAuthed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const initials = useMemo(() => {
    if (!isAuthed) return "U";
    const user = getStoredAuthUser();
    const fullName = user?.fullName?.trim();
    if (fullName) {
      const parts = fullName.split(/\s+/).filter(Boolean);
      return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "U";
    }
    if (user?.email) return user.email[0]?.toUpperCase() ?? "U";
    return "U";
  }, [isAuthed]);

  useEffect(() => {
    void fetchHasBffSession().then(setIsAuthed);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-emerald-200/80 bg-emerald-50/95 backdrop-blur-md dark:border-emerald-900/45 dark:bg-emerald-950/92">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-[3.75rem] sm:px-6">
        <Link
          href="/"
          className="shrink-0 text-[15px] font-semibold tracking-tight text-slate-800 dark:text-emerald-50 sm:text-base"
        >
          <span className="text-emerald-700 dark:text-emerald-400">Algorycode</span>
          <span className="text-slate-600 dark:text-emerald-100/75"> Rent</span>
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-2 text-[13px] font-medium text-slate-600 transition-colors hover:bg-emerald-100/80 hover:text-slate-900 dark:text-emerald-100/80 dark:hover:bg-emerald-900/45 dark:hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle className="border-emerald-200/80 bg-white/80 text-slate-700 shadow-sm dark:border-emerald-800/50 dark:bg-emerald-900/50 dark:text-emerald-50" />
          {isAuthed ? (
            <>
              <Link
                href="/hesabim?tab=rezervasyonlar"
                className="inline-flex h-10 items-center rounded-lg border border-border-subtle bg-bg-card px-3 text-xs font-semibold text-text transition-colors hover:border-accent/30 hover:text-accent sm:text-sm"
              >
                Rezervasyonlarım
              </Link>
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-subtle bg-bg-card text-sm font-semibold text-text transition-colors hover:border-accent/30 hover:bg-bg-raised/60"
                  aria-label="Profil menüsü"
                  aria-expanded={menuOpen}
                >
                  {initials}
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-[11.5rem] rounded-xl border border-border-subtle bg-bg-card/95 p-1.5 shadow-xl backdrop-blur transition-shadow hover:shadow-2xl">
                    <Link
                      href="/hesabim"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-text transition-colors hover:bg-accent/10 hover:text-accent"
                    >
                      <UserCircleNavIcon className="size-[18px] opacity-80" />
                      Hesabım
                    </Link>
                    <Link
                      href="/hesabim?tab=rezervasyonlar"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-text transition-colors hover:bg-accent/10 hover:text-accent"
                    >
                      <CalendarDaysIcon className="size-[18px] opacity-80" />
                      Rezervasyonlarım
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
                      className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-text transition-colors hover:bg-accent/10 hover:text-accent"
                    >
                      <ArrowRightOnRectangleIcon className="size-[18px] opacity-80" />
                      Çıkış yap
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/giris-yap"
                  className="inline-flex items-center rounded-md border border-border-subtle bg-bg-card px-3 py-2 text-[13px] font-semibold text-text transition-colors hover:border-accent/30 hover:text-accent"
                >
                  Giriş Yap
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/uye-ol"
                  className="inline-flex items-center rounded-md bg-accent px-3.5 py-2 text-[13px] font-semibold text-white shadow-sm transition-shadow hover:shadow-md sm:px-4"
                >
                  Üye Ol
                </Link>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
