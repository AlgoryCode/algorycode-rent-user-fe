import { getRentApiRoot } from "@/lib/api-base";

type ApiMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

async function apiRequest<T>(path: string, method: ApiMethod, body?: unknown): Promise<T> {
  const res = await fetch(`${getRentApiRoot()}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(body != null ? { "Content-Type": "application/json" } : {}),
    },
    body: body != null ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Rent API error (${res.status})`);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export type RentVehicleDto = Record<string, unknown>;
export type RentRentalDto = Record<string, unknown>;
export type RentCountryDto = Record<string, unknown>;
export type RentPaymentDto = Record<string, unknown>;
export type RentPanelUserDto = Record<string, unknown>;
export type RentCustomerRecordStateDto = Record<string, unknown>;
export type RentCustomerRecordDeletionDto = Record<string, unknown>;
export type RentRentalRequestDto = Record<string, unknown>;

export type CreateRentalRequestFormPayload = {
  vehicleId?: string;
  startDate: string;
  endDate: string;
  outsideCountryTravel: boolean;
  note?: string;
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

export async function fetchVehiclesFromRentApi() {
  return apiRequest<RentVehicleDto[]>("/vehicles", "GET");
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

export async function fetchRentalRequestsFromRentApi() {
  return apiRequest<RentRentalRequestDto[]>("/rental-requests", "GET");
}

export async function createRentalRequestOnRentApi(payload: CreateRentalRequestFormPayload) {
  return apiRequest<RentRentalRequestDto>("/rental-requests", "POST", payload);
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
  const res = await fetch(`${getRentApiRoot()}/rental-requests/${encodeURIComponent(id)}/contract.pdf`, {
    headers: { Accept: "application/pdf" },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Rent API error (${res.status})`);
  }
  return res.blob();
}
