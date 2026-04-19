import { fromTryAmount, type CurrencyCode } from "@/lib/i18n/config";

export type Transmission = "otomatik" | "manuel";
export type FuelType = "benzin" | "dizel" | "hibrit" | "elektrik";

/** Dashboard’dan araca bağlanan handover satırı (rent API `vehicles` DTO). */
export type VehicleHandoverBookingOption = {
  id: string;
  name: string;
  /** Liste satırında +X € (RETURN tarafında genelde handover kaydından). */
  surchargeEur?: number;
};

export type FleetVehicle = {
  id: string;
  name: string;
  brand: string;
  category: string;
  pricePerDay: number;
  specs: string[];
  transmission: Transmission;
  seats: number;
  fuel: FuelType;
  year: number;
  engine: string;
  powerKw: number;
  luggage: number;
  co2: string;
  image: string;
  gallery: string[];
  imageAlt: string;
  badge?: string;
  description: string;
  highlights: string[];
  included: string[];
  notIncluded: string[];
  /** Yaklaşık depozito (gösterim için) */
  depositHint: number;
  /** Filoda araç konumu (demo metin) */
  garageLocation?: string;
  /** Başlangıç kiralama konumu */
  pickupLocationId?: string;
  pickupLocationLabel?: string;
  /** rent-service handover UUID */
  defaultPickupHandoverLocationId?: string;
  defaultReturnHandoverLocationId?: string;
  defaultPickupHandoverName?: string;
  defaultReturnHandoverName?: string;
  /**
   * Tek alış noktası (dashboard ataması). Doluysa rezervasyon akışında yalnızca bu UUID seçilir.
   * rent-service: `pickupHandoverLocation` gövdesi veya `returnHandoverLocations` ile birlikte varsayılan alış.
   */
  pickupHandoverForBooking?: VehicleHandoverBookingOption;
  /**
   * Bu araca izin verilen teslim noktaları. Doluysa rezervasyonda RETURN listesi buna indirgenir.
   * rent-service: `returnHandoverLocations` (veya `assignedReturnHandoverLocations`).
   */
  returnHandoversForBooking?: VehicleHandoverBookingOption[];
  /** Araç özel seçenek şablonları (rent API) */
  rentOptionDefinitions?: {
    id: string;
    title: string;
    description?: string;
    price: number;
    active?: boolean;
  }[];
};

function intlLocaleForCurrency(c: CurrencyCode): string {
  switch (c) {
    case "TRY":
      return "tr-TR";
    case "EUR":
      return "de-DE";
    case "GBP":
      return "en-GB";
    case "CHF":
      return "de-CH";
    case "SAR":
      return "ar-SA";
    default:
      return "en-US";
  }
}

/** `amountTry`: veri kaynağı TRY; `currency` seçimine göre gösterge kur ile çevrilir. */
export function formatMoney(amountTry: number, currency: CurrencyCode): string {
  const v = fromTryAmount(amountTry, currency);
  return new Intl.NumberFormat(intlLocaleForCurrency(currency), {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(v);
}

export function formatMoneyDecimal(amountTry: number, currency: CurrencyCode): string {
  const v = fromTryAmount(amountTry, currency);
  return new Intl.NumberFormat(intlLocaleForCurrency(currency), {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

export function formatTry(n: number) {
  return formatMoney(n, "TRY");
}

/** Liste / özet satırları için ondalıklı para metni (varsayılan TRY). */
export function formatTryDecimal(n: number) {
  return formatMoneyDecimal(n, "TRY");
}
