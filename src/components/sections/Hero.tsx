"use client";

import Image from "next/image";
import { HeroRentalSearch } from "@/components/sections/HeroRentalSearch";
import type { HeroHandoverOption } from "@/lib/handoverLocations";

export type HeroProps = {
  pickupHandoverOptions: HeroHandoverOption[];
  returnHandoverOptions: HeroHandoverOption[];
};

export function Hero({ pickupHandoverOptions, returnHandoverOptions }: HeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-border/60" style={{ background: "var(--hero-gradient)" }}>
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 md:block">
        <Image
          src="/quest-hero-car.jpg"
          alt="Sahil yolunda araç kiralama"
          fill
          priority
          className="object-cover"
          sizes="(max-width: 768px) 0vw, 50vw"
        />
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(90deg, hsl(var(--sh-background)) 0%, transparent 40%)",
          }}
          aria-hidden
        />
      </div>

      <div className="container relative mx-auto px-4 py-12 lg:py-20">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground md:text-5xl lg:text-6xl">
            En Ucuz Fiyatlarla
            <br />
            Araç Kiralama
          </h1>
          <p className="mt-4 max-w-md text-lg text-muted-foreground">
            Türkiye&apos;nin her noktasında, dakikalar içinde aracını kirala.
          </p>
        </div>

        <div className="mt-10 max-w-6xl lg:mt-14">
          <HeroRentalSearch
            pageHeroEmbed
            className="mx-0 w-full max-w-full"
            pickupHandoverOptions={pickupHandoverOptions}
            returnHandoverOptions={returnHandoverOptions}
          />
        </div>
      </div>
    </section>
  );
}
