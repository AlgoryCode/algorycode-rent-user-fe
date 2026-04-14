import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";

import { clearBffBearerCache, resolveBffAccessToken } from "@/lib/bff-access-token";
import { getAuthApiRoot, getRentApiRoot } from "@/lib/api-base";
import { clearLocalAuthProfile } from "@/lib/authSession";

type Retry401 = InternalAxiosRequestConfig & { __retry401?: boolean };

let refreshPromise: Promise<boolean> | null = null;

/**
 * QR ile aynı: refresh yalnızca aynı origin `/api/auth/refresh` üzerinden;
 * httpOnly çerezler sunucuda okunur, AuthService’e Cookie ile gider.
 */
export async function refreshSessionViaBff(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      if (typeof window === "undefined") return false;
      try {
        const r = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
        });
        if (r.status === 401) {
          clearBffBearerCache();
          await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).catch(() => undefined);
          clearLocalAuthProfile();
          window.location.assign("/giris-yap");
          return false;
        }
        if (!r.ok) return false;
        clearBffBearerCache();
        return true;
      } catch {
        return false;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

function attach401Retry(instance: AxiosInstance) {
  instance.interceptors.response.use(
    (r) => r,
    async (error: AxiosError) => {
      const status = error.response?.status;
      const cfg = error.config as Retry401 | undefined;
      if (status !== 401 || !cfg || cfg.__retry401 || typeof window === "undefined") {
        return Promise.reject(error);
      }
      cfg.__retry401 = true;
      const ok = await refreshSessionViaBff();
      if (!ok) return Promise.reject(error);
      return instance.request(cfg);
    },
  );
}

let rentAxios: AxiosInstance | null = null;
let authAxios: AxiosInstance | null = null;

export function getRentGatewayAxios(): AxiosInstance {
  if (!rentAxios) {
    rentAxios = axios.create({
      baseURL: getRentApiRoot(),
      timeout: 20_000,
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      withCredentials: false,
    });
    rentAxios.interceptors.request.use(async (config) => {
      const t = await resolveBffAccessToken();
      if (t) config.headers.set("Authorization", `Bearer ${t}`);
      return config;
    });
    attach401Retry(rentAxios);
  }
  return rentAxios;
}

export function getAuthGatewayAxios(): AxiosInstance {
  if (!authAxios) {
    authAxios = axios.create({
      baseURL: getAuthApiRoot(),
      timeout: 20_000,
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      withCredentials: false,
    });
    authAxios.interceptors.request.use(async (config) => {
      const t = await resolveBffAccessToken();
      if (t) config.headers.set("Authorization", `Bearer ${t}`);
      return config;
    });
    attach401Retry(authAxios);
  }
  return authAxios;
}
