/**
 * `NEXT_PUBLIC_BASE_API_URL` **doluysa:** gateway kökü kabul edilir → auth `{base}/authservice`, rent `{base}/rent`.
 *
 * **Boşsa:**
 * - `next dev` → doğrudan servisler (auth `8099`, rent `8090`), gateway açmana gerek yok.
 * - production build → `https://gateway.algorycode.com` + aynı path kuralı.
 *
 * Yerelde gateway üzerinden denemek için: `NEXT_PUBLIC_BASE_API_URL=http://localhost:8072`
 * Prod’da yanlışlıkla localhost gömülürse üretim gateway kökü kullanılır.
 */

const stripTrailingSlash = (s: string) => s.replace(/\/+$/, "");

const defaultLocalAuth = "http://localhost:8099";
const defaultLocalRent = "http://localhost:8090";
const defaultProdGateway = "https://gateway.algorycode.com";

function isLoopbackHttpUrl(url: string): boolean {
  try {
    const h = new URL(url).hostname;
    return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
  } catch {
    return false;
  }
}

/** Açıkça verilen kök = gateway host’u (path’ler kodda eklenir). */
function hasExplicitGatewayBase(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_BASE_API_URL?.trim());
}

function resolveGatewayBase(): string {
  const raw = process.env.NEXT_PUBLIC_BASE_API_URL?.trim();
  if (raw) {
    const url = stripTrailingSlash(raw);
    if (process.env.NODE_ENV === "production" && isLoopbackHttpUrl(url)) {
      return stripTrailingSlash(defaultProdGateway);
    }
    return url;
  }
  return stripTrailingSlash(defaultProdGateway);
}

/**
 * Gateway kökü (yalnızca gateway layout’unda anlamlı).
 * `next dev` + BASE boşken rent host’u döner (tek “API host” önizlemesi için).
 */
export function resolveBaseApiUrl(): string {
  if (hasExplicitGatewayBase() || process.env.NODE_ENV !== "development") {
    return resolveGatewayBase();
  }
  return stripTrailingSlash(defaultLocalRent);
}

export const baseApiUrl = resolveBaseApiUrl();

export function getAuthApiRoot(): string {
  if (hasExplicitGatewayBase() || process.env.NODE_ENV !== "development") {
    return `${resolveGatewayBase()}/authservice`;
  }
  return stripTrailingSlash(defaultLocalAuth);
}

export function getRentApiRoot(): string {
  if (hasExplicitGatewayBase() || process.env.NODE_ENV !== "development") {
    return `${resolveGatewayBase()}/rent`;
  }
  return stripTrailingSlash(defaultLocalRent);
}
