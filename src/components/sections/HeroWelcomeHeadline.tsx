"use client";

const headlineSteppedSize =
  "text-3xl min-[380px]:text-4xl sm:text-5xl md:text-5xl lg:text-6xl xl:text-6xl 2xl:text-7xl font-bold tracking-tight";
const headlineLeadingStepped =
  "leading-[1.1] min-[380px]:leading-[1.12] sm:leading-[1.14] md:leading-[1.16] lg:leading-[1.2] xl:leading-[1.22] 2xl:leading-[1.24]";

type Props = {
  className?: string;
  /** `pageHero`: ana sayfa split hero (Index benzeri). */
  variant?: "center" | "pageHero";
};

export function HeroWelcomeHeadline({ className = "", variant = "center" }: Props) {
  if (variant === "pageHero") {
    return (
      <div className={`max-w-2xl ${className}`}>
        <h1 className="m-0 p-0 text-4xl font-extrabold tracking-tight text-text md:text-5xl lg:text-6xl leading-[1.05]">
          En ucuz fiyatlarla
          <br />
          <span className="text-navy-hero">araç kiralama</span>
        </h1>
      </div>
    );
  }

  return (
    <div className={`mx-auto w-full max-w-[min(100%,56rem)] xl:max-w-[64rem] 2xl:max-w-[72rem] ${className}`}>
      <h1
        className={`m-0 max-w-full p-0 text-center text-balance ${headlineSteppedSize} ${headlineLeadingStepped} text-text`}
      >
        Araç kiralamanın <span className="text-navy-hero">en güvenilir</span> adresi!
      </h1>
    </div>
  );
}
