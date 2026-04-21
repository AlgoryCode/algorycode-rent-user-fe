import "server-only";

import axios from "axios";
import type { FleetVehicle } from "@/data/fleet";
import { getRentApiRoot } from "@/lib/api-base";
import type { FleetAvailabilityQuery } from "@/lib/fleetAvailabilityQuery";
import { fleetAvailabilityToSearchParams } from "@/lib/fleetAvailabilityQuery";
import { getAccessTokenFromCookies } from "@/lib/server/rentAccessToken";
import { mapRentVehicleToFleet, type RentVehicleDto } from "@/lib/rentFleetCore";

export async function fetchVehiclesJsonFromGatewayOnServer(
  availability?: FleetAvailabilityQuery,
): Promise<unknown[]> {
  const token = await getAccessTokenFromCookies();
  const suffix = availability ? `?${fleetAvailabilityToSearchParams(availability).toString()}` : "";
  const url = `${getRentApiRoot()}/vehicles${suffix}`;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const { status, data } = await axios.get<unknown>(url, { headers, timeout: 20_000, validateStatus: () => true });
  if (status < 200 || status >= 300) {
    throw new Error(`Rent vehicles HTTP ${status}`);
  }
  return Array.isArray(data) ? data : [];
}

export async function fetchFleetVehicleByIdOnServer(trimmed: string): Promise<FleetVehicle | null> {
  try {
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
