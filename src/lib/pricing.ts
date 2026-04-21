import { bookingExtras } from "@/data/extras";
import { TRY_PER_EUR_REFERENCE } from "@/lib/i18n/config";

export type PriceLine = { label: string; amount: number };

export function computeExtrasTotal(
  selectedIds: string[],
  nights: number,
): { subtotal: number; lines: PriceLine[] } {
  const lines: PriceLine[] = [];
  let subtotal = 0;
  for (const id of selectedIds) {
    const e = bookingExtras.find((x) => x.id === id);
    if (!e) continue;
    if (e.perDay != null) {
      const amt = e.perDay * nights;
      subtotal += amt;
      lines.push({ label: `${e.name} × ${nights} gün`, amount: amt });
    }
    if (e.flat != null) {
      subtotal += e.flat;
      lines.push({ label: e.name, amount: e.flat });
    }
  }
  return { subtotal, lines };
}

export function computeRentalSubtotal(pricePerDay: number, nights: number): number {
  return pricePerDay * nights;
}

/** Alış ve iade ülkesi farklıysa tek yön / sınır ötesi demo ek ücreti */
export function crossBorderOneWaySurcharge(
  pickupCountryCode: string,
  returnCountryCode: string,
): number {
  if (!pickupCountryCode || !returnCountryCode) return 0;
  if (pickupCountryCode === returnCountryCode) return 0;
  return 4_500;
}

function resolveEurToTryRate(): number {
  const raw = process.env.NEXT_PUBLIC_EUR_TO_TRY?.trim();
  if (!raw) return TRY_PER_EUR_REFERENCE;
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : TRY_PER_EUR_REFERENCE;
}

/** Sunucunun EUR cinsinden verdiği tutarları vitrin TRY fiyatına çevirir. */
export function eurToTry(eur: number, ratePerEur = resolveEurToTryRate()): number {
  if (!Number.isFinite(eur) || eur <= 0) return 0;
  return Math.round(eur * ratePerEur);
}

/** Araç yurt dışına çıkarılacaksa (müşteri beyanı) uygulanan demo ek ücret */
export function vehicleAbroadUsageSurcharge(planTakeVehicleAbroad: boolean): number {
  return planTakeVehicleAbroad ? 6_500 : 0;
}
