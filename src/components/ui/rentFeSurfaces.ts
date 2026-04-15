/**
 * rent-fe ortak yüzeyler: arama çubuğu kartı, detay yan paneli ve açılır paneller aynı dili kullanır.
 */

/** Body’ye portal edilen açılır paneller (ör. tarih popover). Yumuşak cam, difüz gölge, ince ışık çizgisi. */
/** `relative` kullanma: açılır panellerde `absolute`/`fixed` ile çakışıp akışta kalmasına yol açabilir. */
export const rentFloatingDropdownPanelClass = [
  "isolate overflow-hidden rounded-3xl",
  "border border-border-subtle/40",
  "bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.01))] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))]",
  "bg-bg-card/[0.85] dark:bg-bg-card/[0.68]",
  "shadow-[0_36px_80px_-28px_rgba(15,23,42,0.22),0_14px_34px_-20px_rgba(15,23,42,0.16)]",
  "dark:shadow-[0_36px_84px_-28px_rgba(0,0,0,0.52),0_14px_34px_-20px_rgba(0,0,0,0.4)]",
  "backdrop-blur-3xl backdrop-saturate-[1.45]",
  "ring-1 ring-inset ring-black/[0.05] dark:ring-white/[0.075]",
  "before:pointer-events-none before:absolute before:inset-x-7 before:top-0 before:z-10 before:h-px before:rounded-full before:bg-gradient-to-r before:from-transparent before:via-accent/20 before:to-transparent before:content-['']",
].join(" ");

/** Kapalı <select> / tarih tetikleyicisi: yumuşak köşe, hafif cam ve sakin hover. */
export const rentSelectTriggerClass =
  "cursor-pointer rounded-xl border border-border-subtle/45 bg-bg-card/60 text-text shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] backdrop-blur-sm outline-none transition-[border-color,box-shadow,background-color,color,filter] hover:border-accent/28 hover:bg-bg-card/78 focus-visible:border-accent/42 focus-visible:ring-2 focus-visible:ring-accent/20 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]";

/**
 * Sadece ikonlu geri kontrolleri (Geri metinli butonun rent-fe ikon hali).
 * `rentSelectTriggerClass` ile aynı cam / border dili, kare dokunma alanı.
 */
export const rentIconBackButtonClass =
  "inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-border-subtle/45 bg-bg-card/55 text-text shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-sm outline-none transition-[border-color,box-shadow,background-color,color,filter] duration-150 hover:border-accent/22 hover:bg-bg-card/72 hover:text-accent focus-visible:border-accent/40 focus-visible:ring-2 focus-visible:ring-accent/18 active:brightness-95 disabled:pointer-events-none disabled:opacity-40 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]";

/** Arama çubuğu vb. içindeki yumuşak kart kabuğu (kompakt / geniş düzen). */
export const rentSoftSearchShellClass =
  "rounded-2xl border border-border-subtle/30 bg-bg-card/55 shadow-[0_16px_40px_-20px_rgba(15,23,42,0.12)] backdrop-blur-2xl ring-1 ring-inset ring-black/[0.03] dark:bg-bg-card/45 dark:shadow-[0_18px_44px_-18px_rgba(0,0,0,0.4)] dark:ring-white/[0.05]";
