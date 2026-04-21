/**
 * Portal / açılır paneller ve arama yüzeyleri (açık tema — tasarım token’ları).
 */

/** Body’ye portal edilen açılır paneller (ör. tarih popover, RentSelect). — Beyaz, sade; ekstra blur/akcent çizgisi yok. */
export const rentFloatingDropdownPanelClass = [
  "isolate overflow-hidden rounded-xl",
  "border border-neutral-200/90 bg-white shadow-md",
  "ring-1 ring-black/[0.04]",
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
