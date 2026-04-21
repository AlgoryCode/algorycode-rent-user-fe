/**
 * Portal / açılır paneller ve arama yüzeyleri (açık tema — tasarım token’ları).
 */

/** Body’ye portal edilen açılır paneller (ör. tarih popover). */
export const rentFloatingDropdownPanelClass = [
  "isolate overflow-hidden rounded-3xl",
  "border border-border-subtle/80 bg-bg-card shadow-[0_28px_90px_-28px_rgba(15,23,42,0.12),0_12px_32px_-16px_rgba(15,23,42,0.08)]",
  "backdrop-blur-3xl backdrop-saturate-[1.45]",
  "ring-1 ring-inset ring-black/[0.04]",
  "before:pointer-events-none before:absolute before:inset-x-7 before:top-0 before:z-10 before:h-px before:rounded-full before:bg-gradient-to-r before:from-transparent before:via-accent/20 before:to-transparent before:content-['']",
].join(" ");

/** Kapalı <select> / tarih tetikleyicisi */
export const rentSelectTriggerClass =
  "cursor-pointer rounded-xl border border-border-subtle bg-bg-card text-text shadow-sm outline-none transition-[border-color,box-shadow,background-color,color,filter] hover:border-border-subtle hover:bg-bg-raised focus-visible:border-accent/40 focus-visible:ring-2 focus-visible:ring-accent/15";

/** İkonlu geri kontrolleri */
export const rentIconBackButtonClass =
  "inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-bg-card text-text shadow-sm outline-none transition-[border-color,box-shadow,background-color,color,filter] duration-150 hover:border-border-subtle hover:bg-bg-raised hover:text-accent focus-visible:ring-2 focus-visible:ring-accent/15 active:brightness-95 disabled:pointer-events-none disabled:opacity-40";

/** Arama çubuğu vb. içindeki kart kabuğu */
export const rentSoftSearchShellClass =
  "rounded-2xl border border-border-subtle bg-bg-card shadow-[0_1px_3px_rgba(15,23,42,0.06),0_8px_24px_-12px_rgba(15,23,42,0.08)] ring-1 ring-inset ring-black/[0.03]";
