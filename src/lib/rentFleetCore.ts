import type { FleetVehicle, VehicleHandoverBookingOption } from "@/data/fleet";
import { getFirstLocationByCountryCode, pickupLocations } from "@/data/locations";
import { TRY_PER_EUR_REFERENCE } from "@/lib/i18n/config";
import { parseFeFleetSnapshot, readFeFleetSnapshotFromVehicleDto } from "@/lib/rentReadModel";

export type RentVehicleDto = {
  id?: unknown;
  plate?: unknown;
  /** rent-service jsonb vitrin paketi — doluysa `mapRentVehicleToFleet` atlanır. */
  feFleetSnapshot?: unknown;
  brand?: unknown;
  model?: unknown;
  year?: unknown;
  rentalDailyPrice?: unknown;
  /** Panel `EUR` gönderirse günlük fiyat EUR yorumlanır; yoksa `countryCode !== TR` iken EUR varsayılır. */
  rentalDailyCurrency?: unknown;
  images?: unknown;
  maintenance?: unknown;
  external?: unknown;
  engine?: unknown;
  seats?: unknown;
  luggage?: unknown;
  countryCode?: unknown;
  locationLabel?: unknown;
  pickupLocationLabel?: unknown;
  cityName?: unknown;
  defaultPickupHandoverLocation?: unknown;
  defaultReturnHandoverLocation?: unknown;
  pickupHandoverLocation?: unknown;
  pickupHandover?: unknown;
  returnHandoverLocations?: unknown;
  assignedReturnHandoverLocations?: unknown;
  optionDefinitions?: unknown;
};

function pickupSlugFromHandoverUuid(uuid: string | undefined): string | undefined {
  const t = String(uuid ?? "").trim();
  if (!t) return undefined;
  for (const l of pickupLocations) {
    if (l.rentPickupHandoverId === t) return l.id;
  }
  return undefined;
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function handoverId(ref: unknown): string | undefined {
  if (ref == null || typeof ref !== "object") return undefined;
  const id = asString((ref as Record<string, unknown>).id).trim();
  return id || undefined;
}

function handoverName(ref: unknown): string | undefined {
  if (ref == null || typeof ref !== "object") return undefined;
  const n = asString((ref as Record<string, unknown>).name).trim();
  return n || undefined;
}

function asNumber(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Rent API günlük fiyatı TRY iç modeline (fiyatlar TRY, vitrin EUR çevirimi `formatPrice` ile). */
function rentVehicleDailyPriceTry(raw: RentVehicleDto): number {
  const n = Math.max(0, asNumber(raw.rentalDailyPrice, 0));
  if (n <= 0) return 0;
  const cur = asString((raw as Record<string, unknown>).rentalDailyCurrency).toUpperCase();
  if (cur === "EUR") return Math.round(n * TRY_PER_EUR_REFERENCE);
  const cc = asString(raw.countryCode).toUpperCase();
  if (cc && cc !== "TR") return Math.round(n * TRY_PER_EUR_REFERENCE);
  return n;
}

export function parseSurchargeEur(o: Record<string, unknown>): number | undefined {
  const candidates: unknown[] = [
    o.surchargeEur,
    o.returnSurchargeEur,
    o.dropoffSurchargeEur,
    o.deliverySurchargeEur,
    (o as { surcharge_eur?: unknown }).surcharge_eur,
  ];
  for (const sur of candidates) {
    const surNum =
      typeof sur === "number" && Number.isFinite(sur)
        ? sur
        : typeof sur === "string"
          ? Number(sur.replace(",", "."))
          : NaN;
    if (typeof surNum === "number" && Number.isFinite(surNum) && surNum >= 0) return surNum;
  }
  return undefined;
}

function parseVehicleHandoverBookingOption(row: unknown): VehicleHandoverBookingOption | null {
  if (row == null || typeof row !== "object") return null;
  const o = row as Record<string, unknown>;
  const id = asString(o.id).trim();
  if (!id) return null;
  const name = asString(o.name).trim() || id;
  const surchargeEur = parseSurchargeEur(o);
  return surchargeEur != null ? { id, name, surchargeEur } : { id, name };
}

function parseReturnHandoversList(raw: unknown): VehicleHandoverBookingOption[] {
  if (!Array.isArray(raw)) return [];
  const out: VehicleHandoverBookingOption[] = [];
  for (const row of raw) {
    const opt = parseVehicleHandoverBookingOption(row);
    if (opt) out.push(opt);
  }
  return out;
}

function pickImage(images: unknown): string {
  if (images && typeof images === "object") {
    for (const v of Object.values(images as Record<string, unknown>)) {
      if (typeof v === "string" && v.trim().length > 0) return v;
    }
  }
  return "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=1200&q=80";
}

export function mapRentVehicleToFleet(raw: RentVehicleDto): FleetVehicle | null {
  const id = asString(raw.id).trim();
  const brand = asString(raw.brand).trim();
  const model = asString(raw.model).trim();
  if (!id || !brand || !model) return null;

  const image = pickImage(raw.images);
  const pricePerDay = rentVehicleDailyPriceTry(raw);
  const year = asNumber(raw.year, 2024);
  const maintenance = Boolean(raw.maintenance);
  const seats = Math.max(2, asNumber(raw.seats, 5));
  const luggage = Math.max(0, asNumber(raw.luggage, 450));
  const engine = asString(raw.engine).trim() || "—";
  const location = getFirstLocationByCountryCode(asString(raw.countryCode));
  const pickupLocationLabel =
    asString(raw.pickupLocationLabel).trim() ||
    asString(raw.locationLabel).trim() ||
    asString(raw.cityName).trim() ||
    location?.label;

  const defaultPickupHandoverLocationId = handoverId(raw.defaultPickupHandoverLocation);
  const defaultReturnHandoverLocationId = handoverId(raw.defaultReturnHandoverLocation);
  const defaultPickupHandoverName = handoverName(raw.defaultPickupHandoverLocation);
  const defaultReturnHandoverName = handoverName(raw.defaultReturnHandoverLocation);

  const returnHandoversForBooking = parseReturnHandoversList(
    raw.returnHandoverLocations ?? raw.assignedReturnHandoverLocations,
  );

  let pickupHandoverForBooking: VehicleHandoverBookingOption | undefined =
    parseVehicleHandoverBookingOption(raw.pickupHandoverLocation) ??
    parseVehicleHandoverBookingOption(raw.pickupHandover) ??
    undefined;

  if (returnHandoversForBooking.length > 0 && !pickupHandoverForBooking && defaultPickupHandoverLocationId) {
    pickupHandoverForBooking = {
      id: defaultPickupHandoverLocationId,
      name: defaultPickupHandoverName ?? pickupLocationLabel ?? defaultPickupHandoverLocationId,
    };
  }

  const optRaw = raw.optionDefinitions;
  const rentOptionDefinitions = Array.isArray(optRaw)
    ? optRaw
        .map((row) => {
          if (row == null || typeof row !== "object") return null;
          const o = row as Record<string, unknown>;
          const oid = asString(o.id).trim();
          const title = asString(o.title).trim();
          if (!oid || !title) return null;
          const price = typeof o.price === "number" ? o.price : Number(o.price);
          return {
            id: oid,
            title,
            description: asString(o.description).trim() || undefined,
            price: Number.isFinite(price) ? price : 0,
            active: o.active == null ? true : Boolean(o.active),
          };
        })
        .filter((x): x is NonNullable<typeof x> => Boolean(x))
    : undefined;

  return {
    id,
    brand,
    name: `${brand} ${model}`.trim(),
    category: maintenance ? "Bakımda" : "Kiralık Araç",
    pricePerDay,
    specs: ["Otomatik", `${seats} kişi`, `${year}`],
    transmission: "otomatik",
    seats,
    fuel: "benzin",
    year,
    engine,
    powerKw: 0,
    luggage,
    co2: "—",
    image,
    gallery: [image],
    imageAlt: `${brand} ${model}`,
    badge: raw.external ? "Partner" : undefined,
    description: `${brand} ${model} için güncel araç kaydı (rent API).`,
    highlights: [],
    included: ["Standart sigorta (detay ofiste)", "7/24 destek"],
    notIncluded: ["Yakıt", "Otoyol / köprü geçişleri"],
    depositHint: 15000,
    garageLocation:
      "İstanbul, Maslak — Hazırlık noktası A · Filo garajı (demo). Araç bu noktadan veya anlaşmalı ofisten teslim edilir.",
    pickupLocationId:
      pickupSlugFromHandoverUuid(defaultPickupHandoverLocationId) ??
      defaultPickupHandoverLocationId ??
      location?.id,
    pickupLocationLabel: pickupLocationLabel || undefined,
    defaultPickupHandoverLocationId,
    defaultReturnHandoverLocationId,
    defaultPickupHandoverName,
    defaultReturnHandoverName,
    pickupHandoverForBooking,
    returnHandoversForBooking: returnHandoversForBooking.length > 0 ? returnHandoversForBooking : undefined,
    rentOptionDefinitions,
  };
}

export function resolveRentVehicleDtoToFleet(raw: RentVehicleDto): FleetVehicle | null {
  const record = raw as unknown as Record<string, unknown>;
  const snap = readFeFleetSnapshotFromVehicleDto(record);
  if (snap !== undefined && snap !== null) {
    const fromSnap = parseFeFleetSnapshot(snap);
    if (fromSnap) return fromSnap;
  }
  return mapRentVehicleToFleet(raw);
}
