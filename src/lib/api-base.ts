/**
 * Tüm harici API çağrıları bu modüldeki köklerden türetilir.
 *
 * **Seçim:** `NEXT_PUBLIC_BASE_API_URL` doluysa doğrudan bu kök kullanılır (sondaki `/` atılır).
 * Boşsa `NEXT_PUBLIC_API_BASE_MODE` (varsayılan: üretimde `prod-gateway`, geliştirmede `local`).
 *
 * | Mod               | Davranış |
 * |-------------------|----------|
 * | `prod-gateway`    | `baseProdGatewayUrl` + `/authservice` / `/rent` |
 * | `prod-direct`     | `baseProdUrl` (rent), auth için `baseProdDirectAuthUrl` |
 * | `local`           | `baseLocalUrl` (rent), auth `baseLocalAuthUrl` |
 * | `local-gateway`   | `baseLocalGatewayUrl` + `/authservice` / `/rent` |
 */

const stripTrailingSlash = (s: string) => s.replace(/\/+$/, "");

/** Üretim API Gateway kökü (ör. `https://api.sizin-domain.com`). */
export const baseProdGatewayUrl = "https://gateway.algorycode.com";

/** Üretimde rent servisine doğrudan kök (gateway yok). */
export const baseProdUrl = "https://rental.algorycode.com";

/** Üretimde auth servisine doğrudan kök (`prod-direct` modunda). */
export const baseProdDirectAuthUrl = "https://auth.algorycode.com";

/** Yerelde rent servisi. */
export const baseLocalUrl = "http://localhost:8090";

/** Yerelde auth servisi (`local` modunda). */
export const baseLocalAuthUrl = "http://localhost:8099";

/** Yerel Spring Cloud Gateway (GatewayServer `server.port`). */
export const baseLocalGatewayUrl = "http://localhost:8072";

export type ApiBaseMode = "prod-gateway" | "prod-direct" | "local" | "local-gateway";

function resolveMode(): ApiBaseMode {
  const raw = process.env.NEXT_PUBLIC_API_BASE_MODE?.trim().toLowerCase();
  if (raw === "prod-gateway" || raw === "prod-direct" || raw === "local" || raw === "local-gateway") {
    return raw;
  }
  return process.env.NODE_ENV === "development" ? "local" : "prod-gateway";
}

/** Tek kök: gateway host veya doğrudan rent host (moda göre). */
export function resolveBaseApiUrl(): string {
  const override = process.env.NEXT_PUBLIC_BASE_API_URL?.trim();
  if (override) return stripTrailingSlash(override);
  const mode = resolveMode();
  switch (mode) {
    case "prod-gateway":
      return stripTrailingSlash(baseProdGatewayUrl);
    case "prod-direct":
      return stripTrailingSlash(baseProdUrl);
    case "local":
      return stripTrailingSlash(baseLocalUrl);
    case "local-gateway":
      return stripTrailingSlash(baseLocalGatewayUrl);
    default:
      return stripTrailingSlash(baseProdGatewayUrl);
  }
}

/** `resolveBaseApiUrl` ile aynı; tek yerden import için. */
export const baseApiUrl = resolveBaseApiUrl();

/** Auth istekleri kökü (sonunda `/` yok). Gateway modunda `…/authservice`. */
export function getAuthApiRoot(): string {
  const override = process.env.NEXT_PUBLIC_AUTH_API_BASE?.trim();
  if (override) return stripTrailingSlash(override);
  const mode = resolveMode();
  if (mode === "prod-gateway" || mode === "local-gateway") {
    return `${resolveBaseApiUrl()}/authservice`;
  }
  if (mode === "prod-direct") return stripTrailingSlash(baseProdDirectAuthUrl);
  return stripTrailingSlash(baseLocalAuthUrl);
}

/** Rent istekleri kökü (sonunda `/` yok). Gateway modunda `…/rent`. */
export function getRentApiRoot(): string {
  const override = process.env.NEXT_PUBLIC_RENT_API_BASE?.trim();
  if (override) return stripTrailingSlash(override);
  const legacy = process.env.NEXT_PUBLIC_RENTAL_REQUEST_API_BASE?.trim();
  if (legacy) return stripTrailingSlash(legacy);
  const mode = resolveMode();
  if (mode === "prod-gateway" || mode === "local-gateway") {
    return `${resolveBaseApiUrl()}/rent`;
  }
  return resolveBaseApiUrl();
}
