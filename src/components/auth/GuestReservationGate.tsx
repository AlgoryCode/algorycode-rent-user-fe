"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { checkEmailRegisteredOnBff, startRentGuestSessionOnBff } from "@/lib/guestAuthClient";
import { RentIconBackButton } from "@/components/ui/RentIconBack";

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

type Props = {
  /** Tam path + query; giriş yönlendirmesi `next` parametresi için. */
  nextLoginHref: string;
  /** Misafir çerezleri set edildikten sonra (e-posta ön doldurma için). */
  onAuthenticated: (email: string) => void;
  variant?: "fullscreen" | "embedded";
  /** embedded: üst seçim ekranına dönüş */
  onCancelEmbedded?: () => void;
  title?: string;
};

export function GuestReservationGate({
  nextLoginHref,
  onAuthenticated,
  variant = "fullscreen",
  onCancelEmbedded,
  title,
}: Props) {
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<"collect" | "registered">("collect");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [softNotice, setSoftNotice] = useState<string | null>(null);

  const loginHref = `/giris-yap?next=${encodeURIComponent(nextLoginHref.startsWith("/") ? nextLoginHref : `/${nextLoginHref}`)}`;

  const runGuestSession = useCallback(
    async (addr: string) => {
      setBusy(true);
      setError(null);
      try {
        await startRentGuestSessionOnBff(addr);
        onAuthenticated(addr.trim().toLowerCase());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Misafir oturumu açılamadı.");
      } finally {
        setBusy(false);
      }
    },
    [onAuthenticated],
  );

  const onContinue = async () => {
    setError(null);
    if (!isEmail(email)) {
      setError("Geçerli bir e-posta girin.");
      return;
    }
    setBusy(true);
    try {
      setSoftNotice(null);
      const { exists, failOpen } = await checkEmailRegisteredOnBff(email);
      if (exists) {
        setPhase("registered");
      } else {
        if (failOpen) {
          setSoftNotice(
            "E-posta kaydı doğrulanamadı; misafir oturumu yine de açılıyor. Sorun devam ederse yöneticinize bildirin.",
          );
        }
        await runGuestSession(email);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "İşlem başarısız.");
    } finally {
      setBusy(false);
    }
  };

  const onSkipCheckGuest = async () => {
    if (!isEmail(email)) {
      setError("Geçerli bir e-posta girin.");
      return;
    }
    await runGuestSession(email);
  };

  const shell =
    variant === "fullscreen"
      ? "mx-auto flex min-h-[50vh] max-w-md flex-col justify-center px-4 py-12"
      : "flex flex-col";

  const cardClass =
    variant === "fullscreen"
      ? "rounded-xl border border-border-subtle bg-bg-card/90 p-6 shadow-lg backdrop-blur-sm"
      : "rounded-lg border border-border-subtle bg-bg-raised/80 p-4";

  return (
    <div className={shell}>
      <div className={cardClass}>
        {variant === "embedded" && onCancelEmbedded && (
          <div className="mb-4">
            <RentIconBackButton onClick={onCancelEmbedded} aria-label="Geri" title="Geri" />
          </div>
        )}
        <h2 className="text-lg font-semibold text-text">
          {title ?? (phase === "registered" ? "Bu e-posta kayıtlı" : "Misafir olarak devam")}
        </h2>
        <p className="mt-2 text-sm text-text-muted">
          {phase === "registered"
            ? "Bu adresle bir hesabınız var. Giriş yaparak bilgilerinizin otomatik dolmasını sağlayabilirsiniz; dilerseniz yine de misafir olarak devam edebilirsiniz."
            : "Rezervasyon talebinizi iletmek için e-posta adresinizi girin. Oturumunuz güvenli çerezlerle saklanır."}
        </p>
        {softNotice && (
          <p className="mt-3 rounded-lg border border-border-subtle bg-bg-raised px-3 py-2.5 text-sm leading-relaxed text-text">
            {softNotice}
          </p>
        )}

        {phase === "collect" && (
          <div className="mt-4 space-y-3">
            <label className="block text-xs font-medium text-text-muted" htmlFor="guest-gate-email">
              E-posta
            </label>
            <input
              id="guest-gate-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              className="w-full rounded-md border border-border-subtle bg-bg-raised px-3 py-2.5 text-sm text-text outline-none ring-accent/0 transition-shadow focus:border-accent/40 focus:ring-2 focus:ring-accent/25"
              placeholder="ornek@eposta.com"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void onContinue()}
              className="w-full rounded-lg bg-accent px-3 py-2.5 text-sm font-semibold text-accent-fg shadow-sm disabled:opacity-60"
            >
              {busy ? "Kontrol ediliyor…" : "Devam et"}
            </button>
          </div>
        )}

        {phase === "registered" && (
          <div className="mt-4 space-y-3">
            <p className="rounded-lg border border-border-subtle bg-bg-raised px-3 py-2.5 text-sm leading-relaxed text-text">
              <span className="font-semibold text-text">Kayıtlı e-posta.</span>{" "}
              <span className="text-text-muted">Giriş yapmanız önerilir.</span>
            </p>
            <Link
              href={loginHref}
              className="flex w-full items-center justify-center rounded-lg bg-accent px-3 py-2.5 text-sm font-semibold text-accent-fg shadow-sm"
            >
              Giriş yap
            </Link>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onSkipCheckGuest()}
              className="w-full rounded-lg border border-border-subtle bg-bg-raised px-3 py-2.5 text-sm font-semibold text-text hover:border-accent/30 disabled:opacity-60"
            >
              {busy ? "Oturum açılıyor…" : "Yine de misafir olarak devam et"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setPhase("collect");
                setError(null);
              }}
              className="w-full text-center text-xs text-text-muted hover:text-text"
            >
              E-postayı düzenle
            </button>
          </div>
        )}

        {error && (
          <p
            className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/[0.08] px-3 py-2.5 text-sm leading-relaxed text-text dark:border-rose-400/35 dark:bg-rose-400/[0.12]"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
