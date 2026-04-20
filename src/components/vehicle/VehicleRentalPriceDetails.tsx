"use client";

import { useI18n } from "@/components/i18n/LocaleProvider";

type Props = {
  pricePerDay: number;
  /** Geçerli aralık yoksa null — takvim seçimine göre güncellenir */
  nights: number | null;
  className?: string;
  /** `plain`: üst kart içinde gömülü, çerçevesiz */
  variant?: "card" | "plain";
};

export function VehicleRentalPriceDetails({
  pricePerDay,
  nights,
  className = "",
  variant = "card",
}: Props) {
  const { formatPriceDecimal } = useI18n();
  const hasTotal = nights != null && nights > 0;
  const total = hasTotal ? pricePerDay * nights : null;

  const shell =
    variant === "plain"
      ? "border-0 bg-transparent p-0 shadow-none"
      : "border-2 border-border-subtle bg-bg-deep/30 p-4 shadow-inner sm:p-5 dark:bg-black/20";

  return (
    <div className={`${shell} ${className}`}>
      <h3 className="text-base font-semibold tracking-tight text-text sm:text-lg">
        Fiyat Ayrıntıları
      </h3>

      {!hasTotal && (
        <p className="mt-2 text-[12px] leading-relaxed text-text-muted">
          Takvimden alış ve teslim günlerini seçtiğinizde toplam tutar burada güncellenir.
        </p>
      )}

      <div className="mt-3 space-y-2.5 border-t border-border-subtle/70 pt-3">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="text-text-muted">Kiralama hizmeti</span>
          <span className="shrink-0 text-right font-semibold tabular-nums text-text">
            {hasTotal && total != null ? formatPriceDecimal(total) : "—"}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="font-medium text-text">Toplam Fiyat</span>
          <span className="shrink-0 text-right font-semibold tabular-nums text-text">
            {hasTotal && total != null ? formatPriceDecimal(total) : "—"}
          </span>
        </div>
        {hasTotal && nights != null && total != null && (
          <p className="text-[12px] tabular-nums text-text-muted">
            {formatPriceDecimal(pricePerDay)} x {nights} Gün
          </p>
        )}
      </div>

      <p className="mt-4 border-t border-border-subtle/70 pt-3 text-[11px] leading-relaxed text-text-muted sm:text-[12px]">
        Lütfen araç teslimatında kendi adınıza ait kredi kartınızı, kimliğinizi ve en az 2 yıl önce
        alınmış ehliyetinizi yanınızda bulundurunuz.
      </p>
    </div>
  );
}
