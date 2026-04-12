"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { FleetVehicle } from "@/data/fleet";
import { formatTry } from "@/data/fleet";
import { blockedDaysInInclusiveRange, blockedSetForVehicle } from "@/data/availability";
import { getLocationById, pickupLocations } from "@/data/locations";
import { RentalAvailabilityCalendarPanel } from "@/components/calendar/RentalAvailabilityCalendarPanel";
import { compareIso } from "@/lib/calendarGrid";
import { addDays, parseIsoDate, rentalNights, formatTrDate, todayIso, toIsoDate } from "@/lib/dates";
import { computeRentalSubtotal, crossBorderOneWaySurcharge, vehicleAbroadUsageSurcharge } from "@/lib/pricing";
import { createRentalRequestOnRentApi } from "@/lib/rentApi";
import { getStoredAuthUser, hasClientAuthToken } from "@/lib/authSession";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { LocationPinIcon } from "@/components/ui/LocationPinIcon";
import { DayPickerPopover } from "@/components/ui/DayPickerPopover";
import { RentIconBackButton, RentIconBackLink } from "@/components/ui/RentIconBack";
import { RentSelect } from "@/components/ui/RentSelect";

const steps = [
  { id: 1, title: "Tarih seçimi", short: "Tarih" },
  { id: 2, title: "Bilgileriniz", short: "Bilgi" },
  { id: 3, title: "Onay", short: "Onay" },
];

const defaultGarageCopy =
  "İstanbul, Maslak — Filo hazırlık noktası (demo). Teslim öncesi araç bu bölgededir.";

const ease = [0.22, 1, 0.36, 1] as const;

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function isPhoneTr(s: string) {
  const d = s.replace(/\D/g, "");
  return d.length >= 10 && d.length <= 13;
}

const maxUploadBytes = 8 * 1024 * 1024;
const uuidLikeRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isLikelyImageFile(f: File) {
  if (f.size > maxUploadBytes) return false;
  if (f.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Dosya okunamadı"));
    reader.readAsDataURL(file);
  });
}

function saveReservationRequestSnapshot(snapshot: {
  referenceNo: string;
  createdAt: string;
  startDate: string;
  endDate: string;
  vehicleId: string;
  vehicleName: string;
  vehicleBrand: string;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
  status?: string;
}) {
  if (typeof window === "undefined") return;
  const key = "rent.user.reservation.requests";
  try {
    const raw = window.localStorage.getItem(key);
    const list = raw ? (JSON.parse(raw) as typeof snapshot[]) : [];
    const next = [snapshot, ...list.filter((x) => x.referenceNo !== snapshot.referenceNo)].slice(0, 100);
    window.localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // no-op
  }
}

export function BookingWizard({ vehicle }: { vehicle: FleetVehicle }) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const patchQuery = (mutate: (q: URLSearchParams) => void) => {
    const q = new URLSearchParams(sp.toString());
    mutate(q);
    router.replace(`${pathname}?${q.toString()}`, { scroll: false });
  };

  const pickup = sp.get("alis") || "";
  const ret = sp.get("teslim") || "";
  const locId = sp.get("lokasyon") || pickupLocations[0]!.id;
  const returnLocId = sp.get("lokasyonTeslim") || locId;
  const pickupLocation = getLocationById(locId);
  const returnLocation = getLocationById(returnLocId);
  const crossBorderFee = crossBorderOneWaySurcharge(
    pickupLocation?.countryCode ?? "",
    returnLocation?.countryCode ?? "",
  );
  const planVehicleAbroad = sp.get("ulkeDisi") === "1";
  const abroadUsageFee = vehicleAbroadUsageSurcharge(planVehicleAbroad);

  const nights = useMemo(() => {
    const a = parseIsoDate(pickup);
    const b = parseIsoDate(ret);
    if (!a || !b || b <= a) return null;
    return rentalNights(a, b);
  }, [pickup, ret]);

  const pickupForCalendar = pickup || todayIso();
  const returnForCalendar =
    ret && compareIso(ret, pickupForCalendar) >= 0
      ? ret
      : toIsoDate(addDays(parseIsoDate(pickupForCalendar)!, 3));

  const garageText = vehicle.garageLocation ?? defaultGarageCopy;
  const locationOptions = useMemo(
    () => pickupLocations.map((l) => ({ value: l.id, label: l.label, right: l.countryCode })),
    [],
  );

  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [licenseNo, setLicenseNo] = useState("");
  const [passportNo, setPassportNo] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [pickupMode, setPickupMode] = useState<"ofis" | "adres">("ofis");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [licenseScan, setLicenseScan] = useState<File | null>(null);
  const [passportScan, setPassportScan] = useState<File | null>(null);
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [doneRef, setDoneRef] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!hasClientAuthToken()) return;
    const profile = getStoredAuthUser();
    if (!profile) return;
    if (profile.email && !email) setEmail(profile.email);
    if (profile.phone && !phone) setPhone(profile.phone);
    if (profile.fullName && !fullName) setFullName(profile.fullName);
  }, [email, fullName, phone]);

  const rentalSub =
    nights != null
      ? computeRentalSubtotal(vehicle.pricePerDay, nights) + crossBorderFee + abroadUsageFee
      : 0;

  const total = rentalSub;

  const validateStep3 = () => {
    const e: Record<string, string> = {};
    if (fullName.trim().length < 4) e.fullName = "Ad soyad en az 4 karakter olmalıdır.";
    if (!isEmail(email)) e.email = "Geçerli bir e-posta girin.";
    if (!isPhoneTr(phone)) e.phone = "Geçerli bir Türkiye cep telefonu girin.";
    if (licenseNo.trim().length < 6) e.licenseNo = "Ehliyet numarası / seri bilgisi girin.";
    if (!birthDate) e.birthDate = "Doğum tarihi zorunludur.";
    if (pickupMode === "adres" && address.trim().length < 10) {
      e.address = "Adres teslim için adres detayı girin.";
    }
    if (!licenseScan) e.licenseScan = "Ehliyet görseli yükleyin (net, okunaklı fotoğraf).";
    else if (!isLikelyImageFile(licenseScan)) {
      e.licenseScan = "Geçerli bir görsel seçin (JPEG, PNG, WebP; en fazla 8 MB).";
    }
    if (!passportScan) e.passportScan = "Pasaport görseli yükleyin (kimlik sayfası veya pasaport).";
    else if (!isLikelyImageFile(passportScan)) {
      e.passportScan = "Geçerli bir görsel seçin (JPEG, PNG, WebP; en fazla 8 MB).";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateDateRange = () => {
    if (nights == null) {
      setErrors({
        dates: "Takvimden alış ve teslim günlerini seçin (teslim, alıştan sonra olmalıdır).",
      });
      return false;
    }
    if (compareIso(ret, pickup) <= 0) {
      setErrors({
        dates: "En az iki farklı gün seçin: önce alış, sonra teslim gününe tıklayın.",
      });
      return false;
    }
    const blocked = blockedSetForVehicle(vehicle.id);
    const overlap = blockedDaysInInclusiveRange(pickup, ret, blocked);
    if (overlap.length > 0) {
      const fmt = overlap.slice(0, 3).map((d) =>
        parseIsoDate(d)!.toLocaleDateString("tr-TR", { day: "numeric", month: "short" }),
      );
      const more = overlap.length > 3 ? ` +${overlap.length - 3}` : "";
      setErrors({
        dates: `Aralıkta dolu günler var: ${fmt.join(", ")}${more}. Takvimden düzeltin.`,
      });
      return false;
    }
    return true;
  };

  const goNext = async () => {
    if (step === 1 && !validateDateRange()) return;
    if (step === 2 && !validateStep3()) return;
    if (step === 3) {
      if (!validateDateRange()) return;
      if (!terms) {
        setErrors({ terms: "Devam etmek için şartları onaylamanız gerekir." });
        return;
      }
      if (!licenseScan || !passportScan) {
        setErrors({ terms: "Ehliyet ve pasaport görselleri zorunludur." });
        return;
      }

      setSubmitting(true);
      try {
        const [driverLicenseImageDataUrl, passportImageDataUrl] = await Promise.all([
          fileToDataUrl(licenseScan),
          fileToDataUrl(passportScan),
        ]);

        const payload = {
          vehicleId: uuidLikeRe.test(vehicle.id) ? vehicle.id : undefined,
          startDate: pickup,
          endDate: ret,
          outsideCountryTravel: planVehicleAbroad,
          note: notes.trim() || undefined,
          customer: {
            fullName: fullName.trim(),
            phone: phone.trim(),
            email: email.trim(),
            birthDate,
            passportNo: passportNo.trim() || undefined,
            driverLicenseNo: licenseNo.trim() || undefined,
            passportImageDataUrl,
            driverLicenseImageDataUrl,
          },
        };

        const data = await createRentalRequestOnRentApi(payload);
        const refRaw = (data as { referenceNo?: unknown } | null)?.referenceNo;
        const ref = typeof refRaw === "string" && refRaw.trim().length > 0
          ? refRaw
          : `ACR-${Date.now().toString(36).toUpperCase()}`;
        saveReservationRequestSnapshot({
          referenceNo: ref,
          createdAt: new Date().toISOString(),
          startDate: pickup,
          endDate: ret,
          vehicleId: vehicle.id,
          vehicleName: vehicle.name,
          vehicleBrand: vehicle.brand,
          customerEmail: email.trim(),
          customerPhone: phone.trim(),
          customerName: fullName.trim(),
          status: "TALEP_ALINDI",
        });
        setDoneRef(ref);
        setErrors({});
        setStep(5);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Talep gönderilemedi.";
        setErrors({ terms: msg });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    setErrors({});
    if (step < 3) setStep((s) => s + 1);
  };

  const goBack = () => {
    if (step > 1 && step < 5) {
      setErrors({});
      setStep((s) => s - 1);
    }
  };

  if (step === 5 && doneRef) {
    return (
      <motion.div
        className="mx-auto max-w-lg px-5 py-24 text-center"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease }}
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-2xl text-emerald-300">
          ✓
        </div>
        <h1 className="mt-6 text-2xl font-semibold text-text">Talebiniz alındı</h1>
        <p className="mt-3 text-sm text-text-muted">
          Referans numaranız: <span className="font-mono text-lg font-semibold text-accent">{doneRef}</span>
        </p>
        <p className="mt-4 text-sm text-text-muted">
          Concierge ekibimiz kimlik doğrulama ve ödeme bağlantısı için 30 dakika içinde sizi
          arayacak. Bu demo ortamında gerçek ödeme alınmaz.
        </p>
        <AnimatedButton variant="primary" href="/" className="mt-10">
          Ana sayfaya dön
        </AnimatedButton>
      </motion.div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 pt-[4.5rem] sm:px-6 sm:pt-20">
      <RentIconBackLink
        href={`/arac/${vehicle.id}${sp.toString() ? `?${sp.toString()}` : ""}`}
        aria-label="Araca geri"
      />

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-text sm:text-3xl">Rezervasyon</h1>
          <p className="mt-2 text-sm text-text-muted">
            Önce tarihleri takvimden netleştirin; ardından sürücü bilgilerinizi tamamlayın.
          </p>

          <ol className="mt-8 flex flex-wrap gap-2">
            {steps.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  disabled={s.id > step}
                  onClick={() => {
                    if (s.id < step) setStep(s.id);
                  }}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    step === s.id
                      ? "bg-accent text-white"
                      : s.id < step
                        ? "border border-accent/40 text-accent"
                        : "border border-border-subtle text-text-muted"
                  }`}
                >
                  {i + 1}. {s.short}
                </button>
              </li>
            ))}
          </ol>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.35, ease }}
              className="mt-10"
            >
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-text">Tarih seçimi</h2>
                    <p className="mt-2 text-sm text-text-muted">
                      Müsait günlere tıklayın; aralıkta dolu gün bırakmayın. Değişiklikler adres
                      çubuğundaki bağlantıya yazılır.
                    </p>
                    <div className="mt-3 rounded-lg border border-border-subtle bg-bg-raised/40 px-3 py-2.5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Teslim noktası</p>
                      <p className="mt-1 flex items-start gap-2.5 text-sm leading-relaxed text-text">
                        <span className="sr-only">Araç konumu</span>
                        <LocationPinIcon className="mt-0.5 size-[1.125rem] shrink-0 text-accent" />
                        <span className="min-w-0 flex-1 text-text-muted">{garageText}</span>
                      </p>
                    </div>
                  </div>
                  {errors.dates && (
                    <p className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-text">
                      {errors.dates}
                    </p>
                  )}
                  <RentalAvailabilityCalendarPanel
                    vehicleId={vehicle.id}
                    pickup={pickupForCalendar}
                    returnDate={returnForCalendar}
                    syncToken={sp.toString()}
                    footerMode="inline"
                    onCommit={(p, r) => {
                      patchQuery((q) => {
                        q.set("alis", p);
                        q.set("teslim", r);
                        if (!q.get("lokasyon")) q.set("lokasyon", pickupLocations[0]!.id);
                        if (!q.get("lokasyonTeslim")) q.set("lokasyonTeslim", q.get("lokasyon")!);
                      });
                    }}
                    title="Takvim"
                    subtitle="Önce alış gününe, sonra teslim gününe tıklayın."
                  />
                  <div className="space-y-4 rounded-xl border border-border-subtle bg-bg-card/60 p-4 sm:p-5">
                    <h3 className="text-sm font-semibold text-text">Alış / teslim noktası</h3>
                    <label className="block text-[11px] font-medium text-text-muted">
                      Alış yeri (ülke)
                      <RentSelect
                        value={locId}
                        onChange={(v) => {
                          patchQuery((q) => {
                            q.set("lokasyon", v);
                            if (!q.get("lokasyonTeslim")) q.set("lokasyonTeslim", v);
                          });
                        }}
                        options={locationOptions}
                        ariaLabel="Alış yeri"
                        className="mt-1.5"
                        leadingIcon={<LocationPinIcon className="size-3.5" />}
                        optionLeadingIcon={<LocationPinIcon className="size-3.5" />}
                      />
                    </label>
                    <label className="block text-[11px] font-medium text-text-muted">
                      Teslim yeri (ülke)
                      <RentSelect
                        value={returnLocId}
                        onChange={(v) => {
                          patchQuery((q) => {
                            q.set("lokasyonTeslim", v);
                          });
                        }}
                        options={locationOptions}
                        ariaLabel="Teslim yeri"
                        className="mt-1.5"
                        leadingIcon={<LocationPinIcon className="size-3.5" />}
                        optionLeadingIcon={<LocationPinIcon className="size-3.5" />}
                      />
                    </label>
                    {crossBorderFee > 0 && (
                      <p className="text-[11px] leading-relaxed text-amber-200/90">
                        Farklı ülke teslimi: tahmini araç bedeline{" "}
                        <span className="font-medium text-text">{formatTry(crossBorderFee)}</span>{" "}
                        eklenir (demo).
                      </p>
                    )}
                    <label className="flex cursor-pointer gap-2.5 text-[11px] leading-snug text-text-muted">
                      <input
                        type="checkbox"
                        checked={planVehicleAbroad}
                        onChange={(e) => {
                          patchQuery((q) => {
                            if (e.target.checked) q.set("ulkeDisi", "1");
                            else q.delete("ulkeDisi");
                          });
                        }}
                        className="mt-0.5 size-4 shrink-0 accent-accent"
                      />
                      <span>
                        Aracı yurt dışına çıkarmayı planlıyorum; ek{" "}
                        <span className="font-medium text-text">
                          {formatTry(vehicleAbroadUsageSurcharge(true))}
                        </span>{" "}
                        ücret uygulanır (demo).
                      </span>
                    </label>
                    {nights != null && (
                      <p className="border-t border-border-subtle pt-3 text-sm text-text-muted">
                        <span className="text-text">Tahmini araç bedeli</span> ({nights} gün):{" "}
                        <span className="font-semibold text-accent">{formatTry(rentalSub)}</span>
                      </p>
                    )}
                  </div>
                </div>
              )}
              {step === 2 && (
                <StepContact
                  fullName={fullName}
                  setFullName={setFullName}
                  email={email}
                  setEmail={setEmail}
                  phone={phone}
                  setPhone={setPhone}
                  licenseNo={licenseNo}
                  setLicenseNo={setLicenseNo}
                  passportNo={passportNo}
                  setPassportNo={setPassportNo}
                  birthDate={birthDate}
                  setBirthDate={setBirthDate}
                  licenseScan={licenseScan}
                  setLicenseScan={setLicenseScan}
                  passportScan={passportScan}
                  setPassportScan={setPassportScan}
                  pickupMode={pickupMode}
                  setPickupMode={setPickupMode}
                  address={address}
                  setAddress={setAddress}
                  notes={notes}
                  setNotes={setNotes}
                  errors={errors}
                />
              )}
              {step === 3 && (
                <StepConfirm
                  vehicle={vehicle}
                  nights={nights}
                  pickup={pickup}
                  ret={ret}
                  pickupLocationLabel={pickupLocation?.label}
                  returnLocationLabel={returnLocation?.label}
                  crossBorderFee={crossBorderFee}
                  abroadUsageFee={abroadUsageFee}
                  rentalSub={rentalSub}
                  total={total}
                  fullName={fullName}
                  email={email}
                  phone={phone}
                  licenseScanName={licenseScan?.name}
                  passportScanName={passportScan?.name}
                  pickupMode={pickupMode}
                  address={address}
                  terms={terms}
                  setTerms={(v) => {
                    setTerms(v);
                    if (v) {
                      setErrors((e) => {
                        const next = { ...e };
                        delete next.terms;
                        return next;
                      });
                    }
                  }}
                  termsError={errors.terms}
                />
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-10 flex flex-wrap gap-3">
            {step > 1 && <RentIconBackButton onClick={goBack} aria-label="Geri" />}
            <motion.button
              type="button"
              onClick={goNext}
              className="rounded-md bg-accent px-6 py-2.5 text-[13px] font-semibold text-white shadow-sm"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              {step === 3 ? (submitting ? "Gönderiliyor..." : "Rezervasyonu gönder") : "Devam et"}
            </motion.button>
          </div>
        </div>

        <aside className="lg:w-80">
          <motion.div
            className="rounded-xl border border-border-subtle bg-bg-card/80 p-4 backdrop-blur-md lg:sticky lg:top-20"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="relative aspect-video overflow-hidden rounded-lg border border-border-subtle">
              <Image
                src={vehicle.image}
                alt={vehicle.imageAlt}
                fill
                className="object-cover"
                sizes="320px"
              />
            </div>
            <p className="mt-3 text-base font-semibold text-text">{vehicle.name}</p>
            <p className="text-xs text-text-muted">
              {nights != null ? `${nights} gün` : "—"} · günlük {formatTry(vehicle.pricePerDay)}
            </p>
            <div className="mt-4 space-y-1 border-t border-border-subtle pt-4 text-sm">
              <Row label="Araç" value={formatTry(rentalSub)} />
              <div className="flex justify-between border-t border-border-subtle pt-2 font-semibold text-text">
                <span>Tahmini toplam</span>
                <span>{formatTry(total)}</span>
              </div>
            </div>
          </motion.div>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 text-text-muted">
      <span className="line-clamp-2">{label}</span>
      <span className="shrink-0 text-text">{value}</span>
    </div>
  );
}

function StepContact({
  fullName,
  setFullName,
  email,
  setEmail,
  phone,
  setPhone,
  licenseNo,
  setLicenseNo,
  passportNo,
  setPassportNo,
  birthDate,
  setBirthDate,
  licenseScan,
  setLicenseScan,
  passportScan,
  setPassportScan,
  pickupMode,
  setPickupMode,
  address,
  setAddress,
  notes,
  setNotes,
  errors,
}: {
  fullName: string;
  setFullName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  licenseNo: string;
  setLicenseNo: (v: string) => void;
  passportNo: string;
  setPassportNo: (v: string) => void;
  birthDate: string;
  setBirthDate: (v: string) => void;
  licenseScan: File | null;
  setLicenseScan: (v: File | null) => void;
  passportScan: File | null;
  setPassportScan: (v: File | null) => void;
  pickupMode: "ofis" | "adres";
  setPickupMode: (v: "ofis" | "adres") => void;
  address: string;
  setAddress: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  errors: Record<string, string>;
}) {
  const input =
    "mt-1.5 w-full rounded-lg border border-border-subtle bg-bg-card px-3 py-2.5 text-[13px] text-text outline-none focus:border-accent/40";
  const hiddenFileInput = "sr-only";
  const licenseGalleryRef = useRef<HTMLInputElement>(null);
  const licenseCameraRef = useRef<HTMLInputElement>(null);
  const passportGalleryRef = useRef<HTMLInputElement>(null);
  const passportCameraRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <h2 className="text-xl font-semibold text-text">Sürücü & teslimat</h2>
      <p className="mt-2 text-sm text-text-muted">
        Bilgileriniz yalnızca sözleşme ve kimlik doğrulama için kullanılır.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Ad soyad" error={errors.fullName}>
          <input className={input} value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </Field>
        <Field label="E-posta" error={errors.email}>
          <input
            type="email"
            className={input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </Field>
        <Field label="Cep telefonu" error={errors.phone}>
          <input
            type="tel"
            className={input}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="05xx xxx xx xx"
            autoComplete="tel"
          />
        </Field>
        <Field label="Doğum tarihi" error={errors.birthDate}>
          <DayPickerPopover
            label="Doğum tarihi"
            value={birthDate}
            minDate="1940-01-01"
            maxDate={todayIso()}
            onChange={setBirthDate}
            compact
            className="w-full"
          />
        </Field>
        <Field label="Ehliyet seri / no" error={errors.licenseNo}>
          <input className={input} value={licenseNo} onChange={(e) => setLicenseNo(e.target.value)} />
        </Field>
        <Field label="Pasaport no (opsiyonel)">
          <input className={input} value={passportNo} onChange={(e) => setPassportNo(e.target.value)} />
        </Field>
      </div>

      <h3 className="mt-10 text-sm font-semibold uppercase tracking-wider text-accent">
        Ehliyet ve pasaport görseli
      </h3>
      <p className="mt-2 text-sm text-text-muted">
        Kimlik doğrulama için ehliyetinizin ve pasaportunuzun net fotoğraflarını yükleyin. Kişisel
        veriler yalnızca kiralama sürecinde kullanılır (demo: dosyalar sunucuya gönderilmez).
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Ehliyet görseli" error={errors.licenseScan}>
          <input
            ref={licenseGalleryRef}
            type="file"
            accept="image/*"
            className={hiddenFileInput}
            onChange={(e) => setLicenseScan(e.target.files?.[0] ?? null)}
          />
          <input
            ref={licenseCameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className={hiddenFileInput}
            onChange={(e) => setLicenseScan(e.target.files?.[0] ?? null)}
          />
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => licenseCameraRef.current?.click()} className="rounded-lg border border-accent/35 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent">Fotoğraf çek</button>
            <button type="button" onClick={() => licenseGalleryRef.current?.click()} className="rounded-lg border border-border-subtle bg-bg-raised px-3 py-2 text-xs font-semibold text-text">Galeriden seç</button>
          </div>
          {licenseScan && (
            <p className="mt-1 truncate text-xs text-text-muted" title={licenseScan.name}>
              Seçilen: {licenseScan.name}
            </p>
          )}
        </Field>
        <Field label="Pasaport görseli" error={errors.passportScan}>
          <input
            ref={passportGalleryRef}
            type="file"
            accept="image/*"
            className={hiddenFileInput}
            onChange={(e) => setPassportScan(e.target.files?.[0] ?? null)}
          />
          <input
            ref={passportCameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className={hiddenFileInput}
            onChange={(e) => setPassportScan(e.target.files?.[0] ?? null)}
          />
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => passportCameraRef.current?.click()} className="rounded-lg border border-accent/35 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent">Fotoğraf çek</button>
            <button type="button" onClick={() => passportGalleryRef.current?.click()} className="rounded-lg border border-border-subtle bg-bg-raised px-3 py-2 text-xs font-semibold text-text">Galeriden seç</button>
          </div>
          {passportScan && (
            <p className="mt-1 truncate text-xs text-text-muted" title={passportScan.name}>
              Seçilen: {passportScan.name}
            </p>
          )}
        </Field>
      </div>

      <h3 className="mt-10 text-sm font-semibold uppercase tracking-wider text-accent">
        Teslimat tercihi
      </h3>
      <div className="mt-3 flex flex-wrap gap-3">
        {(
          [
            ["ofis", "Ofiste teslim"],
            ["adres", "Adrese teslim"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setPickupMode(id)}
            className={`rounded-full border px-4 py-2 text-sm ${
              pickupMode === id
                ? "border-accent bg-accent/15 text-accent"
                : "border-border-subtle text-text-muted hover:text-text"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {pickupMode === "adres" && (
        <Field label="Açık adres" error={errors.address} className="mt-4">
          <textarea
            className={`${input} min-h-[100px] resize-y`}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Mahalle, sokak, bina no, daire…"
          />
        </Field>
      )}

      <Field label="Notlar (isteğe bağlı)" className="mt-6">
        <textarea
          className={`${input} min-h-[80px]`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Örn. çocuk koltuğu montaj yönü, uçuş kodu…"
        />
      </Field>
    </div>
  );
}

function Field({
  label,
  error,
  children,
  className = "",
}: {
  label: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block text-xs font-medium uppercase tracking-wider text-text-muted ${className}`}>
      {label}
      {children}
      {error && <span className="mt-1 block text-xs font-normal text-amber-300">{error}</span>}
    </label>
  );
}

function StepConfirm({
  vehicle,
  nights,
  pickup,
  ret,
  pickupLocationLabel,
  returnLocationLabel,
  crossBorderFee,
  abroadUsageFee,
  rentalSub,
  total,
  fullName,
  email,
  phone,
  licenseScanName,
  passportScanName,
  pickupMode,
  address,
  terms,
  setTerms,
  termsError,
}: {
  vehicle: FleetVehicle;
  nights: number | null;
  pickup: string;
  ret: string;
  pickupLocationLabel?: string;
  returnLocationLabel?: string;
  crossBorderFee: number;
  abroadUsageFee: number;
  rentalSub: number;
  total: number;
  fullName: string;
  email: string;
  phone: string;
  licenseScanName?: string;
  passportScanName?: string;
  pickupMode: "ofis" | "adres";
  address: string;
  terms: boolean;
  setTerms: (v: boolean) => void;
  termsError?: string;
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-text">Son kontrol</h2>
      <div className="mt-6 space-y-4 rounded-xl border border-border-subtle bg-bg-card/60 p-5 text-sm text-text-muted">
        <p>
          <span className="text-text">Misafir:</span> {fullName}
        </p>
        <p>
          <span className="text-text">İletişim:</span> {email} · {phone}
        </p>
        {(licenseScanName || passportScanName) && (
          <p>
            <span className="text-text">Belgeler:</span>{" "}
            {[licenseScanName && `Ehliyet: ${licenseScanName}`, passportScanName && `Pasaport: ${passportScanName}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
        <p>
          <span className="text-text">Araç:</span> {vehicle.name}
          {nights != null ? ` · ${nights} gün` : ""}
        </p>
        <p>
          <span className="text-text">Tarihler:</span> {formatTrDate(pickup)} → {formatTrDate(ret)}
        </p>
        {pickupLocationLabel && (
          <p>
            <span className="text-text">Alış yeri:</span> {pickupLocationLabel}
          </p>
        )}
        {returnLocationLabel && (
          <p>
            <span className="text-text">Teslim yeri:</span> {returnLocationLabel}
          </p>
        )}
        {crossBorderFee > 0 && (
          <p className="text-[11px] text-amber-200/90">
            Ülkeler arası teslim ek ücreti: {formatTry(crossBorderFee)}
          </p>
        )}
        {abroadUsageFee > 0 && (
          <p className="text-[11px] text-amber-200/90">
            Yurt dışı araç kullanımı ek ücreti: {formatTry(abroadUsageFee)}
          </p>
        )}
        <p>
          <span className="text-text">Teslimat:</span>{" "}
          {pickupMode === "ofis" ? "Ofis teslimi" : `Adrese teslim — ${address}`}
        </p>
        <div className="border-t border-border-subtle pt-3">
          <Row label="Araç" value={formatTry(rentalSub)} />
          <div className="mt-2 flex justify-between font-semibold text-text">
            <span>Toplam</span>
            <span>{formatTry(total)}</span>
          </div>
        </div>
      </div>
      <label className="mt-6 flex cursor-pointer gap-3 text-sm text-text-muted">
        <input
          type="checkbox"
          checked={terms}
          onChange={(e) => setTerms(e.target.checked)}
          className="mt-1 size-4 accent-accent"
        />
        <span>
          <span className="text-text">Kiralama şartları</span>, sigorta kapsamı ve iptal politikasını
          okudum, onaylıyorum.
        </span>
      </label>
      {termsError && <p className="mt-2 text-xs text-amber-300">{termsError}</p>}
    </div>
  );
}

