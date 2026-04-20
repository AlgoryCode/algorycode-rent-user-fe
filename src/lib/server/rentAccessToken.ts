import { cookies } from "next/headers";

/**
 * RSC / Route Handler içinde gateway Bearer için httpOnly access JWT.
 * Tarayıcıdaki {@link resolveBffAccessToken} ile aynı çerez adları (`/api/auth/access-token` ile uyumlu).
 */
export async function getAccessTokenFromCookies(): Promise<string | null> {
  const store = await cookies();
  const t =
    store.get("accessToken")?.value?.trim() || store.get("algory_access_token")?.value?.trim() || null;
  return t || null;
}
