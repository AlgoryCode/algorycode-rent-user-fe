import type { FleetVehicle } from "@/data/fleet";
import { fetchVehicleByIdFromRentApi } from "@/lib/rentApi";
import { resolveRentVehicleDtoToFleet, type RentVehicleDto } from "@/lib/rentFleetCore";

/** Tarayıcıda `GET /vehicles/{id}` — `next/headers` veya sunucu çerezleri yok. */
export async function fetchFleetVehicleById(id: string): Promise<FleetVehicle | null> {
  const trimmed = id?.trim();
  if (!trimmed) return null;
  try {
    const raw = await fetchVehicleByIdFromRentApi(trimmed);
    return resolveRentVehicleDtoToFleet((raw ?? {}) as RentVehicleDto);
  } catch {
    return null;
  }
}
