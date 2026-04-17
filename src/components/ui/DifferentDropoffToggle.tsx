"use client";

type Props = {
  checked: boolean;
  onChange: (v: boolean) => void;
  /** Tek nokta vb. durumlarda kapatılır */
  disabled?: boolean;
  className?: string;
  /** Örn. ülke farkı ek ücreti; ana metnin altında parantez içinde */
  parenthetical?: string;
};

export function DifferentDropoffToggle({
  checked,
  onChange,
  disabled = false,
  className = "",
  parenthetical,
}: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onChange(!checked);
      }}
      className={`inline-flex w-fit max-w-full select-none items-center justify-start gap-2.5 rounded-xl border px-3 py-2.5 text-left outline-none transition-[border-color,background-color,box-shadow,transform] focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-[0.99] dark:focus-visible:ring-offset-bg-card sm:gap-3 sm:px-4 sm:py-3 ${
        disabled
          ? "cursor-not-allowed border-border-subtle bg-bg-raised/30 opacity-55"
          : checked
            ? "border-accent/45 bg-accent/[0.11] shadow-sm shadow-accent/10 dark:border-accent/40 dark:bg-accent/14"
            : "border-neutral-200/90 bg-neutral-50/90 hover:border-neutral-300 hover:bg-white dark:border-white/12 dark:bg-bg-raised/35 dark:hover:border-white/20 dark:hover:bg-bg-raised/50"
      } ${className}`}
    >
      <span className="min-w-0 shrink text-left">
        <span className="block text-sm font-medium leading-snug text-neutral-800 dark:text-text">
          Aracı farklı bir yere bırakacağım
        </span>
        {parenthetical ? (
          <span className="mt-0.5 block text-xs font-normal leading-snug text-neutral-600 dark:text-text-muted">
            ({parenthetical})
          </span>
        ) : null}
      </span>
      <span
        aria-hidden
        className={`relative inline-block h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ease-out ${
          checked ? "bg-accent" : "bg-neutral-300 dark:bg-white/22"
        }`}
      >
        <span
          className={`pointer-events-none absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-md ring-1 ring-black/5 transition-transform duration-200 ease-out will-change-transform dark:ring-white/10 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}
