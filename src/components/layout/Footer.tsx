"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { SITE_SUPPORT_PHONE_DISPLAY } from "@/lib/siteContact";

export function Footer() {
  return (
    <footer id="iletisim" className="mt-16 border-t border-border-subtle bg-bg-raised/70">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35 }}
          >
            <p className="text-base font-semibold text-text">
              <span className="text-accent">Algorycode</span> Rent
            </p>
            <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-text-muted">
              Şeffaf fiyat, net koşullar ve hızlı rezervasyon ile araç kiralama.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: 0.04 }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">Keşfet</p>
            <ul className="mt-3 space-y-1.5 text-[13px] text-text-muted">
              {["Filomuz", "Kurumsal", "Blog"].map((t) => (
                <li key={t}>
                  <Link href="#" className="hover:text-text">
                    {t}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: 0.08 }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">Destek</p>
            <ul className="mt-3 space-y-1.5 text-[13px] text-text-muted">
              {["SSS", "Hasar & sigorta", "İade koşulları"].map((t) => (
                <li key={t}>
                  <Link href="#" className="hover:text-text">
                    {t}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: 0.12 }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">İletişim</p>
            <p className="mt-3 text-[13px] text-text-muted">
              concierge@algorycode.rent
              <br />
              {SITE_SUPPORT_PHONE_DISPLAY}
            </p>
          </motion.div>
        </div>
        <p className="mt-8 border-t border-border-subtle pt-6 text-center text-[11px] text-text-muted">
          © {new Date().getFullYear()} Algorycode Rent. Tüm hakları saklıdır.
        </p>
      </div>
    </footer>
  );
}
