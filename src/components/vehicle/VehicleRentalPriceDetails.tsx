import { formatTryDecimal } from "@/data/fleet";

type Props = {
  pricePerDay: number;
  /** Geçerli aralık yoksa null — takvim seçimine göre güncellenir */
  nights: number | null;
  className?: string;
};

export function VehicleRentalPriceDetails({ pricePerDay, nights, className = "" }: Props) {
  const hasTotal = nights != null && nights > 0;
  const total = hasTotal ? pricePerDay * nights : null;

  return (
    <div
      className={`rounded-2xl border border-border-subtle/80 bg-bg-card/55 p-4 shadow-sm backdrop-blur-sm sm:p-5 ${className}`}
    >
      <h3 className="font-display text-base font-semibold tracking-tight text-text sm:text-lg">
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
            {hasTotal && total != null ? formatTryDecimal(total) : "—"}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="font-medium text-text">Toplam Fiyat</span>
          <span className="shrink-0 text-right font-semibold tabular-nums text-text">
            {hasTotal && total != null ? formatTryDecimal(total) : "—"}
          </span>
        </div>
        {hasTotal && nights != null && total != null && (
          <p className="text-[12px] tabular-nums text-text-muted">
            {formatTryDecimal(pricePerDay)} x {nights} Gün
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
