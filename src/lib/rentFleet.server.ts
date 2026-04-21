import "server-only";

import axios from "axios";
import type { FleetVehicle } from "@/data/fleet";
import { getRentApiRoot } from "@/lib/api-base";
import type { FleetAvailabilityQuery } from "@/lib/fleetAvailabilityQuery";
import { fleetAvailabilityToSearchParams } from "@/lib/fleetAvailabilityQuery";
import { getAccessTokenFromCookies } from "@/lib/server/rentAccessToken";
import { mapRentVehicleToFleet, type RentVehicleDto } from "@/lib/rentFleetCore";

const FETCH_REVALIDATE_SEC = 60;

export async function fetchVehiclesJsonFromGatewayOnServer(
  availability?: FleetAvailabilityQuery,
): Promise<unknown[]> {
  const token = await getAccessTokenFromCookies();
  const suffix = availability ? `?${fleetAvailabilityToSearchParams(availability).toString()}` : "";
  const url = `${getRentApiRoot()}/vehicles${suffix}`;

  if (!token) {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: FETCH_REVALIDATE_SEC, tags: ["rent-vehicles"] },
    });
    if (!res.ok) {
      throw new Error(`Rent vehicles HTTP ${res.status}`);
    }
    const data: unknown = await res.json().catch(() => null);
    return Array.isArray(data) ? data : [];
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  headers.Authorization = `Bearer ${token}`;
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

    if (!token) {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        next: {
          revalidate: FETCH_REVALIDATE_SEC,
          tags: ["rent-vehicle", `rent-vehicle-${encodeURIComponent(trimmed)}`],
        },
      });
      if (!res.ok) return null;
      const data: unknown = await res.json().catch(() => null);
      if (data == null || typeof data !== "object") return null;
      return mapRentVehicleToFleet(data as RentVehicleDto);
    }

    const headers: Record<string, string> = { Accept: "application/json" };
    headers.Authorization = `Bearer ${token}`;
    const { status, data } = await axios.get<unknown>(url, { headers, timeout: 20_000, validateStatus: () => true });
    if (status < 200 || status >= 300) return null;
    if (data == null || typeof data !== "object") return null;
    return mapRentVehicleToFleet(data as RentVehicleDto);
  } catch {
    return null;
  }
}
