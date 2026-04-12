"use client";

import dynamic from "next/dynamic";

const SonnerToaster = dynamic(() => import("sonner").then(mod => ({ default: mod.Toaster })), {
  ssr: false,
});

export function Toaster() {
  return (
    <div suppressHydrationWarning>
      <SonnerToaster
        richColors
        position="top-right"
        closeButton
        toastOptions={{
          classNames: {
            toast: "group border border-border bg-background text-foreground shadow-md",
            description: "text-muted-foreground",
          },
        }}
      />
    </div>
  );
}