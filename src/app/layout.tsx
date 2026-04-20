import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import Script from "next/script";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Algorycode Rent | Araç kiralama",
  description:
    "İstanbul ve çevresinde şeffaf fiyat, net koşullar ve hızlı rezervasyon ile araç kiralama.",
};

const themeInit = `(function(){try{var t=localStorage.getItem("rent-theme");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t);}else{document.documentElement.setAttribute("data-theme","dark");}}catch(e){document.documentElement.setAttribute("data-theme","dark");}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      suppressHydrationWarning
      className={`${dmSans.variable} font-sans h-full min-h-dvh scroll-smooth antialiased`}
    >
      <body className="font-sans min-h-dvh">
        <Script
          id="rent-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInit }}
        />
        <ThemeProvider>
          <LocaleProvider>
            {children}
            <Toaster />
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
