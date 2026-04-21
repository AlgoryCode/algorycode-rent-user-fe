"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { loginBasic, loginWithGoogleIdToken } from "@/lib/authApi";
import { clearBffBearerCache } from "@/lib/bff-access-token";
import { setStoredAuthUser } from "@/lib/authSession";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Giriş sonrası yönlendirme (örn. `next` query) */
  redirectTo?: string;
  onLoggedIn?: () => void;
};

export function LoginModal({ open, onClose, redirectTo = "/", onLoggedIn }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const finish = useCallback(() => {
    clearBffBearerCache();
    onLoggedIn?.();
    onClose();
    const target = redirectTo.startsWith("/") ? redirectTo : "/";
    router.push(target);
    router.refresh();
  }, [onClose, onLoggedIn, redirectTo, router]);

  const onLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await loginBasic(email.trim(), password);
      setStoredAuthUser({
        userId: res.userId,
        email: res.email || email.trim(),
        fullName: [res.firstName, res.lastName].filter(Boolean).join(" ").trim() || undefined,
      });
      finish();
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
      setStoredAuthUser({
        userId: res.userId,
        email: res.email,
        fullName: [res.firstName, res.lastName].filter(Boolean).join(" ").trim() || undefined,
      });
      finish();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Google giriş başarısız.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const modal = (
    <div className="fixed inset-0 z-[200] flex items-end justify-center p-3 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="Kapat"
        onClick={onClose}
      />
      <div
        className="relative z-[201] w-full max-w-md overflow-hidden rounded-2xl border border-border-subtle bg-bg-card shadow-2xl"
        role="dialog"
        aria-modal
        aria-labelledby="login-modal-title"
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3 sm:px-5">
          <h2 id="login-modal-title" className="text-lg font-semibold text-text">
            Giriş yap
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm font-medium text-text-muted transition-colors hover:bg-bg-raised hover:text-text"
          >
            Kapat
          </button>
        </div>

        <div className="max-h-[min(85dvh,640px)] overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          <p className="text-sm text-text-muted">
            E-posta ve şifre veya Google ile giriş yapın.
          </p>

          <form
            className="mt-5 space-y-3 rounded-xl border border-border-subtle bg-bg-raised/40 p-4"
            onSubmit={(e) => {
              e.preventDefault();
              void onLogin();
            }}
          >
            <label className="block text-xs font-medium text-text-muted">
              E-posta
              <input
                className="mt-1.5 w-full rounded-lg border border-border-subtle bg-bg-card px-3 py-2.5 text-sm text-text"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="block text-xs font-medium text-text-muted">
              Şifre
              <input
                className="mt-1.5 w-full rounded-lg border border-border-subtle bg-bg-card px-3 py-2.5 text-sm text-text"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-btn-solid py-2.5 text-sm font-semibold text-btn-solid-fg disabled:opacity-60"
            >
              {loading ? "Giriş yapılıyor..." : "Giriş yap"}
            </button>
          </form>

          <div className="mt-3 space-y-2 rounded-xl border border-border-subtle bg-bg-raised/40 p-4">
            <p className="text-xs font-medium text-text-muted">Google ile giriş</p>
            <div className="flex justify-center">
              <GoogleSignInButton onCredential={(t) => void onGoogle(t)} disabled={loading} />
            </div>
          </div>

          {error ? <p className="mt-3 text-xs text-rose-400">{error}</p> : null}

          <p className="mt-4 text-center text-xs text-text-muted">
            Hesabın yok mu?{" "}
            <Link
              className="font-medium text-accent"
              href={`/uye-ol?next=${encodeURIComponent(redirectTo)}`}
              onClick={onClose}
            >
              Üye ol
            </Link>
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
