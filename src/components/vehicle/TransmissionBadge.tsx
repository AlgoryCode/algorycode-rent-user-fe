import type { Transmission } from "@/data/fleet";
import { transmissionLabel } from "@/lib/transmission";

/** Sadece vites metni */
export function TransmissionBadge({
  transmission,
  size = "md",
}: {
  transmission: Transmission;
  size?: "sm" | "md";
}) {
  const sm = size === "sm";

  return (
    <span
      className={`inline-flex items-center rounded-md border border-border-subtle bg-bg-card/90 text-text backdrop-blur-sm ${
        sm ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
      }`}
      title={transmissionLabel(transmission)}
    >
      <span className="pr-0.5">{transmissionLabel(transmission)}</span>
    </span>
  );
}
