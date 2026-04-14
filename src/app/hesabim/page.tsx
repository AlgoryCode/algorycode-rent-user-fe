"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { useToast } from "@/components/ui/ToastProvider";
import {
  activateTwoFactor,
  changePassword,
  disableTwoFactor,
  fetchMyProfile,
  patchMyProfile,
  setupTwoFactor,
  type MyProfileResponse,
  type TwoFactorSetupResponse,
} from "@/lib/authApi";
import { resolveBffAccessToken } from "@/lib/bff-access-token";
import { clearClientAuthSession, getStoredAuthUser, readUserIdFromJwt, setStoredAuthUser } from "@/lib/authSession";
import { fetchRentalRequestsFromRentApi, fetchRentalsFromRentApi } from "@/lib/rentApi";
import { compareIso } from "@/lib/calendarGrid";
import { formatTrDate } from "@/lib/dates";

function HesabimPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<MyProfileResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"profil" | "guvenlik" | "bildirim" | "rezervasyonlar">("profil");
  const [reservationTab, setReservationTab] = useState<"gecmis" | "talepler">("gecmis");
  const [reservationsLoading, setReservationsLoading] = useState(false);
  const [reservationsError, setReservationsError] = useState<string | null>(null);
  const [rentalRows, setRentalRows] = useState<ReservationRow[]>([]);
  const [requestRows, setRequestRows] = useState<ReservationRow[]>([]);
  const [reservationQuery, setReservationQuery] = useState("");
  const [reservationFrom, setReservationFrom] = useState("");
  const [reservationTo, setReservationTo] = useState("");
  const { showToast } = useToast();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [notifyEmailImportant, setNotifyEmailImportant] = useState(false);
  const [notifyScanAlerts, setNotifyScanAlerts] = useState(false);
  const [notifyWeeklyReport, setNotifyWeeklyReport] = useState(false);
  const [notifyMarketingEmails, setNotifyMarketingEmails] = useState(false);
  const [notifyPushBrowser, setNotifyPushBrowser] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordRepeat, setNewPasswordRepeat] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  const [twoFaSetup, setTwoFaSetup] = useState<TwoFactorSetupResponse | null>(null);
  const [twoFaCode, setTwoFaCode] = useState("");
  const [twoFaBusy, setTwoFaBusy] = useState(false);

  const [auth, setAuth] = useState<{ accessToken: string; userId: number } | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const t = await resolveBffAccessToken();
      if (cancelled) return;
      if (!t) {
        setAuth(null);
        setSessionChecked(true);
        setLoading(false);
        return;
      }
      const stored = getStoredAuthUser();
      const userId = stored?.userId ?? readUserIdFromJwt(t);
      if (!userId) {
        setAuth(null);
        setSessionChecked(true);
        setLoading(false);
        return;
      }
      setAuth({ accessToken: t, userId });
      setSessionChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "profil" || tab === "guvenlik" || tab === "bildirim" || tab === "rezervasyonlar") {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    const load = async () => {
      if (!auth) {
        setLoading(false);
        return;
      }
      try {
        const p = await fetchMyProfile(auth.accessToken, auth.userId);
        setProfile(p);
        setFirstName(p.firstName || "");
        setLastName(p.lastName || "");
        setEmail(p.email || "");
        setPhoneNumber(p.phoneNumber || "");
        setNotifyEmailImportant(Boolean(p.notifyEmailImportant));
        setNotifyScanAlerts(Boolean(p.notifyScanAlerts));
        setNotifyWeeklyReport(Boolean(p.notifyWeeklyReport));
        setNotifyMarketingEmails(Boolean(p.notifyMarketingEmails));
        setNotifyPushBrowser(Boolean(p.notifyPushBrowser));
        setStoredAuthUser({
          userId: p.userId,
          email: p.email,
          phone: p.phoneNumber,
          fullName: `${p.firstName || ""} ${p.lastName || ""}`.trim() || undefined,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Profil yüklenemedi.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [auth]);

  useEffect(() => {
    const loadReservations = async () => {
      if (!auth || !profile || activeTab !== "rezervasyonlar") return;
      setReservationsLoading(true);
      setReservationsError(null);
      try {
        const [rentalsRaw, requestsRaw] = await Promise.all([
          fetchRentalsFromRentApi().catch(() => []),
          fetchRentalRequestsFromRentApi().catch(() => []),
        ]);
        const identity = {
          email: (profile.email || "").toLowerCase(),
          phone: (profile.phoneNumber || "").replace(/\D/g, ""),
          fullName: `${profile.firstName || ""} ${profile.lastName || ""}`.trim().toLowerCase(),
        };
        const localRequests = readLocalReservationSnapshots();
        const mappedRentals = (Array.isArray(rentalsRaw) ? rentalsRaw : [])
          .map((x, i) => mapReservationRow(x, "rental", i))
          .filter((x): x is ReservationRow => x !== null)
          .filter((x) => matchesUserIdentity(x, identity));
        const mappedRequests = [
          ...(Array.isArray(requestsRaw) ? requestsRaw : []).map((x, i) => mapReservationRow(x, "request", i)),
          ...localRequests,
        ]
          .filter((x): x is ReservationRow => x !== null)
          .filter((x) => matchesUserIdentity(x, identity));

        const uniqueRequests = Array.from(new Map(mappedRequests.map((r) => [r.referenceNo || r.id, r])).values());
        setRentalRows(mappedRentals.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
        setRequestRows(uniqueRequests.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
      } catch (e) {
        setReservationsError(e instanceof Error ? e.message : "Rezervasyonlar yüklenemedi.");
      } finally {
        setReservationsLoading(false);
      }
    };
    void loadReservations();
  }, [activeTab, auth, profile]);

  if (!sessionChecked) {
    return (
      <SiteLayout>
        <main className="mx-auto max-w-xl px-4 pb-20 pt-28 text-center sm:px-6">
          <h1 className="text-2xl font-semibold text-text">Hesabım</h1>
          <p className="mt-6 text-sm text-text-muted">Oturum kontrol ediliyor…</p>
        </main>
      </SiteLayout>
    );
  }

  if (!auth) {
    return (
      <SiteLayout>
        <main className="mx-auto max-w-xl px-4 pb-20 pt-28 text-center sm:px-6">
          <h1 className="text-2xl font-semibold text-text">Hesabım</h1>
          <p className="mt-3 text-sm text-text-muted">Bu alanı görmek için giriş yapmalısın.</p>
          <Link href="/giris-yap?next=/hesabim" className="mt-6 inline-flex rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white">
            Giriş Yap
          </Link>
        </main>
      </SiteLayout>
    );
  }

  const onSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await patchMyProfile(auth.accessToken, profile.userId, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
        notifyEmailImportant,
        notifyScanAlerts,
        notifyWeeklyReport,
        notifyMarketingEmails,
        notifyPushBrowser,
      });
      setProfile(updated);
      setStoredAuthUser({
        userId: updated.userId,
        email: updated.email,
        phone: updated.phoneNumber,
        fullName: `${updated.firstName || ""} ${updated.lastName || ""}`.trim() || undefined,
      });
      showToast("Profil güncellendi.", "success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Profil güncellenemedi.");
    } finally {
      setSaving(false);
    }
  };

  const onChangePassword = async () => {
    if (!profile) return;
    if (newPassword !== newPasswordRepeat) {
      setError("Yeni şifreler eşleşmiyor.");
      return;
    }
    setChangingPw(true);
    setError(null);
    try {
      await changePassword(auth.accessToken, profile.userId, currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordRepeat("");
      showToast("Şifre başarıyla değiştirildi.", "success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Şifre değiştirilemedi.");
    } finally {
      setChangingPw(false);
    }
  };

  const onSetup2fa = async () => {
    if (!profile) return;
    setTwoFaBusy(true);
    setError(null);
    try {
      const setup = await setupTwoFactor(auth.accessToken, profile.userId);
      setTwoFaSetup(setup);
      showToast("2FA kurulumu hazır. QR kodunu okutun.", "success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "2FA setup açılamadı.");
    } finally {
      setTwoFaBusy(false);
    }
  };

  const onActivate2fa = async () => {
    if (!profile) return;
    setTwoFaBusy(true);
    setError(null);
    try {
      await activateTwoFactor(auth.accessToken, profile.userId, twoFaCode.trim());
      setProfile({ ...profile, twoFactorEnabled: true });
      setTwoFaCode("");
      setTwoFaSetup(null);
      showToast("2FA aktif edildi.", "success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "2FA aktifleştirilemedi.");
    } finally {
      setTwoFaBusy(false);
    }
  };

  const onDisable2fa = async () => {
    if (!profile) return;
    setTwoFaBusy(true);
    setError(null);
    try {
      await disableTwoFactor(auth.accessToken, profile.userId, twoFaCode.trim());
      setProfile({ ...profile, twoFactorEnabled: false });
      setTwoFaCode("");
      showToast("2FA kapatıldı.", "success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "2FA kapatılamadı.");
    } finally {
      setTwoFaBusy(false);
    }
  };

  const filteredRentals = filterReservationRows(rentalRows, reservationQuery, reservationFrom, reservationTo);
  const filteredRequests = filterReservationRows(requestRows, reservationQuery, reservationFrom, reservationTo);

  return (
    <SiteLayout>
      <main className="mx-auto w-full max-w-3xl px-4 pb-20 pt-28 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-text">Hesabım</h1>
            <p className="mt-2 text-sm text-text-muted">Profil, şifre ve güvenlik ayarları.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              void (async () => {
                await clearClientAuthSession();
                router.push("/");
              })();
            }}
            className="rounded-lg border border-border-subtle px-4 py-2 text-sm font-semibold text-text"
          >
            Çıkış yap
          </button>
        </div>

        {loading && <p className="mt-6 text-sm text-text-muted">Yükleniyor...</p>}
        {error && <p className="mt-4 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}

        {!loading && profile && (
          <div className="mt-6 space-y-5">
            <div className="inline-flex rounded-xl border border-border-subtle bg-bg-card/50 p-1">
              <TabButton active={activeTab === "profil"} onClick={() => setActiveTab("profil")}>Profil</TabButton>
              <TabButton active={activeTab === "guvenlik"} onClick={() => setActiveTab("guvenlik")}>Güvenlik</TabButton>
              <TabButton active={activeTab === "bildirim"} onClick={() => setActiveTab("bildirim")}>Bildirim</TabButton>
              <TabButton active={activeTab === "rezervasyonlar"} onClick={() => setActiveTab("rezervasyonlar")}>Rezervasyonlarım</TabButton>
            </div>

            {activeTab === "profil" && (
              <section className="rounded-xl border border-border-subtle bg-bg-card/60 p-4">
                <h2 className="text-base font-semibold text-text">Profil</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="text-xs text-text-muted">Ad
                    <input className="mt-1.5 w-full rounded-lg border border-border-subtle bg-bg-card px-3 py-2.5 text-sm text-text" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </label>
                  <label className="text-xs text-text-muted">Soyad
                    <input className="mt-1.5 w-full rounded-lg border border-border-subtle bg-bg-card px-3 py-2.5 text-sm text-text" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </label>
                  <label className="text-xs text-text-muted">E-posta
                    <input className="mt-1.5 w-full rounded-lg border border-border-subtle bg-bg-card px-3 py-2.5 text-sm text-text" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </label>
                  <label className="text-xs text-text-muted">Telefon
                    <input className="mt-1.5 w-full rounded-lg border border-border-subtle bg-bg-card px-3 py-2.5 text-sm text-text" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
                  </label>
                </div>
                <button type="button" onClick={() => void onSaveProfile()} disabled={saving} className="mt-4 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                  {saving ? "Kaydediliyor..." : "Profili Kaydet"}
                </button>
              </section>
            )}

            {activeTab === "bildirim" && (
              <section className="rounded-xl border border-border-subtle bg-bg-card/60 p-4">
                <h2 className="text-base font-semibold text-text">Bildirim tercihleri</h2>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <ToggleItem label="Önemli e-postalar" checked={notifyEmailImportant} onChange={setNotifyEmailImportant} />
                  <ToggleItem label="Tarama alarmları" checked={notifyScanAlerts} onChange={setNotifyScanAlerts} />
                  <ToggleItem label="Haftalık rapor" checked={notifyWeeklyReport} onChange={setNotifyWeeklyReport} />
                  <ToggleItem label="Pazarlama e-postaları" checked={notifyMarketingEmails} onChange={setNotifyMarketingEmails} />
                  <ToggleItem label="Tarayıcı push" checked={notifyPushBrowser} onChange={setNotifyPushBrowser} />
                </div>
                <button type="button" onClick={() => void onSaveProfile()} disabled={saving} className="mt-4 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                  {saving ? "Kaydediliyor..." : "Tercihleri Kaydet"}
                </button>
              </section>
            )}

            {activeTab === "rezervasyonlar" && (
              <section className="rounded-xl border border-border-subtle bg-bg-card/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-base font-semibold text-text">Rezervasyonlarım</h2>
                  <Link href="/araclar" className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white">
                    Yeni rezervasyon oluştur
                  </Link>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <TabButton active={reservationTab === "gecmis"} onClick={() => setReservationTab("gecmis")}>Geçmiş rezervasyonlar</TabButton>
                  <TabButton active={reservationTab === "talepler"} onClick={() => setReservationTab("talepler")}>Rezervasyon talepleri</TabButton>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-4">
                  <input
                    className="rounded-lg border border-border-subtle bg-bg-card px-3 py-2 text-sm text-text sm:col-span-2"
                    placeholder="Marka, model, plaka, referans..."
                    value={reservationQuery}
                    onChange={(e) => setReservationQuery(e.target.value)}
                  />
                  <label className="text-xs text-text-muted">Başlangıç
                    <input type="date" value={reservationFrom} onChange={(e) => setReservationFrom(e.target.value)} className="mt-1.5 w-full rounded-lg border border-border-subtle bg-bg-card px-3 py-2 text-sm text-text" />
                  </label>
                  <label className="text-xs text-text-muted">Bitiş
                    <input type="date" value={reservationTo} onChange={(e) => setReservationTo(e.target.value)} className="mt-1.5 w-full rounded-lg border border-border-subtle bg-bg-card px-3 py-2 text-sm text-text" />
                  </label>
                </div>

                {reservationsLoading && <p className="mt-3 text-sm text-text-muted">Rezervasyonlar yükleniyor...</p>}
                {reservationsError && <p className="mt-3 text-sm text-rose-300">{reservationsError}</p>}

                {!reservationsLoading && (
                  <div className="mt-3 space-y-2">
                    {(reservationTab === "gecmis" ? filteredRentals : filteredRequests).map((r) => (
                      <article key={`${r.kind}-${r.id}`} className="rounded-lg border border-border-subtle/80 bg-bg-raised/30 p-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-text">{r.vehicleBrand} {r.vehicleName}</p>
                            <p className="text-xs text-text-muted">
                              {formatTrDate(r.startDate)} → {formatTrDate(r.endDate)}
                              {r.plate ? ` · Plaka: ${r.plate}` : ""}
                              {r.referenceNo ? ` · Ref: ${r.referenceNo}` : ""}
                            </p>
                          </div>
                          <span className="rounded-md border border-border-subtle px-2 py-1 text-[11px] text-text-muted">{r.status || "Beklemede"}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {r.vehicleId && (
                            <Link href={`/arac/${r.vehicleId}`} className="text-xs font-medium text-accent hover:underline">
                              Kiralama detayına git
                            </Link>
                          )}
                          <span className="text-[11px] text-text-muted">Oluşturma: {formatTrDate(r.createdAt)}</span>
                        </div>
                      </article>
                    ))}
                    {(reservationTab === "gecmis" ? filteredRentals : filteredRequests).length === 0 && (
                      <div className="rounded-lg border border-border-subtle/80 bg-bg-raised/20 px-3 py-4 text-center">
                        {rentalRows.length === 0 && requestRows.length === 0 ? (
                          <>
                            <div className="text-4xl mb-2">🚗</div>
                            <p className="text-sm font-medium text-text mb-2">Henüz hiç rezervasyonunuz bulunmuyor</p>
                            <p className="text-xs text-text-muted mb-3">
                              Hayalinizdeki aracı keşfedin ve unutulmaz bir yolculuğa adım atın!
                            </p>
                            <Link href="/araclar" className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-accent/90">
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                              Araçları Keşfet
                            </Link>
                          </>
                        ) : (
                          <p className="text-sm text-text-muted">
                            Bu filtrelerde sonuç bulunamadı.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            {activeTab === "guvenlik" && (
              <>
                <section className="rounded-xl border border-border-subtle bg-bg-card/60 p-4">
                  <h2 className="text-base font-semibold text-text">Şifre değiştir</h2>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <label className="text-xs text-text-muted">Mevcut şifre
                      <input type="password" className="mt-1.5 w-full rounded-lg border border-border-subtle bg-bg-card px-3 py-2.5 text-sm text-text" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                    </label>
                    <label className="text-xs text-text-muted">Yeni şifre
                      <input type="password" className="mt-1.5 w-full rounded-lg border border-border-subtle bg-bg-card px-3 py-2.5 text-sm text-text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                    </label>
                    <label className="text-xs text-text-muted">Yeni şifre (tekrar)
                      <input type="password" className="mt-1.5 w-full rounded-lg border border-border-subtle bg-bg-card px-3 py-2.5 text-sm text-text" value={newPasswordRepeat} onChange={(e) => setNewPasswordRepeat(e.target.value)} />
                    </label>
                  </div>
                  <button type="button" onClick={() => void onChangePassword()} disabled={changingPw || !currentPassword || !newPassword || !newPasswordRepeat} className="mt-4 rounded-lg border border-border-subtle px-4 py-2.5 text-sm font-semibold text-text disabled:opacity-60">
                    {changingPw ? "Güncelleniyor..." : "Şifreyi Güncelle"}
                  </button>
                </section>

                <section className="rounded-xl border border-border-subtle bg-bg-card/60 p-4">
                  <h2 className="text-base font-semibold text-text">2FA (Authenticator)</h2>
                  <p className="mt-1 text-xs text-text-muted">Durum: {profile.twoFactorEnabled ? "Aktif" : "Pasif"}</p>

                  {!profile.twoFactorEnabled && (
                    <button type="button" onClick={() => void onSetup2fa()} disabled={twoFaBusy} className="mt-3 rounded-lg border border-border-subtle px-4 py-2.5 text-sm font-semibold text-text disabled:opacity-60">
                      {twoFaBusy ? "Hazırlanıyor..." : "2FA Kurulumu Başlat"}
                    </button>
                  )}

                  {twoFaSetup && (
                    <div className="mt-4 rounded-lg border border-border-subtle/70 bg-bg-raised/30 p-3">
                      <p className="text-xs text-text-muted">Authenticator ile QR’ı okutun:</p>
                      {twoFaSetup.qrImageBase64 && (
                        <Image
                          src={`data:image/png;base64,${twoFaSetup.qrImageBase64}`}
                          alt="2FA QR"
                          width={160}
                          height={160}
                          unoptimized
                          className="mt-2 h-40 w-40 rounded-md border border-border-subtle bg-white p-1"
                        />
                      )}
                      <p className="mt-2 break-all text-[11px] text-text-muted">Secret: {twoFaSetup.secret}</p>
                      {twoFaSetup.otpAuthUri && (
                        <a
                          href={twoFaSetup.otpAuthUri}
                          className="mt-2 inline-flex rounded-md border border-border-subtle px-2.5 py-1 text-xs text-text hover:border-accent/30 hover:text-accent"
                        >
                          Uygulamada aç
                        </a>
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                    <label className="text-xs text-text-muted">6 haneli kod
                      <input className="mt-1.5 w-full rounded-lg border border-border-subtle bg-bg-card px-3 py-2.5 text-sm text-text" value={twoFaCode} onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" />
                    </label>
                    {!profile.twoFactorEnabled ? (
                      <button type="button" onClick={() => void onActivate2fa()} disabled={twoFaBusy || twoFaCode.length !== 6} className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                        2FA Aktifleştir
                      </button>
                    ) : (
                      <button type="button" onClick={() => void onDisable2fa()} disabled={twoFaBusy || twoFaCode.length !== 6} className="rounded-lg border border-border-subtle px-4 py-2.5 text-sm font-semibold text-text disabled:opacity-60">
                        2FA Kapat
                      </button>
                    )}
                  </div>
                </section>
              </>
            )}
          </div>
        )}
      </main>
    </SiteLayout>
  );
}

export default function HesabimPage() {
  return (
    <Suspense
      fallback={
        <SiteLayout>
          <main className="mx-auto max-w-xl px-4 pb-20 pt-28 sm:px-6">
            <div className="h-8 w-36 animate-pulse rounded bg-border-subtle" />
            <div className="mt-4 h-4 w-full max-w-md animate-pulse rounded bg-border-subtle" />
            <div className="mt-8 h-72 animate-pulse rounded-xl bg-border-subtle/60" />
          </main>
        </SiteLayout>
      }
    >
      <HesabimPageContent />
    </Suspense>
  );
}

type ReservationRow = {
  id: string;
  kind: "rental" | "request";
  status: string;
  referenceNo?: string;
  vehicleId?: string;
  vehicleName: string;
  vehicleBrand: string;
  plate?: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
};

function asObj(v: unknown): Record<string, unknown> {
  return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};
}

function getString(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function normalizeIsoLike(s: string): string {
  const candidate = s.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : s;
}

function mapReservationRow(raw: unknown, kind: "rental" | "request", i: number): ReservationRow | null {
  const obj = asObj(raw);
  const vehicle = asObj(obj.vehicle);
  const customer = asObj(obj.customer);

  const id = getString(obj, ["id", "requestId", "rentalId"]) || `${kind}-${i}`;
  const startDate = normalizeIsoLike(getString(obj, ["startDate", "pickupDate", "rentStart", "alis"]) || "");
  const endDate = normalizeIsoLike(getString(obj, ["endDate", "returnDate", "rentEnd", "teslim"]) || "");
  if (!startDate || !endDate) return null;

  const createdAt =
    normalizeIsoLike(getString(obj, ["createdAt", "createdDate", "requestDate", "updatedAt"])) ||
    startDate;

  const vehicleName = getString(vehicle, ["name", "model"]) || getString(obj, ["vehicleName", "model"]) || "Araç";
  const vehicleBrand = getString(vehicle, ["brand"]) || getString(obj, ["vehicleBrand", "brand"]) || "-";

  return {
    id,
    kind,
    status: getString(obj, ["status", "statusName", "requestStatus"]) || "Beklemede",
    referenceNo: getString(obj, ["referenceNo", "reference", "referenceNumber"]) || undefined,
    vehicleId: getString(obj, ["vehicleId"]) || getString(vehicle, ["id"]) || undefined,
    vehicleName,
    vehicleBrand,
    plate: getString(vehicle, ["plate"]) || getString(obj, ["plate"]) || undefined,
    startDate,
    endDate,
    createdAt,
    customerEmail: getString(customer, ["email"]) || getString(obj, ["email"]) || undefined,
    customerPhone: getString(customer, ["phone"]) || getString(obj, ["phone"]) || undefined,
    customerName:
      getString(customer, ["fullName", "name"]) || getString(obj, ["customerName", "fullName"]) || undefined,
  };
}

function matchesUserIdentity(
  row: ReservationRow,
  identity: { email: string; phone: string; fullName: string },
): boolean {
  const rEmail = (row.customerEmail || "").toLowerCase();
  const rPhone = (row.customerPhone || "").replace(/\D/g, "");
  const rName = (row.customerName || "").toLowerCase();
  if (identity.email && rEmail && identity.email === rEmail) return true;
  if (identity.phone && rPhone && identity.phone === rPhone) return true;
  if (identity.fullName && rName && identity.fullName === rName) return true;
  return false;
}

function readLocalReservationSnapshots(): ReservationRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem("rent.user.reservation.requests");
    const list = raw ? (JSON.parse(raw) as unknown[]) : [];
    return list.flatMap((x, i): ReservationRow[] => {
      const obj = asObj(x);
      const ref = getString(obj, ["referenceNo"]);
      const startDate = normalizeIsoLike(getString(obj, ["startDate"]));
      const endDate = normalizeIsoLike(getString(obj, ["endDate"]));
      if (!startDate || !endDate) return [];
      const row: ReservationRow = {
        id: getString(obj, ["referenceNo", "id"]) || `local-${i}`,
        kind: "request",
        status: getString(obj, ["status"]) || "TALEP_ALINDI",
        referenceNo: ref || undefined,
        vehicleId: getString(obj, ["vehicleId"]) || undefined,
        vehicleName: getString(obj, ["vehicleName"]) || "Araç",
        vehicleBrand: getString(obj, ["vehicleBrand"]) || "-",
        plate: getString(obj, ["plate"]) || undefined,
        startDate,
        endDate,
        createdAt: normalizeIsoLike(getString(obj, ["createdAt"])) || startDate,
        customerEmail: getString(obj, ["customerEmail"]) || undefined,
        customerPhone: getString(obj, ["customerPhone"]) || undefined,
        customerName: getString(obj, ["customerName"]) || undefined,
      };
      return [row];
    });
  } catch {
    return [];
  }
}

function filterReservationRows(rows: ReservationRow[], q: string, from: string, to: string) {
  const query = q.trim().toLowerCase();
  return rows.filter((r) => {
    if (from && compareIso(r.startDate, from) < 0) return false;
    if (to && compareIso(r.endDate, to) > 0) return false;
    if (!query) return true;
    const hay = `${r.vehicleBrand} ${r.vehicleName} ${r.plate || ""} ${r.referenceNo || ""}`.toLowerCase();
    return hay.includes(query);
  });
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${active ? "bg-accent text-white" : "text-text-muted hover:text-text"}`}
    >
      {children}
    </button>
  );
}

function ToggleItem({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-lg border border-border-subtle/70 bg-bg-raised/30 px-3 py-2 text-sm text-text">
      <span>{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`inline-flex h-6 w-11 items-center rounded-full p-1 transition-colors ${checked ? "bg-accent" : "bg-border-subtle"}`}
        aria-pressed={checked}
      >
        <span className={`h-4 w-4 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`} />
      </button>
    </label>
  );
}
