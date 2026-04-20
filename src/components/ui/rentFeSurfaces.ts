/**
 * rent-fe ile uyumlu yüzeyler: açık temada beyaz kart + nötr border; koyu temada mevcut cam/navy dil.
 */

/** Body’ye portal edilen açılır paneller (ör. tarih popover). */
export const rentFloatingDropdownPanelClass = [
  "isolate overflow-hidden rounded-3xl",
  "border border-neutral-200/90 bg-white shadow-[0_28px_90px_-28px_rgba(15,23,42,0.12),0_12px_32px_-16px_rgba(15,23,42,0.08)]",
  "dark:border-border-subtle/40 dark:bg-bg-card/[0.72]",
  "dark:shadow-[0_36px_84px_-28px_rgba(0,0,0,0.52),0_14px_34px_-20px_rgba(0,0,0,0.4)]",
  "backdrop-blur-3xl backdrop-saturate-[1.45] dark:backdrop-blur-3xl",
  "ring-1 ring-inset ring-black/[0.04] dark:ring-white/[0.075]",
  "before:pointer-events-none before:absolute before:inset-x-7 before:top-0 before:z-10 before:h-px before:rounded-full before:bg-gradient-to-r before:from-transparent before:via-accent/20 before:to-transparent before:content-['']",
].join(" ");

/** Kapalı <select> / tarih tetikleyicisi */
export const rentSelectTriggerClass =
  "cursor-pointer rounded-xl border border-neutral-200/90 bg-white text-text shadow-sm outline-none transition-[border-color,box-shadow,background-color,color,filter] hover:border-neutral-300 hover:bg-neutral-50/80 focus-visible:border-neutral-400 focus-visible:ring-2 focus-visible:ring-neutral-900/10 dark:border-border-subtle/45 dark:bg-bg-card/60 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] dark:hover:border-accent/28 dark:hover:bg-bg-card/78 dark:focus-visible:border-accent/42 dark:focus-visible:ring-accent/20";

/** İkonlu geri kontrolleri */
export const rentIconBackButtonClass =
  "inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-neutral-200/90 bg-white text-text shadow-sm outline-none transition-[border-color,box-shadow,background-color,color,filter] duration-150 hover:border-neutral-300 hover:bg-neutral-50 hover:text-text focus-visible:ring-2 focus-visible:ring-neutral-900/10 active:brightness-95 disabled:pointer-events-none disabled:opacity-40 dark:border-border-subtle/45 dark:bg-bg-card/55 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] dark:hover:border-accent/22 dark:hover:bg-bg-card/72 dark:hover:text-accent dark:focus-visible:ring-accent/18";

/** Arama çubuğu vb. içindeki kart kabuğu */
export const rentSoftSearchShellClass =
  "rounded-2xl border border-neutral-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06),0_8px_24px_-12px_rgba(15,23,42,0.08)] ring-1 ring-inset ring-black/[0.03] dark:border-border-subtle/30 dark:bg-bg-card/45 dark:shadow-[0_18px_44px_-18px_rgba(0,0,0,0.4)] dark:ring-white/[0.05]";
