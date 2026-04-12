const AUTH_API_BASE = process.env.NEXT_PUBLIC_AUTH_API_BASE || "https://auth.algorycode.com";

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
};

async function authJson<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${AUTH_API_BASE}${path}`, {
    ...init,
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Auth API error (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  return authJson<T>(path, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export async function loginBasic(email: string, password: string) {
  return postJson<TokenResponse>("/basicauth/login", { email, password });
}

export async function registerBasic(payload: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber?: string;
}) {
  return postJson<unknown>("/basicauth/register", {
    ...payload,
    roles: "USER",
    provider: "BASIC",
  });
}

export async function loginWithGoogleIdToken(idToken: string) {
  return authJson<TokenResponse>("/google-auth/login", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "text/plain",
    },
    body: idToken,
  });
}

function authHeaders(accessToken: string, userId: number) {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
    "X-User-Id": String(userId),
  };
}

export async function fetchMyProfile(accessToken: string, userId: number) {
  return authJson<MyProfileResponse>("/account/myprofile", {
    method: "GET",
    headers: authHeaders(accessToken, userId),
  });
}

export async function patchMyProfile(accessToken: string, userId: number, payload: MyProfilePatchRequest) {
  return authJson<MyProfileResponse>("/account/myprofile", {
    method: "PATCH",
    headers: authHeaders(accessToken, userId),
    body: JSON.stringify(payload),
  });
}

export async function changePassword(accessToken: string, userId: number, currentPassword: string, newPassword: string) {
  return authJson<void>("/account/change-password", {
    method: "POST",
    headers: authHeaders(accessToken, userId),
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function setupTwoFactor(accessToken: string, userId: number) {
  return authJson<TwoFactorSetupResponse>("/2fa/setup", {
    method: "POST",
    headers: authHeaders(accessToken, userId),
  });
}

export async function activateTwoFactor(accessToken: string, userId: number, code: string) {
  return authJson<void>("/2fa/active", {
    method: "POST",
    headers: authHeaders(accessToken, userId),
    body: JSON.stringify({ code }),
  });
}

export async function disableTwoFactor(accessToken: string, userId: number, code: string) {
  return authJson<void>("/2fa/disable", {
    method: "POST",
    headers: authHeaders(accessToken, userId),
    body: JSON.stringify({ code }),
  });
}
