"use client";

import Link from "next/link";
import { Car, CreditCard, Headphones, Mail, MapPin, Phone, Share2, ShieldCheck } from "lucide-react";
import { SITE_SUPPORT_PHONE_DISPLAY } from "@/lib/siteContact";

const NAV = {
  Şirket: [
    { label: "Hakkımızda", href: "#" },
    { label: "Kariyer", href: "#" },
    { label: "Basın Odası", href: "#" },
    { label: "Sürdürülebilirlik", href: "#" },
  ],
  Hizmetler: [
    { label: "Kısa Dönem Kiralama", href: "/araclar" },
    { label: "Uzun Dönem Kiralama", href: "#" },
    { label: "Kurumsal Filo", href: "#" },
    { label: "Şoförlü Kiralama", href: "#" },
  ],
  Destek: [
    { label: "Yardım Merkezi", href: "#sss" },
    { label: "Rezervasyon Yönet", href: "/hesabim" },
    { label: "Kiralama Şartları", href: "#" },
    { label: "İletişim", href: "#iletisim" },
  ],
  Yasal: [
    { label: "Gizlilik Politikası", href: "#" },
    { label: "KVKK Aydınlatma", href: "#" },
    { label: "Çerez Politikası", href: "#" },
    { label: "Kullanım Koşulları", href: "#" },
  ],
} as const;

const SOCIAL = [
  { key: "ig", label: "Instagram" },
  { key: "fb", label: "Facebook" },
  { key: "tw", label: "X" },
  { key: "yt", label: "YouTube" },
];

export function QuestFooter() {
  const year = new Date().getFullYear();

  return (
    <footer id="iletisim" className="mt-0 border-t border-border/60 bg-background text-foreground">
      <div className="container mx-auto px-4 py-16 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2fr_1fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Car className="h-5 w-5" />
              </span>
              <span className="text-2xl font-extrabold tracking-tight">
                Algorycode <span className="text-primary">Rent</span>
              </span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Türkiye&apos;nin dört bir yanında, dakikalar içinde araç kiralamanı sağlayan dijital filo. Şeffaf fiyat,
              net koşullar.
            </p>

            <ul className="mt-6 space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="text-muted-foreground">
                  Levent, Büyükdere Cad. No:1
                  <br />
                  Şişli / İstanbul
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-4 w-4 shrink-0 text-primary" />
                <a href={`tel:${SITE_SUPPORT_PHONE_DISPLAY.replace(/\s/g, "")}`} className="text-muted-foreground transition-colors hover:text-foreground">
                  {SITE_SUPPORT_PHONE_DISPLAY}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-4 w-4 shrink-0 text-primary" />
                <a href="mailto:concierge@algorycode.rent" className="text-muted-foreground transition-colors hover:text-foreground">
                  concierge@algorycode.rent
                </a>
              </li>
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {Object.entries(NAV).map(([title, items]) => (
              <div key={title}>
                <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-foreground">{title}</h4>
                <ul className="space-y-2.5">
                  {items.map((item) => (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-foreground">Bizi takip et</h4>
            <div className="flex flex-wrap gap-2">
              {SOCIAL.map(({ key, label }) => (
                <a
                  key={key}
                  href="#"
                  aria-label={label}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted transition-all duration-300 hover:bg-primary hover:text-primary-foreground"
                >
                  <Share2 className="h-4 w-4" />
                </a>
              ))}
            </div>

            <div className="mt-8 rounded-2xl border border-border/60 bg-muted p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Güven</p>
              <ul className="mt-3 space-y-2 text-sm text-foreground">
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Tam kasko sigortası
                </li>
                <li className="flex items-center gap-2">
                  <Headphones className="h-4 w-4 text-primary" />
                  7/24 yol yardımı
                </li>
                <li className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Güvenli ödeme
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border/60">
        <div className="container mx-auto flex flex-col items-center justify-between gap-3 px-4 py-6 md:flex-row">
          <p className="text-xs text-muted-foreground">© {year} Algorycode Rent. Tüm hakları saklıdır.</p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
            <Link href="/giris-yap" className="transition-colors hover:text-foreground">
              Giriş
            </Link>
            <Link href="/uye-ol" className="transition-colors hover:text-foreground">
              Üye ol
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
