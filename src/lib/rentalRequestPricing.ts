import { computeRentalSubtotal } from "@/lib/pricing";

/** rent-service `RentalRequestPricedLineType` ile aynı isimler (denetim / istemci özeti). */
export const RENTAL_PRICED_LINE_TYPES = {
  BASE_RENTAL: "BASE_RENTAL",
  HANDOVER_SURCHARGE: "HANDOVER_SURCHARGE",
  ABROAD_USAGE: "ABROAD_USAGE",
  RESERVATION_EXTRA: "RESERVATION_EXTRA",
  VEHICLE_OPTION: "VEHICLE_OPTION",
  CUSTOM_LINE: "CUSTOM_LINE",
} as const;

/** `CreateRentalRequestFormRequest.pricingLines` gövdesi (Jackson `BigDecimal` ↔ JSON sayı). */
export type RentalPricedLinePayload = {
  lineType: string;
  quantity: number;
  unitAmount: number;
  lineAmount: number;
  currency: string;
  title: string;
  description?: string | null;
  metadata?: string | null;
};

export type BuildRentalRequestPricingLinesInput = {
  nights: number | null;
  vehiclePricePerDayTry: number;
  differentDropoff: boolean;
  /** Sihirbazdaki teslim ek ücreti (TRY). */
  differentDropoffSurchargeTry: number;
  /** Seçili teslim satırı EUR (metadata); yoksa null. */
  handoverSurchargeEur: number | null;
  abroadUsageFeeTry: number;
  planVehicleAbroad: boolean;
  reservationExtras: { templateId: string; title: string; priceTry: number }[];
  vehicleOptions: { definitionId: string; title: string; priceTry: number }[];
};

/**
 * Rezervasyon gönderiminde istemci özeti: sunucu satırları yeniden hesaplar; bu dizi denetim ve hizalama içindir.
 */
export function buildRentalRequestPricingLines(input: BuildRentalRequestPricingLinesInput): RentalPricedLinePayload[] {
  const lines: RentalPricedLinePayload[] = [];
  const { nights, vehiclePricePerDayTry } = input;

  if (nights != null && nights > 0 && vehiclePricePerDayTry > 0) {
    const lineAmount = computeRentalSubtotal(vehiclePricePerDayTry, nights);
    lines.push({
      lineType: RENTAL_PRICED_LINE_TYPES.BASE_RENTAL,
      quantity: nights,
      unitAmount: vehiclePricePerDayTry,
      lineAmount,
      currency: "TRY",
      title: "Günlük kiralama",
      description: null,
      metadata: JSON.stringify({ nights, dailyTry: vehiclePricePerDayTry }),
    });
  }

  if (input.differentDropoff && input.differentDropoffSurchargeTry > 0) {
    lines.push({
      lineType: RENTAL_PRICED_LINE_TYPES.HANDOVER_SURCHARGE,
      quantity: 1,
      unitAmount: input.differentDropoffSurchargeTry,
      lineAmount: input.differentDropoffSurchargeTry,
      currency: "TRY",
      title: "Teslim / nokta ek ücreti",
      description: null,
      metadata:
        input.handoverSurchargeEur != null && Number.isFinite(input.handoverSurchargeEur) && input.handoverSurchargeEur > 0
          ? JSON.stringify({ returnSurchargeEur: input.handoverSurchargeEur })
          : null,
    });
  }

  if (input.planVehicleAbroad && input.abroadUsageFeeTry > 0) {
    lines.push({
      lineType: RENTAL_PRICED_LINE_TYPES.ABROAD_USAGE,
      quantity: 1,
      unitAmount: input.abroadUsageFeeTry,
      lineAmount: input.abroadUsageFeeTry,
      currency: "TRY",
      title: "Yurt dışı kullanım (yeşil sigorta)",
      description: null,
      metadata: JSON.stringify({ outsideCountryTravel: true }),
    });
  }

  for (const x of input.reservationExtras) {
    lines.push({
      lineType: RENTAL_PRICED_LINE_TYPES.RESERVATION_EXTRA,
      quantity: 1,
      unitAmount: x.priceTry,
      lineAmount: x.priceTry,
      currency: "TRY",
      title: x.title,
      description: null,
      metadata: JSON.stringify({ reservationExtraTemplateId: x.templateId }),
    });
  }

  for (const x of input.vehicleOptions) {
    lines.push({
      lineType: RENTAL_PRICED_LINE_TYPES.VEHICLE_OPTION,
      quantity: 1,
      unitAmount: x.priceTry,
      lineAmount: x.priceTry,
      currency: "TRY",
      title: x.title,
      description: null,
      metadata: JSON.stringify({ vehicleOptionDefinitionId: x.definitionId }),
    });
  }

  return lines;
}
