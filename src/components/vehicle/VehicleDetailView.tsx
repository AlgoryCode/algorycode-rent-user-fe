"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FleetVehicle } from "@/data/fleet";
import { formatTry } from "@/data/fleet";
import { blockedDaysInInclusiveRange, blockedSetForVehicle } from "@/data/availability";
import { pickupLocations } from "@/data/locations";
import { RentalAvailabilityCalendarPanel } from "@/components/calendar/RentalAvailabilityCalendarPanel";
import { compareIso } from "@/lib/calendarGrid";
import { parseIsoDate, rentalNights } from "@/lib/dates";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { EngineIcon, LuggageIcon, SeatIcon } from "@/components/ui/VehicleSpecIcons";
import { Reveal } from "@/components/ui/Reveal";
import { ReservationCalendarSupportAside } from "@/components/vehicle/ReservationCalendarSupportAside";
import { VehicleRentalConditionsCard } from "@/components/vehicle/VehicleRentalConditionsCard";
import { VehicleRentalPriceDetails } from "@/components/vehicle/VehicleRentalPriceDetails";
import { VehicleRentalFaqPanel } from "@/components/vehicle/VehicleRentalFaqPanel";
import { fetchHasBffSession } from "@/lib/bff-access-token";

const defaultGarageCopy =
  "İstanbul, Maslak — Filo hazırlık noktası (demo). Teslim öncesi araç bu bölgededir.";

type VehicleSpecIconKind = "seat" | "engine" | "luggage";

function GalleryThumb({
  src,
  selected,
  onSelect,
  sizes,
  priority,
}: {
  src: string;
  selected: boolean;
  onSelect: () => void;
  sizes: string;
  priority?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative aspect-[4/3] w-[4.5rem] shrink-0 overflow-hidden rounded-lg border-2 bg-bg-raised outline-none ring-accent/0 transition-[border-color,opacity,box-shadow,ring] duration-150 focus-visible:ring-2 focus-visible:ring-accent/40 sm:w-[5.25rem] ${
        selected
          ? "border-accent opacity-100 shadow-sm shadow-accent/20"
          : "border-transparent opacity-80 hover:border-border-subtle hover:opacity-100"
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
  const router = useRouter();
  const pathname = usePathname();
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
  const defaultLocId = pickupLocations[0]?.id ?? "ist-airport-ist";
  const pickupLocId = sp.get("lokasyon") || defaultLocId;
  const returnLocId = sp.get("lokasyonTeslim") || pickupLocId;
  const planVehicleAbroad = sp.get("ulkeDisi") === "1";

  const [reserveError, setReserveError] = useState<string | null>(null);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [bffSession, setBffSession] = useState(false);

  useEffect(() => {
    void fetchHasBffSession().then(setBffSession);
  }, []);

  const pushQuery = useCallback(
    (mutate: (q: URLSearchParams) => void) => {
      const q = new URLSearchParams(queryString);
      mutate(q);
      router.replace(`${pathname}?${q.toString()}`, { scroll: false });
    },
    [pathname, queryString, router],
  );

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

  const buildReserveHref = useCallback(() => {
    const q = new URLSearchParams();
    q.set("arac", vehicle.id);
    q.set("alis", pickup);
    q.set("teslim", ret);
    q.set("lokasyon", pickupLocId);
    q.set("lokasyonTeslim", returnLocId);
    if (planVehicleAbroad) q.set("ulkeDisi", "1");
    return `/rezervasyon?${q.toString()}`;
  }, [pickup, ret, pickupLocId, returnLocId, planVehicleAbroad, vehicle.id]);

  const applyDatesToUrl = (p: string, r: string) => {
    pushQuery((q) => {
      q.set("alis", p);
      q.set("teslim", r);
      if (!q.get("lokasyon")) q.set("lokasyon", defaultLocId);
      if (!q.get("lokasyonTeslim")) q.set("lokasyonTeslim", q.get("lokasyon")!);
    });
  };

  const clearDatesFromUrl = useCallback(() => {
    setReserveError(null);
    pushQuery((q) => {
      q.delete("alis");
      q.delete("teslim");
    });
  }, [pushQuery]);

  const goReserve = () => {
    setReserveError(null);
    if (!hasRangeSelected) return;
    const blocked = blockedSetForVehicle(vehicle.id);
    const overlap = blockedDaysInInclusiveRange(pickup, ret, blocked);
    if (overlap.length > 0) {
      const fmt = overlap.slice(0, 3).map((d) =>
        parseIsoDate(d)!.toLocaleDateString("tr-TR", { day: "numeric", month: "short" }),
      );
      const more = overlap.length > 3 ? ` +${overlap.length - 3}` : "";
      setReserveError(
        `Seçtiğiniz aralıkta dolu günler var: ${fmt.join(", ")}${more}. Takvimden aralığı değiştirin.`,
      );
      return;
    }
    const target = buildReserveHref();
    if (bffSession) {
      router.push(target);
      return;
    }
    setAuthPromptOpen(true);
  };

  const specItems: { label: string; value: string; icon?: VehicleSpecIconKind }[] = [
    { label: "Model yılı", value: String(vehicle.year) },
    { label: "Vites", value: vehicle.transmission === "otomatik" ? "Otomatik" : "Manuel" },
    { label: "Motor", value: vehicle.engine, icon: "engine" },
    ...(vehicle.powerKw > 0 ? [{ label: "Güç", value: `${vehicle.powerKw} kW` }] : []),
    { label: "Bagaj", value: `${vehicle.luggage} L`, icon: "luggage" },
    { label: "Koltuk", value: `${vehicle.seats} kişi`, icon: "seat" },
  ];

  const garageText = vehicle.garageLocation ?? defaultGarageCopy;

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
        />
      ))}
    </div>
  );

  const mainGallerySrc = galleryImages[activeImage] ?? vehicle.image;

  const calendarBlock = (
    <section id="arac-takvim" className="scroll-mt-20 w-full min-w-0 max-w-full sm:scroll-mt-24 lg:scroll-mt-28">
      <RentalAvailabilityCalendarPanel
        embedded
        embeddedWide
        className="rounded-xl bg-transparent"
        vehicleId={vehicle.id}
        pickup={pickup}
        returnDate={ret}
        syncToken={queryString}
        footerMode="inline"
        onCommit={applyDatesToUrl}
        onInlineReset={clearDatesFromUrl}
        title="Rezervasyon takvimi"
      />
    </section>
  );

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
          <div className="relative aspect-[16/10] max-h-[min(78vh,720px)] w-full overflow-hidden rounded-2xl border border-white/15 bg-black/40 shadow-2xl">
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
    <div className={`pt-[4.5rem] sm:pt-20 ${hasRangeSelected ? "pb-28 sm:pb-20" : "pb-20"}`}>
      {lightbox}
      {authPromptOpen && (
        <div className="fixed inset-0 z-[650] flex items-end justify-center p-3 sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Kapat"
            onClick={() => setAuthPromptOpen(false)}
          />
          <div className="relative z-[651] w-full max-w-md rounded-2xl border border-border-subtle bg-bg-card/95 p-4 shadow-xl backdrop-blur">
            <h3 className="text-base font-semibold text-text">Rezervasyona nasıl devam etmek istersiniz?</h3>
            <p className="mt-1.5 text-sm text-text-muted">
              Üye olmadan devam edebilir ya da giriş yaparak bilgilerinizi otomatik doldurabilirsiniz.
            </p>
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setAuthPromptOpen(false);
                  router.push(`${buildReserveHref()}&misafir=1`);
                }}
                className="w-full rounded-lg border border-border-subtle bg-bg-raised px-3 py-2.5 text-sm font-semibold text-text hover:border-accent/30"
              >
                Üye olmadan devam et
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthPromptOpen(false);
                  router.push(`/giris-yap?next=${encodeURIComponent(buildReserveHref())}`);
                }}
                className="w-full rounded-lg bg-accent px-3 py-2.5 text-sm font-semibold text-white"
              >
                Giriş yaparak devam et
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthPromptOpen(false);
                  router.push(`/uye-ol?next=${encodeURIComponent(buildReserveHref())}`);
                }}
                className="w-full rounded-lg border border-border-subtle px-3 py-2.5 text-sm text-text-muted hover:text-text"
              >
                Üye ol
              </button>
            </div>
          </div>
        </div>
      )}
      {hasRangeSelected && (
        <div
          className="fixed inset-x-0 bottom-0 z-30 border-t border-border-subtle bg-bg-deep/95 px-4 pt-3 backdrop-blur-md sm:hidden"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }}
        >
          <AnimatedButton variant="primary" className="w-full" onClick={goReserve}>
            Rezervasyona devam et
          </AnimatedButton>
        </div>
      )}

      <div className="mx-auto max-w-6xl px-3 sm:px-5 lg:px-8">
        <nav className="flex flex-wrap items-center gap-2 text-[11px] text-text-muted sm:text-xs">
          <Link href="/" className="hover:text-text">
            Ana sayfa
          </Link>
          <span aria-hidden>/</span>
          <Link href="/araclar" className="hover:text-text">
            Araçlar
          </Link>
          <span aria-hidden>/</span>
          <span className="line-clamp-1 text-text">{vehicle.name}</span>
        </nav>

        <div className="mt-4 space-y-5 lg:mt-6 lg:space-y-6">
          <div className="grid gap-5 lg:grid-cols-2 lg:items-start lg:gap-6 xl:gap-8">
            <div id="arac-galeri" className="min-w-0 scroll-mt-28">
              <button
                type="button"
                onClick={() => openLightbox(activeImage)}
                className="group relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-border-subtle bg-bg-raised/50 text-left shadow-sm outline-none ring-accent/0 transition-[border-color,box-shadow,ring] focus-visible:ring-2 focus-visible:ring-accent/40"
                aria-label="Görseli tam ekranda aç"
              >
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
                      src={mainGallerySrc}
                      alt={vehicle.imageAlt}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      sizes="(max-width:1024px) 100vw, 50vw"
                      priority={activeImage === 0}
                    />
                  </motion.div>
                </AnimatePresence>
                <span className="pointer-events-none absolute bottom-2 right-2 rounded-md border border-white/20 bg-black/45 px-2 py-0.5 text-[9px] font-medium text-white/90 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 sm:text-[10px]">
                  Tam ekran
                </span>
              </button>
              {galleryImages.length > 1 && <div className="mt-2">{galleryThumbnails}</div>}
            </div>

            <div className="min-w-0 space-y-4 sm:space-y-5">
              <Reveal>
                <div className="mt-2.5 flex flex-col gap-2 sm:mt-3 sm:gap-3">
                  <div className="min-w-0">
                    <h1 className="font-display text-xl font-semibold tracking-tight text-text sm:text-2xl lg:text-[1.4rem] lg:leading-snug xl:text-[1.5rem]">
                      {vehicle.name}
                    </h1>
                    <p className="mt-0.5 text-xs text-text-muted sm:text-sm">{vehicle.brand}</p>
                  </div>
                </div>
              </Reveal>

              <section id="arac-ozet" className="scroll-mt-28 pt-0.5 sm:pt-1">
                <h2 className="font-display text-sm font-semibold tracking-tight text-text sm:text-base">Araç Bilgileri</h2>
                <div className="mt-1.5 grid grid-cols-3 gap-1">
                  {specItems.map((s) => {
                    const iconCls = "h-3 w-3 shrink-0 text-text-muted";
                    const labelIcon =
                      s.icon === "engine" ? (
                        <EngineIcon className={iconCls} />
                      ) : s.icon === "luggage" ? (
                        <LuggageIcon className={iconCls} />
                      ) : s.icon === "seat" ? (
                        <SeatIcon className={iconCls} />
                      ) : null;
                    return (
                      <div
                        key={s.label}
                        className="rounded border border-border-subtle bg-bg-card/50 px-1.5 py-1"
                      >
                        <p className="flex min-h-[0.875rem] items-center gap-0.5 text-[7px] font-medium uppercase leading-none tracking-wide text-text-muted sm:text-[8px]">
                          {labelIcon}
                          <span className="min-w-0 truncate">{s.label}</span>
                        </p>
                        <p className="mt-0.5 text-[10px] font-medium leading-tight text-text sm:text-[11px]">{s.value}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-1.5 rounded border border-border-subtle bg-bg-card/50 px-2 py-1.5 sm:px-2.5 sm:py-2">
                  <p className="text-[7px] font-medium uppercase leading-none tracking-wide text-text-muted sm:text-[8px]">
                    Araç konumu
                  </p>
                  <p className="mt-0.5 text-[10px] font-medium leading-snug text-text sm:text-[11px]">
                    {garageText}
                  </p>
                </div>
                <div className="mt-2 rounded-md border border-border-subtle bg-bg-card/70 px-3 py-2 text-text-muted tabular-nums shadow-sm">
                  <span className="block text-[10px] uppercase tracking-wide text-text-muted/75">Günlük fiyat</span>
                  <span className="font-semibold text-text">{formatTry(vehicle.pricePerDay)}</span>
                </div>
              </section>

              <div id="arac-paket" className="scroll-mt-28 pt-1 sm:pt-2">
                <h2 className="font-display text-base font-semibold text-text sm:text-lg">Paket</h2>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 sm:gap-3">
                  <section className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5 sm:p-3.5">
                    <h3 className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300/90">
                      Dahil
                    </h3>
                    <ul className="mt-1.5 space-y-0.5 text-[10px] leading-snug text-text-muted sm:mt-2 sm:space-y-1 sm:text-[12px]">
                      {vehicle.included.map((x) => (
                        <li key={x}>· {x}</li>
                      ))}
                    </ul>
                  </section>
                  <section className="rounded-lg border border-white/10 bg-bg-raised/50 p-2.5 sm:p-3.5">
                    <h3 className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                      Dahil değil
                    </h3>
                    <ul className="mt-1.5 space-y-0.5 text-[10px] leading-snug text-text-muted sm:mt-2 sm:space-y-1 sm:text-[12px]">
                      {vehicle.notIncluded.map((x) => (
                        <li key={x}>· {x}</li>
                      ))}
                    </ul>
                  </section>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full space-y-5 sm:space-y-6">
            <div className="mx-auto grid w-full max-w-5xl gap-5 lg:grid-cols-[minmax(0,1fr)_min(100%,20rem)] lg:items-start lg:gap-6 xl:max-w-6xl xl:gap-8">
              <div className="min-w-0 w-full max-w-md sm:max-w-lg lg:max-w-none">
                {calendarBlock}
              </div>
              <div className="flex min-w-0 w-full max-w-md flex-col gap-4 sm:max-w-lg lg:max-w-none">
                <VehicleRentalPriceDetails
                  pricePerDay={vehicle.pricePerDay}
                  nights={hasRangeSelected && nights != null ? nights : null}
                />
                {reserveError && (
                  <div>
                    <p className="rounded-md border border-amber-500/35 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-text">
                      {reserveError}
                    </p>
                  </div>
                )}
                {!hasRangeSelected && (
                  <p className="rounded-md border border-amber-500/30 bg-amber-500/[0.07] px-3 py-2 text-[12px] leading-snug text-text">
                    Rezervasyona devam etmek için gün bilgisi seçiniz.
                  </p>
                )}
                <div>
                  <AnimatedButton
                    variant="primary"
                    className="w-full min-w-0"
                    disabled={!hasRangeSelected}
                    onClick={goReserve}
                  >
                    Rezervasyona devam et
                  </AnimatedButton>
                  {hasRangeSelected && (
                    <p className="mt-1.5 text-[10px] leading-snug text-text-muted sm:text-[11px]">
                      Lokasyon ve ekleri bir sonraki adımda düzenlersiniz.
                    </p>
                  )}
                </div>
                <VehicleRentalConditionsCard />
                <ReservationCalendarSupportAside />
              </div>
            </div>
            <VehicleRentalFaqPanel className="min-w-0" />
          </div>
        </div>
      </div>
    </div>
  );
}
