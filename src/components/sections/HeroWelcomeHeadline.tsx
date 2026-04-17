"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

/** En uzun ifade — yerleşim kayması olmasın diye ölçü */
const ROTATE_WORDS = ["Güvenilir", "Hızlı", "Uygun fiyatlı"] as const;
const ROTATE_INTERVAL_MS = 2600;
const easeOut = [0.22, 1, 0.36, 1] as const;

/** Sadece breakpoint adımları — vw yok; mobil taban bir kademe daha büyük. */
const headlineSteppedSize =
  "text-3xl min-[380px]:text-4xl sm:text-5xl md:text-5xl lg:text-6xl xl:text-6xl 2xl:text-7xl font-bold tracking-tight";
const headlineLeadingStepped =
  "leading-[1.1] min-[380px]:leading-[1.12] sm:leading-[1.14] md:leading-[1.16] lg:leading-[1.2] xl:leading-[1.22] 2xl:leading-[1.24]";
const headlineBlock = `${headlineSteppedSize} leading-[1.1]`;
const staticNavyTaglineClass = `${headlineSteppedSize} ${headlineLeadingStepped} text-text`;

/** Navbar “Rent” ile aynı: `text-steel` */
const wordClass = `${headlineBlock} text-steel`;
/** Tema gövde metni — zemine göre kontrast */
const staticNavyClass = `${headlineBlock} text-text`;

const headlineGapX =
  "gap-x-1 min-[380px]:gap-x-2 sm:gap-x-2.5 md:gap-x-3 lg:gap-x-3.5 xl:gap-x-4";

type Props = {
  className?: string;
};

export function HeroWelcomeHeadline({ className = "" }: Props) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    const id = window.setInterval(
      () => setIndex((n) => (n + 1) % ROTATE_WORDS.length),
      ROTATE_INTERVAL_MS,
    );
    return () => window.clearInterval(id);
  }, [reduceMotion]);

  const word = ROTATE_WORDS[reduceMotion ? 0 : index];
  const longest = ROTATE_WORDS.reduce((a, b) => (a.length >= b.length ? a : b));

  return (
    <div className={`mx-auto w-full max-w-[min(100%,56rem)] xl:max-w-[64rem] 2xl:max-w-[72rem] ${className}`}>
      <h1 className="m-0 p-0 font-normal">
        <span className="sr-only">Araç kiralama. En {word} Araç kiralamanın tam adresi!</span>
        <div className="mx-auto flex w-full justify-center overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div
            className={`flex max-w-full flex-row flex-wrap items-baseline justify-center ${headlineGapX} gap-y-1 whitespace-normal text-center min-[380px]:gap-y-1.5 sm:gap-y-1.5 md:gap-y-2`}
            aria-hidden
          >
            <span className={`${staticNavyClass} shrink-0 leading-none tracking-tight`}>En</span>
            <span
              className={`inline-flex max-w-full flex-row flex-wrap items-baseline justify-center ${headlineGapX} gap-y-1 whitespace-normal`}
            >
              <span className="relative inline-grid shrink-0 justify-items-center leading-[1.1]">
                <span className={`invisible col-start-1 row-start-1 ${wordClass}`} aria-hidden>
                  {longest}
                </span>
                <span className="absolute inset-0 overflow-hidden">
                  <AnimatePresence initial={false} mode="wait">
                    <motion.span
                      key={word}
                      initial={{ y: "100%" }}
                      animate={{ y: 0 }}
                      exit={{ y: "-100%" }}
                      transition={{
                        duration: reduceMotion ? 0 : 0.44,
                        ease: easeOut,
                      }}
                      className={`absolute left-0 right-0 top-0 block w-full text-center ${wordClass}`}
                    >
                      {word}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </span>
              <span
                className={`${staticNavyTaglineClass} min-w-0 max-w-full basis-full font-semibold text-balance max-md:px-0.5 sm:basis-auto max-[359px]:font-medium`}
              >
                Araç kiralamanın tam adresi!
              </span>
            </span>
          </div>
        </div>
      </h1>
    </div>
  );
}
