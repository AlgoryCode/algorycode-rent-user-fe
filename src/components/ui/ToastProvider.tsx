"use client";

import { toast } from "sonner";

export function useToast() {
  return {
    showToast: (message: string, type: "success" | "error" | "info" = "info") => {
      if (type === "success") {
        toast.success(message);
      } else if (type === "error") {
        toast.error(message);
      } else {
        toast(message);
      }
    },
  };
}
