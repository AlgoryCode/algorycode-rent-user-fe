import { parseAuthServiceError } from "@/lib/authError";
import { getAuthGatewayAxios } from "@/lib/gatewayAxios";
import { getPanelSameOriginAxios } from "@/lib/panel-same-origin-axios";

/** Kayıtta gönderilebilir `registrationRole` değerleri (AuthService `RegistrationRole` enum ile aynı adlar). */
export type RegistrationRoleCode =
  | "USER"
  | "RENT_USER"
  | "RENT_MANAGER"
  | "RENT_ADMIN"
  | "QR_USER"
  | "QR_MANAGER"
  | "QR_ADMIN";

export type MyProfileResponse = {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  twoFactorEnabled: boolean;
  memberSince?: string;
  notifyEmailImportant?: boolean;
  notifyScanAlerts?: boolean;
  notifyWeeklyReport?: boolean;
  notifyMarketingEmails?: boolean;
  notifyPushBrowser?: boolean;
};

export type MyProfilePatchRequest = Partial<{
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  notifyEmailImportant: boolean;
  notifyScanAlerts: boolean;
  notifyWeeklyReport: boolean;
  notifyMarketingEmails: boolean;
  notifyPushBrowser: boolean;
}>;

export type TwoFactorSetupResponse = {
  secret: string;
  issuer: string;
  accountLabel: string;
  qrImageBase64: string;
  otpAuthUri: string;
};

export type TokenResponse = {
  accessToken?: string;
  refreshToken?: string;
  userId?: number;
  email?: string;
  firstName?: string;
  lastName?: string;
  /** AuthService yanıtında varsa rol çerezi senkronu için kullanılır (JWT ile birleştirilir). */
  roles?: string[];
  role?: string;
  authorities?: string[];
};

function parseJsonResponse(text: string): unknown {
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
}

function messageFromUnknown(data: unknown, fallback: string): string {
  if (typeof data === "string" && data.trim()) return data.trim();
  if (data != null && typeof data === "object") {
    return parseAuthServiceError(data) || fallback;
  }
  return fallback;
}

export async function loginBasic(email: string, password: string): Promise<TokenResponse> {
  const { status, data: raw } = await getPanelSameOriginAxios().post<unknown>(
    "/api/auth/login",
    { email: email.trim(), password },
    { validateStatus: () => true },
  );
  const data = typeof raw === "string" ? parseJsonResponse(raw) : raw ?? {};
  if (status < 200 || status >= 300) {
    throw new Error(messageFromUnknown(data, `Giriş başarısız (${status})`));
  }
  return data as TokenResponse;
}

export async function registerBasic(payload: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber?: string;
  registrationRole?: RegistrationRoleCode;
}): Promise<void> {
  const body = {
    email: payload.email,
    password: payload.password,
    firstName: payload.firstName,
    lastName: payload.lastName,
    phoneNumber: payload.phoneNumber,
    registrationRole: payload.registrationRole ?? "RENT_USER",
  };
  const { status, data: raw } = await getPanelSameOriginAxios().post<unknown>("/api/auth/register", body, {
    validateStatus: () => true,
  });
  const data = typeof raw === "string" ? parseJsonResponse(raw) : raw ?? {};
  if (status < 200 || status >= 300) {
    throw new Error(messageFromUnknown(data, `Kayıt başarısız (${status})`));
  }
}

export async function loginWithGoogleIdToken(idToken: string): Promise<TokenResponse> {
  const { status, data: raw } = await getPanelSameOriginAxios().post<unknown>(
    "/api/auth/google/login",
    idToken,
    {
      headers: { Accept: "application/json", "Content-Type": "text/plain" },
      validateStatus: () => true,
    },
  );
  const data = typeof raw === "string" ? parseJsonResponse(raw) : raw ?? {};
  if (status < 200 || status >= 300) {
    throw new Error(messageFromUnknown(data, `Google giriş başarısız (${status})`));
  }
  return data as TokenResponse;
}

function userIdHeaders(_accessToken: string, userId: number) {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-User-Id": String(userId),
  };
}

function formatAuthUserError(status: number, data: unknown): string {
  if (typeof data === "string") {
    const t = data.trim();
    if (!t) return `Auth API error (${status})`;
    try {
      return parseAuthServiceError(JSON.parse(t) as unknown) || t;
    } catch {
      return t;
    }
  }
  if (data != null && typeof data === "object") {
    return parseAuthServiceError(data) || `Auth API error (${status})`;
  }
  return `Auth API error (${status})`;
}

async function authUserRequest<T>(
  method: "GET" | "POST" | "PATCH",
  path: string,
  accessToken: string,
  userId: number,
  body?: unknown,
): Promise<T> {
  const client = getAuthGatewayAxios();
  const { status, data } = await client.request<T>({
    method,
    url: path,
    headers: userIdHeaders(accessToken, userId),
    data: body === undefined ? undefined : body,
    validateStatus: () => true,
  });
  if (status === 204) return undefined as T;
  if (status < 200 || status >= 300) {
    throw new Error(formatAuthUserError(status, data));
  }
  return data as T;
}

export async function fetchMyProfile(accessToken: string, userId: number) {
  return authUserRequest<MyProfileResponse>("GET", "/account/myprofile", accessToken, userId);
}

export async function patchMyProfile(accessToken: string, userId: number, payload: MyProfilePatchRequest) {
  return authUserRequest<MyProfileResponse>("PATCH", "/account/myprofile", accessToken, userId, payload);
}

export async function changePassword(accessToken: string, userId: number, currentPassword: string, newPassword: string) {
  return authUserRequest<void>("POST", "/account/change-password", accessToken, userId, { currentPassword, newPassword });
}

export async function setupTwoFactor(accessToken: string, userId: number) {
  return authUserRequest<TwoFactorSetupResponse>("POST", "/2fa/setup", accessToken, userId);
}

export async function activateTwoFactor(accessToken: string, userId: number, code: string) {
  return authUserRequest<void>("POST", "/2fa/active", accessToken, userId, { code });
}

export async function disableTwoFactor(accessToken: string, userId: number, code: string) {
  return authUserRequest<void>("POST", "/2fa/disable", accessToken, userId, { code });
}
