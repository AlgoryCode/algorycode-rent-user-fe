"use client";

import { HeroRentalSearch } from "@/components/sections/HeroRentalSearch";
import { HeroWelcomeHeadline } from "@/components/sections/HeroWelcomeHeadline";
import type { HeroHandoverOption } from "@/lib/handoverLocations";

export type HeroProps = {
  pickupHandoverOptions: HeroHandoverOption[];
  returnHandoverOptions: HeroHandoverOption[];
};

export function Hero({ pickupHandoverOptions, returnHandoverOptions }: HeroProps) {
  return (
    <section className="hero-corporate-aura relative z-30 flex min-h-[calc(100svh-var(--header-h))] flex-col overflow-x-hidden border-b border-border-subtle pt-[var(--header-h)]">
      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-[min(100%,96rem)] flex-1 flex-col items-center justify-start gap-3 px-3 pt-2 pb-5 min-[380px]:gap-4 min-[380px]:px-4 min-[380px]:pt-3 min-[380px]:pb-6 sm:justify-center sm:gap-7 sm:px-5 sm:pt-4 sm:pb-8 md:gap-9 md:px-6 md:pt-6 md:pb-10 lg:gap-10 lg:pt-7 lg:pb-12 xl:gap-11 xl:px-8 xl:pt-9 xl:pb-14 2xl:gap-12 2xl:pt-10 2xl:pb-16">
        <HeroWelcomeHeadline className="w-full max-w-full shrink-0" />
        <HeroRentalSearch
          className="mx-auto w-full max-w-full shrink-0 lg:mx-0 lg:max-w-none lg:w-max"
          pickupHandoverOptions={pickupHandoverOptions}
          returnHandoverOptions={returnHandoverOptions}
        />
      </div>
    </section>
  );
}
