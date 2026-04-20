"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FleetVehicle, FuelType } from "@/data/fleet";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { pickupLocations } from "@/data/locations";
import { compareIso } from "@/lib/calendarGrid";
import { addDays, parseIsoDate, rentalNights, todayIso, toIsoDate } from "@/lib/dates";
import { CalendarDaysIcon } from "@/components/ui/Icons";
import { CheckCircleSoftIcon, MapPinGarageIcon, XCircleSoftIcon } from "@/components/ui/VehicleSpecIcons";
import { VehicleRentalFaqPanel } from "@/components/vehicle/VehicleRentalFaqPanel";
import { GuestReservationGate } from "@/components/auth/GuestReservationGate";
import { clearBffBearerCache, fetchHasBffMemberSession } from "@/lib/bff-access-token";
import { RENT_GUEST_PREFILL_EMAIL_QUERY, RENT_RESERVATION_GUEST_ACK_QUERY } from "@/lib/guestAuthClient";

const defaultGarageCopy =
  "İstanbul, Maslak — Filo hazırlık noktası (demo). Teslim öncesi araç bu bölgededir.";

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
  vehicle,
  queryString,
}: {
  vehicle: FleetVehicle;
  queryString: string;
}) {
  const { formatPrice } = useI18n();
  const router = useRouter();
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const sp = useMemo(() => new URLSearchParams(queryString), [queryString]);

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
  const defaultLocId =
    vehicle.pickupHandoverForBooking?.id ??
    vehicle.defaultPickupHandoverLocationId ??
    pickupLocations[0]?.id ??
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

  const buildReserveHref = useCallback(() => {
    const q = new URLSearchParams();
    q.set("arac", vehicle.id);
    q.set("alis", reserveDatePair.alis);
    q.set("teslim", reserveDatePair.teslim);
    q.set("lokasyon", pickupLocId);
    q.set("lokasyonTeslim", returnLocId);
    if (planVehicleAbroad) q.set("ulkeDisi", "1");
    return `/rezervasyon?${q.toString()}`;
  }, [reserveDatePair, pickupLocId, returnLocId, planVehicleAbroad, vehicle.id]);

  const goToReservationPage = useCallback(() => {
    if (hasMemberReserveSession) {
      router.push(buildReserveHref());
      return;
    }
    setGuestSubflow(false);
    setAuthPromptOpen(true);
  }, [hasMemberReserveSession, buildReserveHref, router]);

  const garageText = vehicle.garageLocation ?? defaultGarageCopy;

  /** Hero: kompakt teknik özet (lacivert blokta okunaklı, sade). */
  const heroVehicleSpecs = useMemo(
    () => [
      {
        label: "Vites",
        value: vehicle.transmission === "otomatik" ? "Otomatik" : "Manuel",
      },
      { label: "Yakıt", value: fuelLabel(vehicle.fuel) },
      { label: "Model", value: String(vehicle.year) },
      { label: "Koltuk", value: String(vehicle.seats) },
      { label: "Bagaj", value: `${vehicle.luggage} L` },
    ],
    [vehicle.fuel, vehicle.luggage, vehicle.seats, vehicle.transmission, vehicle.year],
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
          variant="onDark"
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
            <AnimatePresence mode="wait">
              <motion.div
                key={activeImage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0"
              >
                <Image
                  src={galleryImages[activeImage] ?? vehicle.image}
                  alt={vehicle.imageAlt}
                  fill
                  className="object-contain"
                  sizes="(max-width: 1024px) 100vw, 1024px"
                  priority
                />
              </motion.div>
            </AnimatePresence>
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
    <div className="pb-20 pt-[var(--header-h)]">
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
      <section className="border-b border-white/10 bg-navy-hero text-white">
        <div className="mx-auto max-w-6xl px-3 pb-10 pt-5 sm:px-5 sm:pb-12 lg:px-8">
          <nav className="flex flex-wrap items-center gap-2 text-[11px] font-medium tracking-wide text-white/50 sm:text-xs">
            <Link href="/" className="transition-colors hover:text-white">
              Ana sayfa
            </Link>
            <span className="text-white/25" aria-hidden>
              /
            </span>
            <Link href="/araclar" className="transition-colors hover:text-white">
              Araçlar
            </Link>
            <span className="text-white/25" aria-hidden>
              /
            </span>
            <span className="line-clamp-1 font-semibold text-white/90">{vehicle.name}</span>
          </nav>

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)] lg:items-start lg:gap-10">
            <div id="arac-galeri" className="min-w-0 scroll-mt-28">
              <div className="overflow-hidden rounded-xl border border-white/15 bg-black/30 shadow-2xl">
                <button
                  type="button"
                  onClick={() => openLightbox(activeImage)}
                  className="group relative aspect-[16/10] w-full overflow-hidden border-0 bg-black/40 text-left outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
                  aria-label="Görseli tam ekranda aç"
                >
                  <span className="pointer-events-none absolute left-3 top-3 z-[1] border border-sky-400/50 bg-sky-600/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                    {vehicle.category}
                  </span>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeImage}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.22 }}
                      className="absolute inset-0"
                    >
                      <Image
                        src={mainGallerySrc}
                        alt={vehicle.imageAlt}
                        fill
                        className="object-cover transition-transform duration-[480ms] ease-out group-hover:scale-[1.02]"
                        sizes="(max-width:1024px) 100vw, 58vw"
                        priority={activeImage === 0}
                      />
                    </motion.div>
                  </AnimatePresence>
                  {galleryImages.length > 1 && (
                    <span className="pointer-events-none absolute right-3 top-3 border border-white/30 bg-black/75 px-2.5 py-1 text-[10px] font-bold tabular-nums tracking-widest text-white">
                      {activeImage + 1} / {galleryImages.length}
                    </span>
                  )}
                  <span className="pointer-events-none absolute bottom-3 right-3 border border-white/35 bg-black/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white opacity-0 transition-opacity group-hover:opacity-100">
                    Tam ekran
                  </span>
                </button>
                {galleryImages.length > 1 && (
                  <div className="border-t border-white/10 bg-black/35 px-3 py-2.5">{galleryThumbnails}</div>
                )}
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-4 lg:pt-1">
              <div className="flex flex-wrap gap-2">
                {vehicle.badge ? (
                  <span className="border border-white/25 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-steel">
                    {vehicle.badge}
                  </span>
                ) : null}
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[2.35rem] lg:leading-[1.12] xl:text-4xl">
                {vehicle.name}
              </h1>
              <dl className="mt-3 flex w-full max-w-md flex-col divide-y divide-white/15 overflow-hidden rounded-xl border border-white/[0.14] bg-gradient-to-b from-white/[0.09] to-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md sm:mt-4 sm:flex-row sm:divide-x sm:divide-y-0 sm:divide-white/15 sm:px-1 sm:py-1">
                {heroVehicleSpecs.map((row) => (
                  <div
                    key={row.label}
                    className="flex flex-row items-center justify-between gap-3 px-3 py-2.5 sm:flex-1 sm:flex-col sm:justify-center sm:gap-0.5 sm:px-3 sm:py-3.5 sm:text-center"
                  >
                    <dt className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/45">
                      {row.label}
                    </dt>
                    <dd className="min-w-0 text-right text-[13px] font-semibold tabular-nums tracking-tight text-white/92 sm:text-sm sm:text-center">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="mt-5 sm:mt-6">
                <p className="text-3xl font-bold tabular-nums text-white sm:text-4xl">
                  {formatPrice(vehicle.pricePerDay)}
                  <span className="text-lg font-semibold text-white/80 sm:text-xl"> / günlük</span>
                </p>
              </div>
              <button
                type="button"
                className="group relative mt-3 inline-flex w-full max-w-md cursor-pointer overflow-hidden rounded-md border border-white/25 bg-white px-4 py-3.5 text-sm font-bold uppercase tracking-wide shadow-[0_12px_40px_-12px_rgba(0,0,0,0.45)] transition-[border-color,box-shadow] hover:border-white/40 hover:shadow-[0_16px_44px_-14px_rgba(0,0,0,0.5)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 lg:w-auto lg:min-w-[17rem]"
                onClick={() => goToReservationPage()}
              >
                <span
                  className="absolute inset-0 origin-left scale-x-0 bg-navy-hero transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:duration-150 group-hover:scale-x-100"
                  aria-hidden
                />
                <span className="relative z-[1] inline-flex items-center justify-center gap-2 text-navy-hero transition-colors duration-300 group-hover:text-white">
                  <CalendarDaysIcon className="size-5 shrink-0 text-navy-hero transition-colors duration-300 group-hover:text-white" />
                  Rezervasyon yap
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="relative z-[1] border-x border-border-subtle bg-bg-card px-3 pb-16 pt-9 shadow-[0_-16px_48px_-28px_rgba(11,30,59,0.12)] sm:px-5 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto min-w-0 max-w-3xl space-y-8 lg:space-y-9">
              {vehicle.highlights.length > 0 ? (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Öne çıkanlar</p>
                  <ul className="mt-3 flex flex-wrap gap-2" role="list">
                    {vehicle.highlights.slice(0, 5).map((h) => (
                      <li
                        key={h}
                        className="inline-flex max-w-full items-center gap-2 rounded-lg border border-border-subtle bg-bg-raised/50 px-3 py-1.5 text-xs font-medium text-text dark:bg-bg-deep/40"
                      >
                        <CheckCircleSoftIcon className="size-3.5 shrink-0 text-accent" />
                        <span className="min-w-0 leading-snug">{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <section id="arac-ozet" className="scroll-mt-28" aria-labelledby="arac-konum-baslik">
                <h2
                  id="arac-konum-baslik"
                  className="text-lg font-bold tracking-tight text-navy-hero dark:text-white"
                >
                  Konum
                </h2>
                <div className="mt-4 flex gap-3 rounded-xl border border-border-subtle bg-bg-raised/50 p-4 shadow-sm dark:bg-bg-deep/40">
                  <MapPinGarageIcon className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
                  <div className="min-w-0 space-y-2 text-sm font-medium leading-relaxed text-text">
                    <p>{garageText}</p>
                    {vehicle.pickupHandoverForBooking || (vehicle.returnHandoversForBooking?.length ?? 0) > 0 ? (
                      <div className="space-y-3 border-t border-border-subtle/70 pt-3 text-[13px] text-text-muted">
                        <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                          Alış / teslim noktaları
                        </p>
                        {vehicle.pickupHandoverForBooking ? (
                          <p className="m-0">
                            <span className="font-medium text-text">Alış: </span>
                            {vehicle.pickupHandoverForBooking.name}
                            {typeof vehicle.pickupHandoverForBooking.surchargeEur === "number" &&
                            vehicle.pickupHandoverForBooking.surchargeEur > 0
                              ? ` · +${vehicle.pickupHandoverForBooking.surchargeEur} €`
                              : null}
                          </p>
                        ) : vehicle.defaultPickupHandoverLocationId ? (
                          <p className="m-0">
                            <span className="font-medium text-text">Alış: </span>
                            {vehicle.defaultPickupHandoverName ?? vehicle.pickupLocationLabel ?? "—"}
                          </p>
                        ) : null}
                        {vehicle.returnHandoversForBooking && vehicle.returnHandoversForBooking.length > 0 ? (
                          <div>
                            <p className="m-0 mb-1.5 font-medium text-text">Teslim seçenekleri</p>
                            <ul className="m-0 list-none space-y-1.5 p-0">
                              {vehicle.returnHandoversForBooking.map((h) => (
                                <li
                                  key={h.id}
                                  className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 rounded-md border border-border-subtle/60 bg-bg-card/40 px-2.5 py-1.5 text-[12px]"
                                >
                                  <span className="min-w-0 text-text">{h.name}</span>
                                  {typeof h.surchargeEur === "number" && h.surchargeEur > 0 ? (
                                    <span className="shrink-0 tabular-nums text-accent">+{h.surchargeEur} €</span>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : vehicle.defaultReturnHandoverLocationId ? (
                          <p className="m-0">
                            <span className="font-medium text-text">Teslim: </span>
                            {vehicle.defaultReturnHandoverName ?? "—"}
                          </p>
                        ) : null}
                      </div>
                    ) : (vehicle.defaultPickupHandoverLocationId || vehicle.defaultReturnHandoverLocationId) ? (
                      <ul className="list-inside list-disc space-y-1 text-[13px] text-text-muted">
                        {vehicle.defaultPickupHandoverLocationId ? (
                          <li>
                            Varsayılan alış:{" "}
                            <span className="font-medium text-text">
                              {vehicle.defaultPickupHandoverName ?? vehicle.pickupLocationLabel ?? "—"}
                            </span>
                          </li>
                        ) : null}
                        {vehicle.defaultReturnHandoverLocationId ? (
                          <li>
                            Varsayılan teslim:{" "}
                            <span className="font-medium text-text">
                              {vehicle.defaultReturnHandoverName ?? "—"}
                            </span>
                          </li>
                        ) : null}
                      </ul>
                    ) : null}
                  </div>
                </div>
                <p className="mt-3 text-[13px] leading-relaxed text-text-muted">
                  Genel ek hizmetler (sigorta paketleri, bebek koltuğu vb.) rezervasyon sihirbazında sunucu
                  kataloğundan seçilir; araca özel ücretli seçenekler varsa aynı adımda listelenir.
                </p>
              </section>

              <div id="arac-paket" className="scroll-mt-28">
                <h2 className="text-lg font-bold tracking-tight text-navy-hero dark:text-white">Paket özeti</h2>
                <p className="mt-1 text-sm text-text-muted">Ayrıntılar için SSS bölümüne bakın.</p>
                <div className="mt-4 grid gap-4 rounded-xl border border-border-subtle bg-bg-raised/30 p-4 sm:grid-cols-2 sm:gap-0 sm:divide-x sm:divide-border-subtle dark:bg-bg-deep/30">
                  <section className="sm:pr-4">
                    <div className="flex items-center gap-2">
                      <CheckCircleSoftIcon className="size-5 shrink-0 text-accent" />
                      <h3 className="text-xs font-bold uppercase tracking-wide text-text">Dahil</h3>
                    </div>
                    <ul className="mt-3 space-y-2" role="list">
                      {vehicle.included.slice(0, 5).map((x) => (
                        <li key={x} className="flex gap-2 text-sm font-medium leading-snug text-text">
                          <span className="mt-2 size-1 shrink-0 rounded-full bg-btn-solid" aria-hidden />
                          <span>{x}</span>
                        </li>
                      ))}
                    </ul>
                    {vehicle.included.length > 5 ? (
                      <p className="mt-2 text-xs text-text-muted">+{vehicle.included.length - 5} madde daha</p>
                    ) : null}
                  </section>
                  <section className="sm:pl-4">
                    <div className="flex items-center gap-2">
                      <XCircleSoftIcon className="size-5 shrink-0 text-text-muted" />
                      <h3 className="text-xs font-bold uppercase tracking-wide text-text">Dahil değil</h3>
                    </div>
                    <ul className="mt-3 space-y-2" role="list">
                      {vehicle.notIncluded.slice(0, 4).map((x) => (
                        <li key={x} className="flex gap-2 text-sm font-medium leading-snug text-text-muted">
                          <span className="mt-2 size-1 shrink-0 rounded-full bg-text-muted/50" aria-hidden />
                          <span>{x}</span>
                        </li>
                      ))}
                    </ul>
                    {vehicle.notIncluded.length > 4 ? (
                      <p className="mt-2 text-xs text-text-muted">+{vehicle.notIncluded.length - 4} madde daha</p>
                    ) : null}
                  </section>
                </div>
              </div>

            </div>
          </div>

          <div className="mt-14 border-t border-border-subtle pt-10">
            <VehicleRentalFaqPanel className="min-w-0" />
          </div>
        </div>
    </div>
  );
}
