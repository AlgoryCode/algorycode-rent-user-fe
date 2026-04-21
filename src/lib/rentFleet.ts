import "server-only";

import type { FleetVehicle } from "@/data/fleet";
import type { FleetAvailabilityQuery } from "@/lib/fleetAvailabilityQuery";
import { mapRentVehicleToFleet, type RentVehicleDto } from "@/lib/rentFleetCore";
import { fetchFleetVehicleByIdOnServer, fetchVehiclesJsonFromGatewayOnServer } from "@/lib/rentFleet.server";

export async function fetchRentFleetVehicles(
  availability?: FleetAvailabilityQuery,
): Promise<FleetVehicle[]> {
  try {
    const data = await fetchVehiclesJsonFromGatewayOnServer(availability);
    if (!Array.isArray(data)) return [];
    return data
      .map((row) => mapRentVehicleToFleet((row ?? {}) as RentVehicleDto))
      .filter((v): v is FleetVehicle => Boolean(v));
  } catch {
    return [];
  }
}

/** RSC / Route Handler: çerezdeki Bearer ile `GET /vehicles/{id}`. */
export async function fetchFleetVehicleById(id: string): Promise<FleetVehicle | null> {
  const trimmed = id?.trim();
  if (!trimmed) return null;
  return fetchFleetVehicleByIdOnServer(trimmed);
}

/** Yalnızca rent API / veritabanı araçları; demo filo birleştirilmez. */
export async function fetchUnifiedFleet(
  availability?: FleetAvailabilityQuery,
): Promise<FleetVehicle[]> {
  return await fetchRentFleetVehicles(availability);
}
