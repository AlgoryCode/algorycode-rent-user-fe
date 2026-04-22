"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock, Tag } from "lucide-react";
const CAMPAIGNS = [
  {
    id: "summer",
    title: "Yaz Tatili Fırsatı",
    subtitle: "Sahil rotalarında %35'e varan indirim",
    code: "YAZ35",
    deadline: "30 Eylül'e kadar",
    image: "/quest-campaign-summer.jpg",
    accent: "Tatil",
  },
  {
    id: "airport",
    title: "Havalimanı Teslimatı",
    subtitle: "Tüm havalimanı şubelerinde teslim ücretsiz",
    code: "AIRFREE",
    deadline: "Süresiz",
    image: "/quest-campaign-airport.jpg",
    accent: "Ücretsiz",
  },
  {
    id: "corporate",
    title: "Kurumsal Üyelik",
    subtitle: "Şirketinize özel uzun dönem avantajları",
    code: "BIZ",
    deadline: "Yıl boyu",
    image: "/quest-campaign-corporate.jpg",
    accent: "Kurumsal",
  },
];

export function QuestCampaigns({ exploreHref = "/araclar" }: { exploreHref?: string }) {
  return (
    <section className="container mx-auto px-4 py-16 lg:py-24">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-primary">Fırsatlar</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">Kampanyalar</h2>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Sezona, rotaya ve ihtiyaca özel hazırladığımız avantajlı kiralama paketlerini keşfet.
          </p>
        </div>
        <Link
          href={exploreHref}
          className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
        >
          Tümünü gör
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {CAMPAIGNS.map((c) => (
          <article
            key={c.id}
            className="group relative overflow-hidden rounded-3xl border border-border/60 bg-card transition-all duration-500 ease-smooth hover:-translate-y-1"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image
                src={c.image}
                alt={c.title}
                width={800}
                height={600}
                className="h-full w-full object-cover transition-transform duration-700 ease-smooth group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/30 to-transparent" />
              <div className="absolute left-4 top-4 rounded-full bg-card px-3 py-0.5 text-xs font-semibold text-foreground">
                {c.accent}
              </div>
              <div className="absolute inset-x-0 bottom-0 p-6 text-background">
                <h3 className="text-2xl font-extrabold tracking-tight">{c.title}</h3>
                <p className="mt-1.5 text-sm leading-snug text-background/85">{c.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 p-5">
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-primary" />
                  Kod:{" "}
                  <code className="rounded bg-muted px-2 py-0.5 font-bold text-foreground">{c.code}</code>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  {c.deadline}
                </span>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-primary transition-transform duration-300 group-hover:translate-x-1" />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
