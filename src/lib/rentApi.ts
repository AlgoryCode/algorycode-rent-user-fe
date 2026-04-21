import { getRentGatewayAxios } from "@/lib/gatewayAxios";
import type { RentalPricedLinePayload } from "@/lib/rentalRequestPricing";
import type { FleetAvailabilityQuery } from "@/lib/fleetAvailabilityQuery";
import { fleetAvailabilityToSearchParams } from "@/lib/fleetAvailabilityQuery";

type ApiMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

async function apiRequest<T>(path: string, method: ApiMethod, body?: unknown): Promise<T> {
  const client = getRentGatewayAxios();
  const { status, data } = await client.request<T>({
    url: path,
    method,
    data: body === undefined ? undefined : body,
    validateStatus: () => true,
  });
  if (status === 204) return undefined as T;
  if (status < 200 || status >= 300) {
    const text =
      typeof data === "string"
        ? data
        : data != null && typeof data === "object" && "message" in data && typeof (data as { message?: string }).message === "string"
          ? (data as { message: string }).message
          : JSON.stringify(data ?? "");
    throw new Error(text || `Rent API error (${status})`);
  }
  return data as T;
}

export type RentVehicleDto = Record<string, unknown>;
export type RentRentalDto = Record<string, unknown>;
export type RentCountryDto = Record<string, unknown>;
export type RentPaymentDto = Record<string, unknown>;
export type RentPanelUserDto = Record<string, unknown>;
export type RentCustomerRecordStateDto = Record<string, unknown>;
export type RentCustomerRecordDeletionDto = Record<string, unknown>;
export type RentRentalRequestDto = Record<string, unknown>;
export type RentHandoverLocationDto = Record<string, unknown>;

/** Kiralama / talep ek satırları (rent-service ile uyumlu). */
export type RentalOptionPayload = {
  /** Doluysa başlık/fiyat sunucuda araç tanımından alınır. */
  vehicleOptionDefinitionId?: string;
  /** Rezervasyon ek şablonu (DB); doluysa başlık/fiyat sunucuda şablondan alınır. */
  reservationExtraTemplateId?: string;
  title?: string;
  description?: string | null;
  price?: number;
  icon?: string | null;
};

/** `GET /reservation-extra-options` — rezervasyon sihirbazı ek hizmet kataloğu. */
export type ReservationExtraOptionTemplateDto = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  price: number;
  icon: string | null;
  lineOrder: number;
  active?: boolean;
  requiresCoDriverDetails: boolean;
};

export type { RentalPricedLinePayload } from "@/lib/rentalRequestPricing";

export type CreateRentalRequestFormPayload = {
  vehicleId?: string;
  /** Misafir: JWT’deki session UUID (`rental_requests.user_id`); üye akışında profil ile doldurulabilir. */
  userId?: string;
  startDate: string;
  endDate: string;
  /** rent-service `handover_locations` (kind PICKUP); opsiyonel. */
  pickupHandoverLocationId?: string;
  /** rent-service `handover_locations` (kind RETURN); opsiyonel. */
  returnHandoverLocationId?: string;
  outsideCountryTravel: boolean;
  note?: string;
  /** Boş veya gönderilmez: seçenek yok. */
  options?: RentalOptionPayload[];
  /** İstemci fiyat kalemi özeti (denetim); sunucu `rental_request_priced_lines` üretir. */
  pricingLines?: RentalPricedLinePayload[];
  customer: {
    fullName: string;
    phone: string;
    email: string;
    birthDate: string;
    nationalId?: string;
    passportNo?: string;
    driverLicenseNo?: string;
    passportImageDataUrl: string;
    driverLicenseImageDataUrl: string;
  };
  additionalDrivers?: {
    fullName: string;
    birthDate: string;
    driverLicenseNo?: string;
    passportNo?: string;
    passportImageDataUrl: string;
    driverLicenseImageDataUrl: string;
  }[];
};

export async function fetchHandoverLocationsFromRentApi(
  opts?:
    | "PICKUP"
    | "RETURN"
    | { kind?: "PICKUP" | "RETURN"; includeInactive?: boolean },
) {
  const p = new URLSearchParams();
  if (typeof opts === "string") {
    p.set("kind", opts);
  } else if (opts && typeof opts === "object") {
    if (opts.kind) p.set("kind", opts.kind);
    if (opts.includeInactive) p.set("includeInactive", "true");
  }
  const suf = p.toString() ? `?${p.toString()}` : "";
  return apiRequest<RentHandoverLocationDto[]>(`/handover-locations${suf}`, "GET");
}

export type HandoverPricingQuoteDto = {
  pickupLegEur: number;
  returnLegEur: number;
  routeEur: number;
  totalEur: number;
  applied: boolean;
};

export async function fetchHandoverPricingQuoteFromRentApi(pickupHandoverId: string, returnHandoverId: string) {
  const q = new URLSearchParams({ pickupHandoverId, returnHandoverId });
  return apiRequest<HandoverPricingQuoteDto>(`/handover-pricing/quote?${q.toString()}`, "GET");
}

export async function fetchHandoverPricingQuoteAsRentGuest(pickupHandoverId: string, returnHandoverId: string) {
  const q = new URLSearchParams({ pickupHandoverId, returnHandoverId });
  const { getPanelSameOriginAxios } = await import("@/lib/panel-same-origin-axios");
  const { status, data } = await getPanelSameOriginAxios().get<unknown>(
    `/api/rent/guest/handover-pricing/quote?${q.toString()}`,
    { validateStatus: () => true },
  );
  return parseGuestBffAxios<HandoverPricingQuoteDto>(status, data);
}

export async function fetchReservationExtraOptionsFromRentApi() {
  return apiRequest<ReservationExtraOptionTemplateDto[]>("/reservation-extra-options", "GET");
}

export async function fetchVehiclesFromRentApi(availability?: FleetAvailabilityQuery) {
  const suffix = availability
    ? `?${fleetAvailabilityToSearchParams(availability).toString()}`
    : "";
  return apiRequest<RentVehicleDto[]>(`/vehicles${suffix}`, "GET");
}

export async function fetchVehicleByIdFromRentApi(id: string) {
  return apiRequest<RentVehicleDto>(`/vehicles/${encodeURIComponent(id)}`, "GET");
}

export type CreateVehiclePayload = {
  plate: string;
  brand: string;
  model: string;
  year: number;
  maintenance?: boolean;
  external?: boolean;
  externalCompany?: string;
  rentalDailyPrice: number;
  commissionRatePercent?: number;
  commissionBrokerPhone?: string;
  countryCode?: string;
  images?: Record<string, string>;
  engine?: string;
  seats?: number;
  luggage?: number;
  cityId?: string;
};

export type UpdateVehiclePayload = Partial<CreateVehiclePayload>;

export async function createVehicleOnRentApi(payload: CreateVehiclePayload) {
  return apiRequest<RentVehicleDto>("/vehicles", "POST", payload);
}

export async function updateVehicleOnRentApi(id: string, payload: UpdateVehiclePayload) {
  return apiRequest<RentVehicleDto>(`/vehicles/${encodeURIComponent(id)}`, "PATCH", payload);
}

export async function deleteVehicleOnRentApi(id: string) {
  return apiRequest<void>(`/vehicles/${encodeURIComponent(id)}`, "DELETE");
}

export async function replaceVehicleImageSlotOnRentApi(id: string, slot: string, image: string) {
  return apiRequest<RentVehicleDto>(`/vehicles/${encodeURIComponent(id)}/images/${encodeURIComponent(slot)}`, "PUT", { image });
}

export async function deleteVehicleImageSlotOnRentApi(id: string, slot: string) {
  return apiRequest<RentVehicleDto>(`/vehicles/${encodeURIComponent(id)}/images/${encodeURIComponent(slot)}`, "DELETE");
}

export type VehicleOccupancySource = "rental" | "rental_request";

export type VehicleOccupancyRangeDto = {
  id: string;
  source: VehicleOccupancySource;
  startDate: string;
  endDate: string;
};

/** Rent API: iptal olmayan kiralamalar + pending/approved talepler (takvim birleşik doluluk). */
export type VehicleCalendarOccupancyDto = {
  from: string;
  to: string;
  ranges: VehicleOccupancyRangeDto[];
};

export async function fetchVehicleCalendarOccupancyFromRentApi(vehicleId: string, from: string, to: string) {
  const q = new URLSearchParams({ from, to });
  return apiRequest<VehicleCalendarOccupancyDto>(
    `/vehicles/${encodeURIComponent(vehicleId)}/calendar/occupancy?${q.toString()}`,
    "GET",
  );
}

export async function fetchRentalsFromRentApi(query?: {
  vehicleId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}) {
  const q = new URLSearchParams();
  if (query?.vehicleId) q.set("vehicleId", query.vehicleId);
  if (query?.status) q.set("status", query.status);
  if (query?.startDate) q.set("startDate", query.startDate);
  if (query?.endDate) q.set("endDate", query.endDate);
  const suffix = q.toString();
  return apiRequest<RentRentalDto[]>(`/rentals${suffix ? `?${suffix}` : ""}`, "GET");
}

export async function fetchRentalByIdFromRentApi(id: string) {
  return apiRequest<RentRentalDto>(`/rentals/${encodeURIComponent(id)}`, "GET");
}

export async function createRentalOnRentApi(payload: Record<string, unknown>) {
  return apiRequest<RentRentalDto>("/rentals", "POST", payload);
}

export async function updateRentalOnRentApi(id: string, payload: Record<string, unknown>) {
  return apiRequest<RentRentalDto>(`/rentals/${encodeURIComponent(id)}`, "PATCH", payload);
}

export async function fetchCountriesFromRentApi() {
  return apiRequest<RentCountryDto[]>("/countries", "GET");
}

export async function createCountryOnRentApi(payload: { code: string; name: string; colorCode: string }) {
  return apiRequest<RentCountryDto>("/countries", "POST", payload);
}

export async function patchCountryOnRentApi(id: string, payload: { colorCode: string }) {
  return apiRequest<RentCountryDto>(`/countries/${encodeURIComponent(id)}`, "PATCH", payload);
}

export async function fetchPaymentsFromRentApi() {
  return apiRequest<RentPaymentDto[]>("/payments", "GET");
}

export async function fetchPanelUsersFromRentApi() {
  return apiRequest<RentPanelUserDto[]>("/panel-users", "GET");
}

export async function deletePanelUserOnRentApi(id: string) {
  return apiRequest<void>(`/panel-users/${encodeURIComponent(id)}`, "DELETE");
}

export async function fetchCustomerRecordsFromRentApi() {
  return apiRequest<RentCustomerRecordStateDto[]>("/customer-records", "GET");
}

export async function patchCustomerRecordOnRentApi(recordKey: string, active: boolean) {
  return apiRequest<RentCustomerRecordStateDto>(`/customer-records/${encodeURIComponent(recordKey)}`, "PATCH", { active });
}

export async function deleteCustomerRecordOnRentApi(recordKey: string) {
  return apiRequest<RentCustomerRecordDeletionDto>(`/customer-records/${encodeURIComponent(recordKey)}`, "DELETE");
}

export async function fetchRentalRequestsFromRentApi(params?: { vehicleId?: string }) {
  const q = new URLSearchParams();
  if (params?.vehicleId) q.set("vehicleId", params.vehicleId);
  const suffix = q.toString();
  return apiRequest<RentRentalRequestDto[]>(`/rental-requests${suffix ? `?${suffix}` : ""}`, "GET");
}

export async function createRentalRequestOnRentApi(payload: CreateRentalRequestFormPayload) {
  return apiRequest<RentRentalRequestDto>("/rental-requests", "POST", payload);
}

function parseGuestBffAxios<T>(status: number, data: unknown): T {
  if (status < 200 || status >= 300) {
    const msg =
      data != null && typeof data === "object" && "message" in data && typeof (data as { message?: unknown }).message === "string"
        ? (data as { message: string }).message
        : typeof data === "string"
          ? data
          : JSON.stringify(data ?? "") || `Rent API error (${status})`;
    throw new Error(msg);
  }
  return data as T;
}

/** Misafir: BFF → gateway `/rent/guest/...` (JWT yok). */
export async function fetchHandoverLocationsAsRentGuest(kind?: "PICKUP" | "RETURN") {
  const q = kind ? `?kind=${encodeURIComponent(kind)}` : "";
  const { getPanelSameOriginAxios } = await import("@/lib/panel-same-origin-axios");
  const { status, data } = await getPanelSameOriginAxios().get<unknown>(`/api/rent/guest/handover-locations${q}`, {
    validateStatus: () => true,
  });
  return parseGuestBffAxios<RentHandoverLocationDto[]>(status, data);
}

export async function fetchReservationExtraOptionsAsRentGuest() {
  const { getPanelSameOriginAxios } = await import("@/lib/panel-same-origin-axios");
  const { status, data } = await getPanelSameOriginAxios().get<unknown>("/api/rent/guest/reservation-extra-options", {
    validateStatus: () => true,
  });
  return parseGuestBffAxios<ReservationExtraOptionTemplateDto[]>(status, data);
}

export async function createRentalRequestAsRentGuest(payload: CreateRentalRequestFormPayload) {
  const { getPanelSameOriginAxios } = await import("@/lib/panel-same-origin-axios");
  const { status, data } = await getPanelSameOriginAxios().post<unknown>("/api/rent/guest/rental-requests", payload, {
    validateStatus: () => true,
  });
  return parseGuestBffAxios<RentRentalRequestDto>(status, data);
}

export async function fetchRentalRequestByReferenceFromRentApi(referenceNo: string) {
  return apiRequest<RentRentalRequestDto>(`/rental-requests/reference/${encodeURIComponent(referenceNo)}`, "GET");
}

export async function fetchRentalRequestByIdFromRentApi(id: string) {
  return apiRequest<RentRentalRequestDto>(`/rental-requests/${encodeURIComponent(id)}`, "GET");
}

export async function updateRentalRequestStatusOnRentApi(id: string, payload: { status: string; statusMessage?: string }) {
  return apiRequest<RentRentalRequestDto>(`/rental-requests/${encodeURIComponent(id)}/status`, "PATCH", payload);
}

export async function generateRentalRequestContractOnRentApi(id: string) {
  return apiRequest<RentRentalRequestDto>(`/rental-requests/${encodeURIComponent(id)}/contract`, "POST", {});
}

export async function fetchRentalRequestContractPdfBlobFromRentApi(id: string) {
  const client = getRentGatewayAxios();
  const { status, data } = await client.get<ArrayBuffer>(`/rental-requests/${encodeURIComponent(id)}/contract.pdf`, {
    responseType: "arraybuffer",
    headers: { Accept: "application/pdf" },
    validateStatus: () => true,
  });
  if (status < 200 || status >= 300) {
    let msg = `Rent API error (${status})`;
    if (data instanceof ArrayBuffer) {
      try {
        msg = new TextDecoder().decode(data) || msg;
      } catch {
        /* ignore */
      }
    }
    throw new Error(msg);
  }
  return new Blob([data], { type: "application/pdf" });
}
