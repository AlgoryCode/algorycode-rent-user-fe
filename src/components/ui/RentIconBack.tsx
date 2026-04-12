"use client";

import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import { rentIconBackButtonClass } from "@/components/ui/rentFeSurfaces";

function ChevronLeftIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`size-[1.125rem] shrink-0 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

type Common = {
  /** Ekran okuyucu; `title` verilmezse ipucu olarak da kullanılır */
  "aria-label": string;
  title?: string;
  className?: string;
};

export function RentIconBackButton({
  className = "",
  "aria-label": ariaLabel,
  title,
  ...props
}: Common &
  Omit<ComponentPropsWithoutRef<"button">, "className" | "children" | "type" | "aria-label">) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={title ?? ariaLabel}
      className={`${rentIconBackButtonClass} ${className}`.trim()}
      {...props}
    >
      <ChevronLeftIcon />
    </button>
  );
}

export function RentIconBackLink({
  href,
  className = "",
  "aria-label": ariaLabel,
  title,
  ...rest
}: Common & Omit<ComponentPropsWithoutRef<typeof Link>, "className" | "children" | "aria-label">) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      title={title ?? ariaLabel}
      className={`${rentIconBackButtonClass} ${className}`.trim()}
      {...rest}
    >
      <ChevronLeftIcon />
    </Link>
  );
}
