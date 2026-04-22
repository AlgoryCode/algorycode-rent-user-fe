"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Briefcase,
  CalendarCheck,
  Check,
  Clock,
  Fuel as FuelIcon,
  MapPin,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FleetVehicle, FuelType } from "@/data/fleet";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { pickupLocations } from "@/data/locations";
import { compareIso } from "@/lib/calendarGrid";
import { addDays, parseIsoDate, rentalNights, todayIso, toIsoDate } from "@/lib/dates";
import { LocationPinIcon } from "@/components/ui/LocationPinIcon";
import { CheckCircleSoftIcon, MapPinGarageIcon, XCircleSoftIcon } from "@/components/ui/VehicleSpecIcons";
import { VehicleRentalFaqPanel } from "@/components/vehicle/VehicleRentalFaqPanel";
import { GuestReservationGate } from "@/components/auth/GuestReservationGate";
import { clearBffBearerCache, fetchHasBffMemberSession } from "@/lib/bff-access-token";
import { RENT_GUEST_PREFILL_EMAIL_QUERY, RENT_RESERVATION_GUEST_ACK_QUERY } from "@/lib/guestAuthClient";
import { fetchFleetVehicleById } from "@/lib/rentFleetClient";
import { isCompleteBookingQuery } from "@/lib/reservationGate";
import { isLikelyUuidString } from "@/lib/uuidLike";

function fuelLabel(f: FuelType): string {
  const labels: Record<FuelType, string> = {
    benzin: "Benzin",
    dizel: "Dizel",
    hibrit: "Hibrit",
    elektrik: "Elektrik",
  };
  return labels[f];
}

function GalleryThumb({
  src,
  selected,
  onSelect,
  sizes,
  priority,
  variant = "default",
}: {
  src: string;
  selected: boolean;
  onSelect: () => void;
  sizes: string;
  priority?: boolean;
  variant?: "default" | "onDark";
}) {
  const selectedCls =
    variant === "onDark"
      ? "border-sky-400 opacity-100 ring-2 ring-sky-400/40"
      : "border-accent opacity-100 ring-1 ring-accent";
  const idleCls =
    variant === "onDark"
      ? "border-white/25 opacity-90 hover:border-white/45 hover:opacity-100"
      : "border-border-subtle opacity-90 hover:border-text/25 hover:opacity-100";
  const bg = variant === "onDark" ? "bg-black/40" : "bg-bg-card";
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative aspect-[4/3] w-16 shrink-0 overflow-hidden rounded-md border ${bg} outline-none transition-[border-color,opacity] duration-100 focus-visible:ring-2 focus-visible:ring-sky-400 sm:w-[5.5rem] ${
        selected ? selectedCls : idleCls
      }`}
      aria-label={selected ? "Seçili görsel" : "Bu görseli önizlemede göster"}
    >
      <Image src={src} alt="" fill className="object-cover" sizes={sizes} priority={priority} />
    </button>
  );
}

export function VehicleDetailView({
  vehicle: initialVehicle,
  queryString,
}: {
  vehicle: FleetVehicle;
  queryString: string;
}) {
  const { formatPrice } = useI18n();
  const router = useRouter();
  const [vehicle, setVehicle] = useState(initialVehicle);
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const sp = useMemo(() => new URLSearchParams(queryString), [queryString]);

  useEffect(() => {
    setVehicle(initialVehicle);
  }, [initialVehicle.id]);

  useEffect(() => {
    if (!isLikelyUuidString(initialVehicle.id)) return;
    let cancelled = false;
    void (async () => {
      try {
        const v = await fetchFleetVehicleById(initialVehicle.id);
        if (!cancelled && v) setVehicle(v);
      } catch {
        /* SSR / ağ: mevcut araç verisi */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialVehicle.id]);

  const galleryImages = useMemo(
    () => (vehicle.gallery.length > 0 ? vehicle.gallery : [vehicle.image]),
    [vehicle.gallery, vehicle.image],
  );

  useEffect(() => {
    if (!lightboxOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowLeft") {
        setActiveImage((i) => (i > 0 ? i - 1 : galleryImages.length - 1));
      }
      if (e.key === "ArrowRight") {
        setActiveImage((i) => (i < galleryImages.length - 1 ? i + 1 : 0));
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightboxOpen, galleryImages.length]);

  const pickup = sp.get("alis") || "";
  const ret = sp.get("teslim") || "";
  /**
   * Rezervasyon URL’si `lokasyon`: önce gerçek handover kimliği (detaydaki “Alış” ile aynı),
   * sonra `pickupLocationId` (çoğu zaman slug / ülke fallback’i — API aracında handover’ı ezer).
   */
  const defaultLocId =
    vehicle.pickupHandoverForBooking?.id?.trim() ||
    vehicle.defaultPickupHandoverLocationId?.trim() ||
    vehicle.pickupLocationId ||
    pickupLocations[0]?.id ||
    "ist-airport-ist";
  const defaultReturnLocId = (() => {
    const rh = vehicle.returnHandoversForBooking;
    if (rh && rh.length > 0) {
      const pref = vehicle.defaultReturnHandoverLocationId;
      if (pref && rh.some((x) => x.id === pref)) return pref;
      const alt = rh.find((x) => x.id !== defaultLocId);
      return alt?.id ?? rh[0]!.id;
    }
    return vehicle.defaultReturnHandoverLocationId ?? defaultLocId;
  })();
  const pickupLocId = sp.get("lokasyon") || defaultLocId;
  const returnLocId = sp.get("lokasyonTeslim") || defaultReturnLocId;
  const planVehicleAbroad = sp.get("ulkeDisi") === "1";

  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  /** Yalnızca üye oturumu rezervasyonu doğrudan açar; misafir JWT tek başına yetmez. */
  const [hasMemberReserveSession, setHasMemberReserveSession] = useState(false);
  const [guestSubflow, setGuestSubflow] = useState(false);

  useEffect(() => {
    void fetchHasBffMemberSession().then(setHasMemberReserveSession);
  }, []);

  const nights = useMemo(() => {
    const a = parseIsoDate(pickup);
    const b = parseIsoDate(ret);
    if (!a || !b || b <= a) return null;
    return rentalNights(a, b);
  }, [pickup, ret]);

  const hasRangeSelected =
    Boolean(pickup) &&
    Boolean(ret) &&
    compareIso(ret, pickup) > 0 &&
    nights != null;

  /** URL’de geçerli aralık yoksa rezervasyon sayfası gate’i için varsayılan aralık. */
  const reserveDatePair = useMemo(() => {
    if (hasRangeSelected) return { alis: pickup, teslim: ret };
    const start = todayIso();
    const startD = parseIsoDate(start)!;
    return { alis: start, teslim: toIsoDate(addDays(startD, 3)) };
  }, [hasRangeSelected, pickup, ret]);

  const reservationQueryString = useMemo(() => {
    const q = new URLSearchParams();
    q.set("arac", vehicle.id);
    q.set("alis", reserveDatePair.alis);
    q.set("teslim", reserveDatePair.teslim);
    q.set("lokasyon", pickupLocId);
    q.set("lokasyonTeslim", returnLocId);
    if (planVehicleAbroad) q.set("ulkeDisi", "1");
    const alisSaat = sp.get("alis_saat")?.trim();
    const teslimSaat = sp.get("teslim_saat")?.trim();
    if (alisSaat) q.set("alis_saat", alisSaat);
    if (teslimSaat) q.set("teslim_saat", teslimSaat);
    return q.toString();
  }, [vehicle.id, reserveDatePair, pickupLocId, returnLocId, planVehicleAbroad, sp]);

  const reservationHref = useMemo(() => `/rezervasyon?${reservationQueryString}`, [reservationQueryString]);

  const buildReserveHref = useCallback(() => reservationHref, [reservationHref]);

  const canPrefetchReservation = useMemo(
    () =>
      isCompleteBookingQuery({
        arac: vehicle.id,
        alis: reserveDatePair.alis,
        teslim: reserveDatePair.teslim,
        lokasyon: pickupLocId,
        lokasyonTeslim: returnLocId,
      }),
    [vehicle.id, reserveDatePair.alis, reserveDatePair.teslim, pickupLocId, returnLocId],
  );

  useEffect(() => {
    if (!canPrefetchReservation) return;
    router.prefetch(reservationHref);
  }, [router, canPrefetchReservation, reservationHref]);

  const goToReservationPage = useCallback(() => {
    if (hasMemberReserveSession) {
      router.push(buildReserveHref());
      return;
    }
    setGuestSubflow(false);
    setAuthPromptOpen(true);
  }, [hasMemberReserveSession, buildReserveHref, router]);

  const backHref = useMemo(() => (queryString.trim() ? `/araclar?${queryString}` : "/araclar"), [queryString]);

  const pickupLabel = useMemo(
    () =>
      vehicle.pickupHandoverForBooking?.name?.trim() ||
      vehicle.defaultPickupHandoverName?.trim() ||
      vehicle.pickupLocationLabel?.trim() ||
      "Belirlenecek",
    [vehicle],
  );

  const displayNights = nights ?? 3;

  const comfortFeatures = useMemo(() => {
    const h = vehicle.highlights ?? [];
    const s = vehicle.specs ?? [];
    return [...h, ...s].filter(Boolean).slice(0, 14);
  }, [vehicle.highlights, vehicle.specs]);

  const detailSpecs = useMemo(
    () => [
      {
        Icon: Settings,
        label: "Vites",
        value: vehicle.transmission === "otomatik" ? "Otomatik" : "Manuel",
      },
      { Icon: FuelIcon, label: "Yakıt", value: fuelLabel(vehicle.fuel) },
      { Icon: Users, label: "Koltuk", value: `${vehicle.seats} kişi` },
      { Icon: Briefcase, label: "Bagaj", value: `${vehicle.luggage} adet` },
    ],
    [vehicle.fuel, vehicle.luggage, vehicle.seats, vehicle.transmission],
  );

  const guarantees = useMemo(
    () => [
      { Icon: Shield, title: "Tam kasko dahil", text: "Sürüş güvenliğiniz garanti altında." },
      { Icon: Clock, title: "7/24 yol yardımı", text: "Her an, her yerde yanınızdayız." },
      { Icon: CalendarCheck, title: "Ücretsiz iptal", text: "48 saat öncesine kadar iade." },
    ],
    [],
  );

  const openLightbox = (index: number) => {
    setActiveImage(index);
    setLightboxOpen(true);
  };

  const galleryThumbnails = (
    <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {galleryImages.map((src, i) => (
        <GalleryThumb
          key={`${src}-${i}`}
          src={src}
          selected={i === activeImage}
          onSelect={() => setActiveImage(i)}
          sizes="(max-width:640px) 72px, 96px"
          priority={i === 0}
          variant="default"
        />
      ))}
    </div>
  );

  const mainGallerySrc = galleryImages[activeImage] ?? vehicle.image;

  const lightbox =
    typeof window !== "undefined" &&
    lightboxOpen &&
    createPortal(
      <div
        className="fixed inset-0 z-[600] flex items-center justify-center p-4 sm:p-8"
        role="dialog"
        aria-modal
        aria-label="Görsel önizleme"
      >
        <button
          type="button"
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          aria-label="Kapat"
          onClick={() => setLightboxOpen(false)}
        />
        <div className="relative z-[601] flex w-full max-w-5xl flex-col gap-3">
          <div className="flex items-center justify-between gap-3 text-left">
            <p className="truncate text-sm font-medium text-white/90">
              {vehicle.name} · {activeImage + 1} / {galleryImages.length}
            </p>
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="shrink-0 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/20"
            >
              Kapat
            </button>
          </div>
          <div className="relative aspect-[16/10] max-h-[min(78vh,720px)] w-full overflow-hidden rounded-sm border border-white/20 bg-black/50 shadow-2xl">
            <div key={activeImage} className="absolute inset-0">
              <Image
                src={galleryImages[activeImage] ?? vehicle.image}
                alt={vehicle.imageAlt}
                fill
                className="object-contain"
                sizes="(max-width: 1024px) 100vw, 1024px"
                priority
              />
            </div>
            {galleryImages.length > 1 && (
              <>
                <button
                  type="button"
                  className="absolute left-2 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/50 text-lg text-white transition-colors hover:bg-black/70"
                  aria-label="Önceki görsel"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImage((i) => (i > 0 ? i - 1 : galleryImages.length - 1));
                  }}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="absolute right-2 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/50 text-lg text-white transition-colors hover:bg-black/70"
                  aria-label="Sonraki görsel"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImage((i) => (i < galleryImages.length - 1 ? i + 1 : 0));
                  }}
                >
                  ›
                </button>
              </>
            )}
          </div>
        </div>
      </div>,
      document.body,
    );

  return (
    <div className="min-h-screen bg-background">
      {lightbox}
      {authPromptOpen && (
        <div className="fixed inset-0 z-[650] flex items-end justify-center p-3 sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Kapat"
            onClick={() => {
              setAuthPromptOpen(false);
              setGuestSubflow(false);
            }}
          />
          <div className="relative z-[651] w-full max-w-md rounded-sm border border-border-subtle bg-bg-card p-4 shadow-xl">
            {!guestSubflow ? (
              <>
                <h3 className="text-base font-semibold text-text">Rezervasyona nasıl devam etmek istersiniz?</h3>
                <p className="mt-1.5 text-sm text-text-muted">
                  Misafir olarak e-posta ile devam edebilir veya giriş yaparak bilgilerinizi otomatik doldurabilirsiniz.
                </p>
                <div className="mt-4 space-y-2">
                  <button
                    type="button"
                    onClick={() => setGuestSubflow(true)}
                    className="w-full rounded-lg border border-border-subtle bg-bg-raised px-3 py-2.5 text-sm font-semibold text-text hover:border-accent/30"
                  >
                    Misafir olarak devam et
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthPromptOpen(false);
                      setGuestSubflow(false);
                      router.push(`/giris-yap?next=${encodeURIComponent(buildReserveHref())}`);
                    }}
                    className="w-full rounded-lg bg-btn-solid px-3 py-2.5 text-sm font-semibold text-btn-solid-fg"
                  >
                    Giriş yaparak devam et
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthPromptOpen(false);
                      setGuestSubflow(false);
                      router.push(`/uye-ol?next=${encodeURIComponent(buildReserveHref())}`);
                    }}
                    className="w-full rounded-lg border border-border-subtle px-3 py-2.5 text-sm text-text-muted hover:text-text"
                  >
                    Üye ol
                  </button>
                </div>
              </>
            ) : (
              <GuestReservationGate
                variant="embedded"
                title="Misafir olarak devam"
                nextLoginHref={buildReserveHref()}
                onCancelEmbedded={() => setGuestSubflow(false)}
                onAuthenticated={(guestEmail) => {
                  clearBffBearerCache();
                  setAuthPromptOpen(false);
                  setGuestSubflow(false);
                  const href = buildReserveHref();
                  const [path, qs = ""] = href.includes("?") ? href.split("?", 2) : [href, ""];
                  const q = new URLSearchParams(qs);
                  q.set(RENT_RESERVATION_GUEST_ACK_QUERY, "1");
                  q.set(RENT_GUEST_PREFILL_EMAIL_QUERY, guestEmail.trim().toLowerCase());
                  router.push(`${path}?${q.toString()}`);
                }}
              />
            )}
          </div>
        </div>
      )}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-card/70 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Aramaya dön
          </Link>
          <span className="hidden text-sm text-muted-foreground md:block">{vehicle.category}</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 animate-fade-in-up lg:py-12">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:gap-12">
          <div id="arac-galeri" className="min-w-0 scroll-mt-28">
            {vehicle.badge ? (
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  {vehicle.badge}
                </span>
              </div>
            ) : null}
            <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">{vehicle.category}</p>
            <h1 className="mt-1 text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">{vehicle.name}</h1>

            <div className="relative mt-6 aspect-[16/10] w-full overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-muted/50 to-muted/10">
              <button
                type="button"
                onClick={() => openLightbox(activeImage)}
                className="absolute inset-0 border-0 bg-transparent text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Görseli tam ekranda aç"
              >
                <Image
                  src={mainGallerySrc}
                  alt={vehicle.imageAlt}
                  fill
                  className="object-contain p-6"
                  sizes="(max-width:1024px) 100vw, 65vw"
                  priority={activeImage === 0}
                />
              </button>
            </div>
            {galleryImages.length > 1 ? <div className="mt-3">{galleryThumbnails}</div> : null}

            <section className="mt-8">
              <h2 className="text-xl font-bold text-foreground">Teknik Özellikler</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                {detailSpecs.map(({ Icon, label, value }) => (
                  <div key={label} className="rounded-2xl border border-border/60 bg-card p-4 text-center">
                    <Icon className="mx-auto h-6 w-6 text-primary" />
                    <p className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                    <p className="mt-1 text-sm font-bold text-foreground">{value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-bold text-foreground">Açıklama</h2>
              <p className="mt-3 leading-relaxed text-muted-foreground">{vehicle.description}</p>
            </section>

            {comfortFeatures.length > 0 ? (
              <section className="mt-8">
                <h2 className="text-xl font-bold text-foreground">Donanım & Konfor</h2>
                <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {comfortFeatures.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm text-foreground">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <aside className="self-start lg:sticky lg:top-24">
            <div
              className="rounded-3xl border border-border/60 bg-card p-6 lg:p-7"
              style={{ boxShadow: "var(--shadow-search)" }}
            >
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold tabular-nums text-foreground">
                  {formatPrice(vehicle.pricePerDay)}
                </span>
                <span className="text-sm text-muted-foreground">/ gün</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">KDV dahil, ek ücret yok</p>

              <div className="my-5 h-px w-full bg-border" />

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 shrink-0 text-primary" />
                  <span className="text-muted-foreground">Alış noktası</span>
                  <span className="ml-auto text-right font-semibold text-foreground">{pickupLabel}</span>
                </div>
                <div className="flex items-center gap-3">
                  <CalendarCheck className="h-4 w-4 shrink-0 text-primary" />
                  <span className="text-muted-foreground">Süre</span>
                  <span className="ml-auto font-semibold text-foreground">{displayNights} gün</span>
                </div>
              </div>

              <div className="my-5 h-px w-full bg-border" />

              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">Toplam</span>
                <span className="text-2xl font-extrabold tabular-nums text-foreground">
                  {formatPrice(vehicle.pricePerDay * displayNights)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => goToReservationPage()}
                className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-primary text-base font-bold text-primary-foreground transition-opacity hover:opacity-95"
              >
                Hemen Rezervasyon Yap
              </button>

              <p className="mt-3 text-center text-xs text-muted-foreground">Ücretsiz iptal · 48 saat öncesine kadar</p>
            </div>

            <div className="mt-5 grid gap-3">
              {guarantees.map(({ Icon, title, text }) => (
                <div key={title} className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card p-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-foreground">{title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </main>

      <div className="relative z-[1] border-t border-border/60 bg-background px-3 pb-16 pt-12 sm:px-5 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="mx-auto min-w-0 max-w-3xl space-y-8 lg:space-y-9">
              <section
                id="arac-ozet"
                className="scroll-mt-28 min-w-0"
                aria-labelledby="arac-konum-paket-baslik"
              >
                <h2 id="arac-konum-paket-baslik" className="text-lg font-bold tracking-tight text-navy-hero">
                  Konum ve paket
                </h2>
                <div className="mt-4 space-y-8 rounded-xl border border-border-subtle bg-bg-raised/50 p-4 shadow-sm sm:p-6">
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-text-muted">Alış ve teslim</h3>
                    <div className="flex flex-col gap-4 sm:flex-row sm:gap-5">
                      <div className="flex shrink-0 flex-row items-center gap-3 sm:flex-col sm:items-start sm:gap-1.5">
                        <MapPinGarageIcon className="size-6 shrink-0 text-accent" aria-hidden />
                        <p className="m-0 text-sm font-semibold leading-snug text-text sm:max-w-[10rem]">
                          Alış / teslim noktaları
                        </p>
                      </div>
                      <div className="min-w-0 flex-1 space-y-3 text-sm font-medium leading-relaxed text-text">
                        {vehicle.pickupHandoverForBooking || (vehicle.returnHandoversForBooking?.length ?? 0) > 0 ? (
                          <div className="space-y-4 text-[13px] text-text-muted">
                            {vehicle.pickupHandoverForBooking ? (
                              <div className="rounded-lg border border-border-subtle/70 bg-bg-card/60 px-3 py-2.5">
                                <p className="m-0 mb-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                                  Alış noktası
                                </p>
                                <p className="m-0 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-text">
                                  <span className="inline-flex items-center gap-1.5 font-semibold text-text">
                                    <LocationPinIcon className="size-3.5 shrink-0 text-accent" />
                                    Konum
                                  </span>
                                  <span>
                                    {vehicle.pickupHandoverForBooking.name}
                                    {typeof vehicle.pickupHandoverForBooking.surchargeEur === "number" &&
                                    vehicle.pickupHandoverForBooking.surchargeEur > 0
                                      ? ` · +${vehicle.pickupHandoverForBooking.surchargeEur} €`
                                      : null}
                                  </span>
                                </p>
                              </div>
                            ) : vehicle.defaultPickupHandoverLocationId ? (
                              <div className="rounded-lg border border-border-subtle/70 bg-bg-card/60 px-3 py-2.5">
                                <p className="m-0 mb-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                                  Alış noktası
                                </p>
                                <p className="m-0 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-text">
                                  <span className="inline-flex items-center gap-1.5 font-semibold text-text">
                                    <LocationPinIcon className="size-3.5 shrink-0 text-accent" />
                                    Konum
                                  </span>
                                  <span>
                                    {vehicle.defaultPickupHandoverName ?? vehicle.pickupLocationLabel ?? "—"}
                                  </span>
                                </p>
                              </div>
                            ) : null}
                            {vehicle.returnHandoversForBooking && vehicle.returnHandoversForBooking.length > 0 ? (
                              <div className="rounded-lg border border-border-subtle/70 bg-bg-card/60 px-3 py-2.5">
                                <p className="m-0 mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                                  Teslim seçenekleri
                                </p>
                                <ul className="m-0 list-none space-y-2 p-0">
                                  {vehicle.returnHandoversForBooking.map((h) => (
                                    <li
                                      key={h.id}
                                      className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 rounded-md border border-border-subtle/50 bg-bg-raised/40 px-2.5 py-2 text-[13px]"
                                    >
                                      <span className="inline-flex min-w-0 items-center gap-1.5 font-medium text-text">
                                        <LocationPinIcon className="size-3.5 shrink-0 text-accent" />
                                        <span className="min-w-0">{h.name}</span>
                                      </span>
                                      {typeof h.surchargeEur === "number" && h.surchargeEur > 0 ? (
                                        <span className="shrink-0 tabular-nums text-sm font-semibold text-accent">
                                          +{h.surchargeEur} €
                                        </span>
                                      ) : (
                                        <span className="shrink-0 text-xs text-text-muted">Ek ücret yok</span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : vehicle.defaultReturnHandoverLocationId ? (
                              <div className="rounded-lg border border-border-subtle/70 bg-bg-card/60 px-3 py-2.5">
                                <p className="m-0 mb-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                                  Teslim noktası
                                </p>
                                <p className="m-0 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-text">
                                  <span className="inline-flex items-center gap-1.5 font-semibold text-text">
                                    <LocationPinIcon className="size-3.5 shrink-0 text-accent" />
                                    Konum
                                  </span>
                                  <span>{vehicle.defaultReturnHandoverName ?? "—"}</span>
                                </p>
                              </div>
                            ) : null}
                          </div>
                        ) : (vehicle.defaultPickupHandoverLocationId || vehicle.defaultReturnHandoverLocationId) ? (
                          <ul className="m-0 list-none space-y-3 text-[13px] text-text-muted">
                            {vehicle.defaultPickupHandoverLocationId ? (
                              <li className="rounded-lg border border-border-subtle/70 bg-bg-card/60 px-3 py-2.5">
                                <p className="m-0 mb-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                                  Varsayılan alış
                                </p>
                                <p className="m-0 flex flex-wrap items-baseline gap-x-1.5 font-medium text-text">
                                  <LocationPinIcon className="size-3.5 shrink-0 text-accent" />
                                  {vehicle.defaultPickupHandoverName ?? vehicle.pickupLocationLabel ?? "—"}
                                </p>
                              </li>
                            ) : null}
                            {vehicle.defaultReturnHandoverLocationId ? (
                              <li className="rounded-lg border border-border-subtle/70 bg-bg-card/60 px-3 py-2.5">
                                <p className="m-0 mb-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                                  Varsayılan teslim
                                </p>
                                <p className="m-0 flex flex-wrap items-baseline gap-x-1.5 font-medium text-text">
                                  <LocationPinIcon className="size-3.5 shrink-0 text-accent" />
                                  {vehicle.defaultReturnHandoverName ?? "—"}
                                </p>
                              </li>
                            ) : null}
                          </ul>
                        ) : (
                          <p className="m-0 text-sm text-text-muted">
                            Bu araç için henüz tanımlı alış/teslim noktası bilgisi yok.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div id="arac-paket" className="scroll-mt-28 border-t border-border-subtle pt-8">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-text-muted">Paket özeti</h3>
                    <div className="mt-4 grid gap-8 sm:grid-cols-2 sm:gap-0 sm:divide-x sm:divide-border-subtle">
                      <section className="min-w-0 sm:pr-6">
                        <div className="flex items-center gap-2">
                          <CheckCircleSoftIcon className="size-5 shrink-0 text-accent" />
                          <p className="text-sm font-bold uppercase tracking-wide text-text">Dahil olanlar</p>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-text-muted">
                          Kiralama bedeline dahil edilen hizmet ve güvenceler.
                        </p>
                        <ul className="mt-4 space-y-2.5" role="list">
                          {vehicle.included.map((x) => (
                            <li key={x} className="flex gap-2.5 text-sm font-medium leading-snug text-text">
                              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-btn-solid" aria-hidden />
                              <span>{x}</span>
                            </li>
                          ))}
                        </ul>
                      </section>
                      <section className="min-w-0 sm:pl-6">
                        <div className="flex items-center gap-2">
                          <XCircleSoftIcon className="size-5 shrink-0 text-text-muted" />
                          <p className="text-sm font-bold uppercase tracking-wide text-text">Dahil olmayanlar</p>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-text-muted">
                          Ek masraf veya sürücü sorumluluğunda olan kalemler.
                        </p>
                        <ul className="mt-4 space-y-2.5" role="list">
                          {vehicle.notIncluded.map((x) => (
                            <li key={x} className="flex gap-2.5 text-sm font-medium leading-snug text-text-muted">
                              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-text-muted/50" aria-hidden />
                              <span>{x}</span>
                            </li>
                          ))}
                        </ul>
                      </section>
                    </div>
                  </div>
                </div>
              </section>

            </div>
          </div>

          <div className="mt-14 pt-10">
            <VehicleRentalFaqPanel className="min-w-0" />
          </div>
        </div>
    </div>
  );
}
