import type { Transmission } from "@/data/fleet";

export function transmissionLetter(t: Transmission): "A" | "M" {
  return t === "otomatik" ? "A" : "M";
}

export function transmissionLabel(t: Transmission): string {
  return t === "otomatik" ? "Otomatik" : "Manuel";
}
