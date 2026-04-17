import { postAuthGuestAccess } from "@/lib/server/authGuestAccessPost";

export const dynamic = "force-dynamic";

/** Birincil BFF URL: `POST /api/auth/guest/access-token` — AuthService `POST /guest/access-token` ile hizalı. */
export const POST = postAuthGuestAccess;
