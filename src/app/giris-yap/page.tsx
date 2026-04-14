"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { loginBasic, loginWithGoogleIdToken } from "@/lib/authApi";
import { clearBffBearerCache } from "@/lib/bff-access-token";
import { setStoredAuthUser } from "@/lib/authSession";

function GirisYapPageContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next = sp.get("next") || "/";

  const onLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await loginBasic(email.trim(), password);
      clearBffBearerCache();
      setStoredAuthUser({
        userId: res.userId,
        email: res.email || email.trim(),
        fullName: [res.firstName, res.lastName].filter(Boolean).join(" ").trim() || undefined,
      });
      router.push(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Giriş başarısız.");
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async (idToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await loginWithGoogleIdToken(idToken);
      clearBffBearerCache();
      setStoredAuthUser({
        userId: res.userId,
        email: res.email,
        fullName: [res.firstName, res.lastName].filter(Boolean).join(" ").trim() || undefined,
      });
      router.push(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Google giriş başarısız.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SiteLayout>
      <main className="mx-auto w-full max-w-md px-4 pb-20 pt-28 sm:px-6">
        <h1 className="text-2xl font-semibold text-text">Giriş Yap</h1>
        <p className="mt-2 text-sm text-text-muted">E-posta/şifre ile veya Google hesabınızı seçerek giriş yapabilirsiniz.</p>

        <form className="mt-8 space-y-4 rounded-xl border border-border-subtle bg-bg-card/60 p-4" onSubmit={(e) => { e.preventDefault(); void onLogin(); }}>
          <label className="block text-xs font-medium text-text-muted">
            E-posta
            <input className="mt-1.5 w-full rounded-lg border border-border-subtle bg-bg-card px-3 py-2.5 text-sm text-text" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="block text-xs font-medium text-text-muted">
            Şifre
            <input className="mt-1.5 w-full rounded-lg border border-border-subtle bg-bg-card px-3 py-2.5 text-sm text-text" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <button type="submit" disabled={loading} className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-white disabled:opacity-60">{loading ? "Giriş yapılıyor..." : "Giriş Yap"}</button>
        </form>

        <div className="mt-3 space-y-2 rounded-xl border border-border-subtle bg-bg-card/60 p-4">
          <p className="text-xs font-medium text-text-muted">Google ile giriş</p>
          <div className="flex justify-center">
            <GoogleSignInButton onCredential={(t) => void onGoogle(t)} disabled={loading} />
          </div>
        </div>

        {error && <p className="mt-3 text-xs text-rose-300">{error}</p>}

        <p className="mt-4 text-xs text-text-muted">
          Hesabın yok mu? <Link className="text-accent" href={`/uye-ol?next=${encodeURIComponent(next)}`}>Üye Ol</Link>
        </p>
      </main>
    </SiteLayout>
  );
}

export default function GirisYapPage() {
  return (
    <Suspense
      fallback={
        <SiteLayout>
          <main className="mx-auto w-full max-w-md px-4 pb-20 pt-28 sm:px-6">
            <div className="h-8 w-40 animate-pulse rounded bg-border-subtle" />
            <div className="mt-4 h-4 w-full max-w-sm animate-pulse rounded bg-border-subtle" />
            <div className="mt-8 h-64 animate-pulse rounded-xl bg-border-subtle/60" />
          </main>
        </SiteLayout>
      }
    >
      <GirisYapPageContent />
    </Suspense>
  );
}
