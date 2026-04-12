/**
 * Tüm harici API çağrıları bu modüldeki köklerden türetilir.
 *
 * **Öncelik:** `NEXT_PUBLIC_BASE_API_URL` doluysa gateway kökü olarak kullanılır (sondaki `/` atılır).
 * Boşsa `NEXT_PUBLIC_API_BASE_MODE` (yalnızca açıkça set edilmişse); aksi halde `next dev` → `local`, prod build → `prod-gateway`.
 *
 * | Mod               | Davranış |
 * |-------------------|----------|
 * | `prod-gateway`    | `baseProdGatewayUrl` + `/authservice` / `/rent` |
 * | `prod-direct`     | `baseProdUrl` (rent), auth `baseProdDirectAuthUrl` |
 * | `local`           | `baseLocalUrl` (rent), auth `baseLocalAuthUrl` |
 * | `local-gateway`   | `baseLocalGatewayUrl` + `/authservice` / `/rent` |
 *
 * **Prod:** `NODE_ENV === "production"` iken `local` / `local-gateway` ve localhost içeren base/auth/rent override’ları
 * yok sayılır (yanlışlıkla `.env.local` ile alınmış build’ler için).
 */

const stripTrailingSlash = (s: string) => s.replace(/\/+$/, "");

function isLoopbackHttpUrl(url: string): boolean {
  try {
    const h = new URL(url).hostname;
    return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
  } catch {
    return false;
  }
}

const isProdBuild = () => process.env.NODE_ENV === "production";

/** Prod’da yanlış gömülü localhost köklerini kullanma. */
function effectiveEnvUrl(value: string | undefined): string | undefined {
  const v = value?.trim();
  if (!v) return undefined;
  if (isProdBuild() && isLoopbackHttpUrl(v)) return undefined;
  return v;
}

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
  let mode: ApiBaseMode;
  if (raw === "prod-gateway" || raw === "prod-direct" || raw === "local" || raw === "local-gateway") {
    mode = raw;
  } else {
    mode = process.env.NODE_ENV === "development" ? "local" : "prod-gateway";
  }
  if (isProdBuild() && (mode === "local" || mode === "local-gateway")) {
    return "prod-gateway";
  }
  return mode;
}

/** Tek kök: gateway host veya doğrudan rent host (moda göre). */
export function resolveBaseApiUrl(): string {
  const override = effectiveEnvUrl(process.env.NEXT_PUBLIC_BASE_API_URL);
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
  const override = effectiveEnvUrl(process.env.NEXT_PUBLIC_AUTH_API_BASE);
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
  const override = effectiveEnvUrl(process.env.NEXT_PUBLIC_RENT_API_BASE);
  if (override) return stripTrailingSlash(override);
  const legacy = effectiveEnvUrl(process.env.NEXT_PUBLIC_RENTAL_REQUEST_API_BASE);
  if (legacy) return stripTrailingSlash(legacy);
  const mode = resolveMode();
  if (mode === "prod-gateway" || mode === "local-gateway") {
    return `${resolveBaseApiUrl()}/rent`;
  }
  return resolveBaseApiUrl();
}
