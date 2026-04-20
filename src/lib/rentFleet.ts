import axios from "axios";
import type { FleetVehicle, VehicleHandoverBookingOption } from "@/data/fleet";
import { getFirstLocationByCountryCode, pickupLocations } from "@/data/locations";

function pickupSlugFromHandoverUuid(uuid: string | undefined): string | undefined {
  if (!uuid) return undefined;
  const t = String(uuid).trim();
  for (const l of pickupLocations) {
    if (l.rentPickupHandoverId === t) return l.id;
  }
  return undefined;
}
import { getRentApiRoot } from "@/lib/api-base";
import type { FleetAvailabilityQuery } from "@/lib/fleetAvailabilityQuery";
import { fleetAvailabilityToSearchParams } from "@/lib/fleetAvailabilityQuery";
import { fetchVehicleByIdFromRentApi, fetchVehiclesFromRentApi } from "@/lib/rentApi";

type RentVehicleDto = {
  id?: unknown;
  plate?: unknown;
  brand?: unknown;
  model?: unknown;
  year?: unknown;
  rentalDailyPrice?: unknown;
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
  /** Tek alış handover (dashboard). */
  pickupHandoverLocation?: unknown;
  pickupHandover?: unknown;
  /** Bu araca atanmış teslim noktaları (çoklu). */
  returnHandoverLocations?: unknown;
  assignedReturnHandoverLocations?: unknown;
  optionDefinitions?: unknown;
};

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

function parseSurchargeEur(o: Record<string, unknown>): number | undefined {
  const sur = o.surchargeEur;
  const surNum =
    typeof sur === "number" && Number.isFinite(sur)
      ? sur
      : typeof sur === "string"
        ? Number(sur)
        : NaN;
  if (typeof surNum !== "number" || !Number.isFinite(surNum) || surNum < 0) return undefined;
  return surNum;
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

function mapRentVehicleToFleet(raw: RentVehicleDto): FleetVehicle | null {
  const id = asString(raw.id).trim();
  const brand = asString(raw.brand).trim();
  const model = asString(raw.model).trim();
  if (!id || !brand || !model) return null;

  const image = pickImage(raw.images);
  const pricePerDay = Math.max(0, asNumber(raw.rentalDailyPrice, 0));
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

async function fetchVehiclesJsonFromGateway(
  availability?: FleetAvailabilityQuery,
): Promise<unknown[]> {
  if (typeof window !== "undefined") {
    return fetchVehiclesFromRentApi(availability);
  }
  const { getAccessTokenFromCookies } = await import("@/lib/server/rentAccessToken");
  const token = await getAccessTokenFromCookies();
  const suffix = availability
    ? `?${fleetAvailabilityToSearchParams(availability).toString()}`
    : "";
  const url = `${getRentApiRoot()}/vehicles${suffix}`;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const { status, data } = await axios.get<unknown>(url, { headers, timeout: 20_000, validateStatus: () => true });
  if (status < 200 || status >= 300) {
    throw new Error(`Rent vehicles HTTP ${status}`);
  }
  return Array.isArray(data) ? data : [];
}

export async function fetchRentFleetVehicles(
  availability?: FleetAvailabilityQuery,
): Promise<FleetVehicle[]> {
  try {
    const data = await fetchVehiclesJsonFromGateway(availability);
    if (!Array.isArray(data)) return [];
    return data
      .map((row) => mapRentVehicleToFleet((row ?? {}) as RentVehicleDto))
      .filter((v): v is FleetVehicle => Boolean(v));
  } catch {
    return [];
  }
}

/** Veritabanındaki tekil araç: `GET /vehicles/{id}` (liste dışında). */
export async function fetchFleetVehicleById(id: string): Promise<FleetVehicle | null> {
  const trimmed = id?.trim();
  if (!trimmed) return null;
  try {
    if (typeof window !== "undefined") {
      const raw = await fetchVehicleByIdFromRentApi(trimmed);
      return mapRentVehicleToFleet((raw ?? {}) as RentVehicleDto);
    }
    const { getAccessTokenFromCookies } = await import("@/lib/server/rentAccessToken");
    const token = await getAccessTokenFromCookies();
    const url = `${getRentApiRoot()}/vehicles/${encodeURIComponent(trimmed)}`;
    const headers: Record<string, string> = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const { status, data } = await axios.get<unknown>(url, { headers, timeout: 20_000, validateStatus: () => true });
    if (status < 200 || status >= 300) return null;
    if (data == null || typeof data !== "object") return null;
    return mapRentVehicleToFleet(data as RentVehicleDto);
  } catch {
    return null;
  }
}

/** Yalnızca rent API / veritabanı araçları; demo filo birleştirilmez. */
export async function fetchUnifiedFleet(
  availability?: FleetAvailabilityQuery,
): Promise<FleetVehicle[]> {
  return await fetchRentFleetVehicles(availability);
}
