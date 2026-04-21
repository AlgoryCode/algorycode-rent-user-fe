/**
 * Rent read-model (jsonb) — FE ↔ rent-service sözleşmesi
 *
 * Backend: `feFleetSnapshot` / `feHandoverSnapshot` alanları; güncellemede kuyruk + worker ile jsonb yenilenebilir.
 * FE: snapshot geçerliyse mapping atlanır; değilse mevcut parser / `mapRentVehicleToFleet` kullanılır.
 */

import type { FleetVehicle, FuelType, Transmission, VehicleHandoverBookingOption } from "@/data/fleet";

export const FE_FLEET_SNAPSHOT_FIELD = "feFleetSnapshot" as const;
export const FE_HANDOVER_SNAPSHOT_FIELD = "feHandoverSnapshot" as const;

const VEHICLE_LIST_KEYS = ["items", "vehicles", "data", "results"] as const;

function asString(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function asNumber(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

const TRANSMISSIONS = new Set<Transmission>(["otomatik", "manuel"]);
const FUELS = new Set<FuelType>(["benzin", "dizel", "hibrit", "elektrik"]);

function isStringArray(a: unknown): a is string[] {
  return Array.isArray(a) && a.every((x) => typeof x === "string");
}

function parseHandoverBookingOpt(v: unknown): VehicleHandoverBookingOption | undefined {
  if (v == null || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  const id = asString(o.id).trim();
  if (!id) return undefined;
  const name = asString(o.name).trim() || id;
  const surRaw = o.surchargeEur ?? o.returnSurchargeEur;
  const sur = typeof surRaw === "number" ? surRaw : Number(surRaw);
  return Number.isFinite(sur) && sur >= 0 ? { id, name, surchargeEur: sur } : { id, name };
}

function parseRentOptionDefs(raw: unknown): FleetVehicle["rentOptionDefinitions"] {
  if (!Array.isArray(raw)) return undefined;
  const out: NonNullable<FleetVehicle["rentOptionDefinitions"]> = [];
  for (const row of raw) {
    if (row == null || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const id = asString(o.id).trim();
    const title = asString(o.title).trim();
    if (!id || !title) continue;
    const price = typeof o.price === "number" ? o.price : Number(o.price);
    out.push({
      id,
      title,
      description: asString(o.description).trim() || undefined,
      price: Number.isFinite(price) ? price : 0,
      active: o.active == null ? true : Boolean(o.active),
    });
  }
  return out.length > 0 ? out : undefined;
}

export function extractVehicleRowsFromApiPayload(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data != null && typeof data === "object") {
    const o = data as Record<string, unknown>;
    for (const k of VEHICLE_LIST_KEYS) {
      const v = o[k];
      if (Array.isArray(v)) return v;
    }
  }
  return [];
}

export function extractHandoverRowsFromApiPayload(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data != null && typeof data === "object") {
    const o = data as Record<string, unknown>;
    const snap = o[FE_HANDOVER_SNAPSHOT_FIELD];
    if (Array.isArray(snap)) return snap;
    for (const k of VEHICLE_LIST_KEYS) {
      const v = o[k];
      if (Array.isArray(v)) return v;
    }
  }
  return [];
}

export function readFeFleetSnapshotFromVehicleDto(dto: Record<string, unknown>): unknown {
  return dto[FE_FLEET_SNAPSHOT_FIELD];
}

export function parseFeFleetSnapshot(raw: unknown): FleetVehicle | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  const id = asString(o.id).trim();
  const name = asString(o.name).trim();
  const brand = asString(o.brand).trim();
  const category = asString(o.category).trim();
  const description = asString(o.description).trim();
  if (!id || !name || !brand || !category) return null;

  const transmission = asString(o.transmission).trim() as Transmission;
  if (!TRANSMISSIONS.has(transmission)) return null;
  const fuel = asString(o.fuel).trim() as FuelType;
  if (!FUELS.has(fuel)) return null;

  const specs = o.specs;
  const highlights = o.highlights;
  const included = o.included;
  const notIncluded = o.notIncluded;
  const gallery = o.gallery;
  if (!isStringArray(specs) || !isStringArray(highlights) || !isStringArray(included) || !isStringArray(notIncluded)) {
    return null;
  }
  if (!isStringArray(gallery) || gallery.length === 0) return null;

  const image = asString(o.image).trim();
  const imageAlt = asString(o.imageAlt).trim();
  if (!image || !imageAlt) return null;

  const pricePerDay = asNumber(o.pricePerDay, -1);
  if (pricePerDay < 0) return null;
  const seats = Math.max(1, asNumber(o.seats, 0));
  const year = asNumber(o.year, 0);
  if (year <= 1900) return null;
  const engine = asString(o.engine).trim() || "—";
  const powerKw = Math.max(0, asNumber(o.powerKw, 0));
  const luggage = Math.max(0, asNumber(o.luggage, 0));
  const co2 = asString(o.co2).trim() || "—";
  const depositHint = Math.max(0, asNumber(o.depositHint, 0));

  const pickupHandoverForBooking = parseHandoverBookingOpt(o.pickupHandoverForBooking);
  let returnHandoversForBooking: VehicleHandoverBookingOption[] | undefined;
  if (Array.isArray(o.returnHandoversForBooking)) {
    const acc: VehicleHandoverBookingOption[] = [];
    for (const row of o.returnHandoversForBooking) {
      const opt = parseHandoverBookingOpt(row);
      if (opt) acc.push(opt);
    }
    if (acc.length > 0) returnHandoversForBooking = acc;
  }

  const rentOptionDefinitions = parseRentOptionDefs(o.rentOptionDefinitions);

  const badge = asString(o.badge).trim() || undefined;
  const garageLocation = asString(o.garageLocation).trim() || undefined;
  const pickupLocationId = asString(o.pickupLocationId).trim() || undefined;
  const pickupLocationLabel = asString(o.pickupLocationLabel).trim() || undefined;
  const defaultPickupHandoverLocationId = asString(o.defaultPickupHandoverLocationId).trim() || undefined;
  const defaultReturnHandoverLocationId = asString(o.defaultReturnHandoverLocationId).trim() || undefined;
  const defaultPickupHandoverName = asString(o.defaultPickupHandoverName).trim() || undefined;
  const defaultReturnHandoverName = asString(o.defaultReturnHandoverName).trim() || undefined;

  return {
    id,
    name,
    brand,
    category,
    pricePerDay,
    specs,
    transmission,
    seats,
    fuel,
    year,
    engine,
    powerKw,
    luggage,
    co2,
    image,
    gallery,
    imageAlt,
    badge,
    description,
    highlights,
    included,
    notIncluded,
    depositHint,
    garageLocation,
    pickupLocationId,
    pickupLocationLabel,
    defaultPickupHandoverLocationId,
    defaultReturnHandoverLocationId,
    defaultPickupHandoverName,
    defaultReturnHandoverName,
    pickupHandoverForBooking,
    returnHandoversForBooking,
    rentOptionDefinitions,
  };
}
