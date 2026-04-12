import { fleet, type FleetVehicle } from "@/data/fleet";
import { getFirstLocationByCountryCode } from "@/data/locations";
import { fetchVehiclesFromRentApi } from "@/lib/rentApi";

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
};

function asString(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function asNumber(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
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
    pickupLocationId: location?.id,
    pickupLocationLabel: pickupLocationLabel || undefined,
  };
}

export async function fetchRentFleetVehicles(): Promise<FleetVehicle[]> {
  try {
    const data = await fetchVehiclesFromRentApi();
    if (!Array.isArray(data)) return [];
    return data
      .map((row) => mapRentVehicleToFleet((row ?? {}) as RentVehicleDto))
      .filter((v): v is FleetVehicle => Boolean(v));
  } catch {
    return [];
  }
}

export async function fetchUnifiedFleet(): Promise<FleetVehicle[]> {
  const remote = await fetchRentFleetVehicles();
  if (remote.length === 0) return fleet;
  return [...remote, ...fleet.filter((v) => !remote.some((r) => r.id === v.id))];
}
