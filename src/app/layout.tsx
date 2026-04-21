import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
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
      <head>
        <link rel="preconnect" href="https://s3.algorycode.com" crossOrigin="anonymous" />
      </head>
      <body className="font-sans min-h-dvh">
        <LocaleProvider>
          {children}
          <Toaster />
        </LocaleProvider>
      </body>
    </html>
  );
}
