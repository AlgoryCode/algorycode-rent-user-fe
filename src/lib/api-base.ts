/**
 * Yalnızca Spring Cloud Gateway: auth `{gateway}/authservice`, rent `{gateway}/rent`.
 *
 * Öncelik:
 * 1. `NEXT_PUBLIC_GATEWAY_URL` veya `NEXT_PUBLIC_BASE_API_URL` (sonda `/` yok)
 * 2. `NEXT_PUBLIC_LOCAL_PROD=true` | `1` → prod gateway (lokalde `next dev` ile prod API; `npm run local_prod`)
 * 3. Aksi: `next dev` → `http://localhost:8072`, production build → `https://gateway.algorycode.com`
 */

const stripTrailingSlash = (s: string) => s.replace(/\/+$/, "");

const DEFAULT_PROD_GATEWAY = "https://gateway.algorycode.com";

function isLocalProdFlag(): boolean {
  const v = process.env.NEXT_PUBLIC_LOCAL_PROD?.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

function gatewayOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_GATEWAY_URL?.trim() ||
    process.env.NEXT_PUBLIC_BASE_API_URL?.trim() ||
    "";
  if (raw) return stripTrailingSlash(raw);
  if (isLocalProdFlag()) {
    return DEFAULT_PROD_GATEWAY;
  }
  return process.env.NODE_ENV === "development"
    ? "http://localhost:8072"
    : DEFAULT_PROD_GATEWAY;
}

export function resolveBaseApiUrl(): string {
  return gatewayOrigin();
}

export const baseApiUrl = resolveBaseApiUrl();

export function getAuthApiRoot(): string {
  return `${gatewayOrigin()}/authservice`;
}

export function getRentApiRoot(): string {
  return `${gatewayOrigin()}/rent`;
}
