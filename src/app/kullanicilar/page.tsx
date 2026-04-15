"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { useToast } from "@/components/ui/ToastProvider";
import { registerBasic } from "@/lib/authApi";

export default function KullanicilarPage() {
  const { showToast } = useToast();
  const modalTitleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setError(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLInputElement>("input")?.focus();
  }, [open]);

  const onSubmit = async () => {
    setError(null);
    const fn = firstName.trim();
    const ln = lastName.trim();
    const em = email.trim();
    const ph = phone.trim();
    const pw = password;
    if (!fn || !ln) {
      setError("Ad ve soyad zorunludur.");
      return;
    }
    if (!em) {
      setError("E-posta zorunludur.");
      return;
    }
    if (!ph) {
      setError("Telefon zorunludur.");
      return;
    }
    if (!pw || pw.length < 6) {
      setError("Şifre en az 6 karakter olmalıdır.");
      return;
    }
    setLoading(true);
    try {
      await registerBasic({
        firstName: fn,
        lastName: ln,
        email: em,
        password: pw,
        phoneNumber: ph,
        registrationRole: "RENT_USER",
      });
      showToast("Kullanıcı RENT_USER rolü ile oluşturuldu.", "success");
      resetForm();
      setOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Kullanıcı eklenemedi.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SiteLayout>
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-28 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-text">Kullanıcılar</h1>
            <p className="mt-2 max-w-xl text-sm text-text-muted">
              Yeni kullanıcılar <strong className="font-medium text-text">RENT_USER</strong> rolü ile kaydedilir. Bu sayfa yalnızca{" "}
              <strong className="font-medium text-text">RENT_MANAGER</strong> / <strong className="font-medium text-text">RENT_ADMIN</strong>{" "}
              için açıktır.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setOpen(true);
            }}
            className="shrink-0 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg shadow-sm transition-shadow hover:shadow-md"
          >
            Kullanıcı ekle
          </button>
        </div>

        {open && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={modalTitleId}
              className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-border-subtle bg-bg-card p-4 shadow-xl"
            >
              <h2 id={modalTitleId} className="text-lg font-semibold text-text">
                Yeni kullanıcı
              </h2>
              <p className="mt-1 text-xs text-text-muted">Rol: RENT_USER (sabit)</p>

              <form
                className="mt-4 space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void onSubmit();
                }}
              >
                <label className="block text-xs font-medium text-text-muted">
                  Ad
                  <input
                    className="mt-1.5 w-full rounded-lg border border-border-subtle bg-bg-raised px-3 py-2.5 text-sm text-text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoComplete="given-name"
                  />
                </label>
                <label className="block text-xs font-medium text-text-muted">
                  Soyad
                  <input
                    className="mt-1.5 w-full rounded-lg border border-border-subtle bg-bg-raised px-3 py-2.5 text-sm text-text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    autoComplete="family-name"
                  />
                </label>
                <label className="block text-xs font-medium text-text-muted">
                  E-posta
                  <input
                    className="mt-1.5 w-full rounded-lg border border-border-subtle bg-bg-raised px-3 py-2.5 text-sm text-text"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </label>
                <label className="block text-xs font-medium text-text-muted">
                  Telefon
                  <input
                    className="mt-1.5 w-full rounded-lg border border-border-subtle bg-bg-raised px-3 py-2.5 text-sm text-text"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                  />
                </label>
                <label className="block text-xs font-medium text-text-muted">
                  Şifre
                  <input
                    className="mt-1.5 w-full rounded-lg border border-border-subtle bg-bg-raised px-3 py-2.5 text-sm text-text"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </label>

                {error && <p className="text-xs text-rose-400">{error}</p>}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-lg border border-border-subtle px-4 py-2 text-sm font-semibold text-text hover:bg-bg-raised/80"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg disabled:opacity-60"
                  >
                    {loading ? "Kaydediliyor…" : "Kaydet"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </SiteLayout>
  );
}
