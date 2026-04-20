import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";

import { resolveBffAccessToken } from "@/lib/bff-access-token";
import { getAuthApiRoot, getRentApiRoot } from "@/lib/api-base";
import { refreshPanelSession } from "@/lib/panel-same-origin-axios";

type Retry401 = InternalAxiosRequestConfig & { __retry401?: boolean };

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
      const ok = await refreshPanelSession();
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
