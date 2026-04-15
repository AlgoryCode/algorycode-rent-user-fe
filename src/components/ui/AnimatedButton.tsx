"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import type { ReactNode } from "react";

const MotionLink = motion(Link);

type Variant = "primary" | "ghost" | "outline";

const base =
  "relative inline-flex items-center justify-center gap-2 rounded-md px-5 py-2.5 text-[13px] font-semibold transition-[box-shadow,background-color,border-color,color,transform] duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-fg shadow-sm hover:brightness-110 hover:shadow-md active:brightness-95",
  ghost:
    "border border-border-subtle/80 bg-transparent text-text transition-colors duration-200 hover:bg-bg-raised/80 dark:hover:bg-white/[0.06]",
  outline:
    "border border-accent/50 text-accent transition-colors duration-200 hover:bg-accent/10",
};

const motionPrimary = {
  whileHover: { scale: 1.01 },
  whileTap: { scale: 0.99 },
  transition: { type: "spring" as const, stiffness: 500, damping: 28 },
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
} & Omit<React.ComponentProps<typeof motion.button>, "children" | "disabled">) {
  const cls = `${base} ${variants[variant]} ${className}`;
  const motionProps = variant === "primary" ? motionPrimary : {};

  if (href) {
    return (
      <MotionLink href={href} className={cls} {...motionProps}>
        <span className="relative z-10">{children}</span>
      </MotionLink>
    );
  }

  return (
    <motion.button type={type} className={cls} disabled={disabled} {...motionProps} {...rest}>
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}
