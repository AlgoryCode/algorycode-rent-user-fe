"use client";

import { Award, Clock, CreditCard, Headphones, ShieldCheck, ThumbsUp } from "lucide-react";

const ADVANTAGES = [
  {
    Icon: ShieldCheck,
    title: "Tam Kasko Sigortası",
    description: "Tüm araçlarımız tam kasko sigortalıdır. Güvenle yola çıkın.",
  },
  {
    Icon: Headphones,
    title: "7/24 Yol Yardımı",
    description: "Günün her saati yanınızdayız. Yolda kalmayın.",
  },
  {
    Icon: CreditCard,
    title: "Güvenli Ödeme",
    description: "256-bit SSL şifreleme ile güvenli ödeme altyapısı.",
  },
  {
    Icon: Clock,
    title: "Hızlı Teslimat",
    description: "Rezervasyonunuzu dakikalar içinde onaylıyoruz.",
  },
  {
    Icon: Award,
    title: "Garanti",
    description: "Tüm araçlarımız düzenli bakımlı ve garantilidir.",
  },
  {
    Icon: ThumbsUp,
    title: "Kolay İptal",
    description: "Esnek iptal politikası ile gönül rahatlığı.",
  },
];

export function QuestAdvantages() {
  return (
    <section className="bg-muted/30 py-16 lg:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="mb-2 text-sm font-bold uppercase tracking-wider text-primary">Neden Biz?</p>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">Avantajlarımız</h2>
          <p className="mt-3 text-muted-foreground">
            Algorycode Rent ile araç kiralamanın tüm avantajlarından yararlanın.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ADVANTAGES.map(({ Icon, title, description }) => (
            <div
              key={title}
              className="group rounded-2xl border border-border/60 bg-background p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-lg"
            >
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-6 w-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="mb-1 font-semibold text-foreground">{title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
