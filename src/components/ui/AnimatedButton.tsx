"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type Variant = "primary" | "ghost" | "outline";

const base =
  "relative inline-flex items-center justify-center gap-2 rounded-md px-5 py-2.5 text-[13px] font-semibold transition-[box-shadow,background-color,border-color,color,transform] duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-btn-solid active:scale-[0.99]";

const variants: Record<Variant, string> = {
  primary:
    "bg-btn-solid text-btn-solid-fg shadow-sm hover:brightness-110 hover:shadow-md active:brightness-95",
  ghost:
    "border border-border-subtle/80 bg-transparent text-text transition-colors duration-200 hover:bg-bg-raised/80",
  outline:
    "border border-accent/50 text-accent transition-colors duration-200 hover:bg-accent/10",
};

export function AnimatedButton({
  children,
  variant = "primary",
  className = "",
  href,
  type = "button",
  disabled,
  ...rest
}: {
  children: ReactNode;
  variant?: Variant;
  className?: string;
  href?: string;
  type?: "button" | "submit";
  disabled?: boolean;
} & Omit<React.ComponentPropsWithoutRef<"button">, "children" | "type" | "disabled">) {
  const cls = `${base} ${variants[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={cls}>
        <span className="relative z-10">{children}</span>
      </Link>
    );
  }

  return (
    <button type={type} className={cls} disabled={disabled} {...rest}>
      <span className="relative z-10">{children}</span>
    </button>
  );
}
