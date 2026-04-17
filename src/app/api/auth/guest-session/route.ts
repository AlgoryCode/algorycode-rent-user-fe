import { postAuthGuestAccess } from "@/lib/server/authGuestAccessPost";

export const dynamic = "force-dynamic";

/** Geriye dönük: `POST /api/auth/guest-session` — yeni istemciler `/api/auth/guest/access-token` kullanmalı. */
export const POST = postAuthGuestAccess;
