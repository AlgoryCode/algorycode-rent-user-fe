"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useI18n } from "@/components/i18n/LocaleProvider";
import type { FleetVehicle } from "@/data/fleet";
import { blockedDaysInInclusiveRange } from "@/data/availability";
import { useVehicleBlockedIsoDates } from "@/hooks/useVehicleBlockedIsoDates";
import { getLocationById, pickupLocations } from "@/data/locations";
import { HeroRentalRangeDatePickers } from "@/components/ui/HeroRentalRangeDatePickers";
import { compareIso } from "@/lib/calendarGrid";
import { addDays, parseIsoDate, rentalNights, formatTrDate, todayIso, toIsoDate } from "@/lib/dates";
import {
  computeRentalSubtotal,
  crossBorderOneWaySurcharge,
  eurToTry,
  vehicleAbroadUsageSurcharge,
} from "@/lib/pricing";
import {
  createRentalRequestAsRentGuest,
  createRentalRequestOnRentApi,
  fetchHandoverLocationsAsRentGuest,
  fetchHandoverLocationsFromRentApi,
  fetchHandoverPricingQuoteAsRentGuest,
  fetchHandoverPricingQuoteFromRentApi,
  fetchReservationExtraOptionsAsRentGuest,
  fetchReservationExtraOptionsFromRentApi,
  type CreateRentalRequestFormPayload,
  type ReservationExtraOptionTemplateDto,
} from "@/lib/rentApi";
import { GuestReservationGate } from "@/components/auth/GuestReservationGate";
import { fetchHasBffMemberSession } from "@/lib/bff-access-token";
import { RENT_GUEST_PREFILL_EMAIL_QUERY, RENT_RESERVATION_GUEST_ACK_QUERY } from "@/lib/guestAuthClient";
import { getStoredAuthUser } from "@/lib/authSession";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { LocationPinIcon } from "@/components/ui/LocationPinIcon";
import { DayPickerPopover } from "@/components/ui/DayPickerPopover";
import { RentIconBackButton, RentIconBackLink } from "@/components/ui/RentIconBack";
import { DifferentDropoffToggle } from "@/components/ui/DifferentDropoffToggle";
import { HERO_HALF_HOUR_SLOTS } from "@/components/ui/DayPickerPopover";
import { RentSelect } from "@/components/ui/RentSelect";

const steps = [
  { id: 1, title: "Tarih seçimi", short: "Tarih" },
  { id: 2, title: "Bilgileriniz", short: "Bilgi" },
  { id: 3, title: "Ek hizmetler", short: "Ek" },
  { id: 4, title: "Onay", short: "Onay" },
];

/** Demo: farklı bırakış (örn. 35$) — alış/teslim ülkesi aynıyken uygulanan sabit TRY ek ücreti */
const DIFFERENT_DROPOFF_DEMO_SURCHARGE_TRY = 1250;

const ease = [0.22, 1, 0.36, 1] as const;

const lgMediaQuery = "(min-width: 1024px)";

function subscribeLgMedia(onChange: () => void) {
  const mq = window.matchMedia(lgMediaQuery);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getLgMediaSnapshot() {
  return window.matchMedia(lgMediaQuery).matches;
}

function getLgMediaServerSnapshot() {
  return false;
}

function useIsLgUp() {
  return useSyncExternalStore(subscribeLgMedia, getLgMediaSnapshot, getLgMediaServerSnapshot);
}

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

type ExtraFeeLineItem = { key: string; label: string; amountTry: number };

function ExtraFeesPricingSection({
  formatPrice,
  extraFeeTry,
  lines,
}: {
  formatPrice: (amountTry: number) => string;
  extraFeeTry: number;
  lines: ExtraFeeLineItem[];
}) {
  if (extraFeeTry <= 0) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between gap-2 font-medium text-text">
        <span>Ek hizmetler</span>
        <span className="shrink-0 tabular-nums text-text">{formatPrice(extraFeeTry)}</span>
      </div>
      {lines.length > 0 ? (
        <ul className="ml-1.5 space-y-0.5 border-l-2 border-border-subtle/60 pl-2.5 text-[12px] leading-snug text-text-muted">
          {lines.map((row) => (
            <li key={row.key} className="flex justify-between gap-2">
              <span className="min-w-0">
                <span className="text-text-muted/80" aria-hidden>
                  -{" "}
                </span>
                {row.label}
              </span>
              <span className="shrink-0 tabular-nums">{formatPrice(row.amountTry)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function DifferentDropoffPricingSection({
  formatPrice,
  surchargeTry,
  lines,
}: {
  formatPrice: (amountTry: number) => string;
  surchargeTry: number;
  lines: ExtraFeeLineItem[];
}) {
  if (lines.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between gap-2 font-medium text-text">
        <span>Farklı teslim noktası</span>
        <span className="shrink-0 tabular-nums text-text">{formatPrice(surchargeTry)}</span>
      </div>
      <ul className="ml-1.5 space-y-0.5 border-l-2 border-border-subtle/60 pl-2.5 text-[12px] leading-snug text-text-muted">
        {lines.map((row) => (
          <li key={row.key} className="flex justify-between gap-2">
            <span className="min-w-0">
              <span className="text-text-muted/80" aria-hidden>
                -{" "}
              </span>
              {row.label}
            </span>
            <span className="shrink-0 tabular-nums">{formatPrice(row.amountTry)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BookingRentalSummaryCard({
  vehicle,
  nights,
  pickup,
  ret,
  formatPrice,
  vehicleBaseSubtotalTry,
  differentDropoffSurchargeTry,
  differentDropoffDetailLines,
  extraFeeTry,
  extraFeeLineItems,
  total,
  differentDropoff,
  pickupLocationLabel,
  returnLocationLabel,
  pickupTime,
  returnTime,
}: {
  vehicle: FleetVehicle;
  nights: number | null;
  pickup: string;
  ret: string;
  formatPrice: (amountTry: number) => string;
  vehicleBaseSubtotalTry: number;
  differentDropoffSurchargeTry: number;
  differentDropoffDetailLines: ExtraFeeLineItem[];
  extraFeeTry: number;
  extraFeeLineItems: ExtraFeeLineItem[];
  total: number;
  differentDropoff: boolean;
  pickupLocationLabel: string;
  returnLocationLabel: string;
  /** Özet satırında alış/teslim saati (örn. `08:00`). */
  pickupTime?: string;
  returnTime?: string;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-card/80 p-4 backdrop-blur-md">
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
      {nights != null && pickup && ret ? (
        <>
          <div className="mt-3 space-y-1.5 rounded-lg border border-border-subtle/70 bg-bg-raised/35 px-3 py-2.5 text-[12px] leading-snug text-text-muted dark:bg-bg-deep/25">
            <p>
              <span className="font-semibold text-text">Alış:</span> {formatTrDate(pickup)}
              {pickupTime ? (
                <>
                  {" "}
                  <span className="tabular-nums text-text-muted">· {pickupTime}</span>
                </>
              ) : null}
            </p>
            <p>
              <span className="font-semibold text-text">Teslim:</span> {formatTrDate(ret)}
              {returnTime ? (
                <>
                  {" "}
                  <span className="tabular-nums text-text-muted">· {returnTime}</span>
                </>
              ) : null}
            </p>
            {differentDropoff ? (
              <>
                <p className="mt-2 border-t border-border-subtle/60 pt-2">
                  <span className="font-semibold text-text">Alış yeri:</span> {pickupLocationLabel}
                </p>
                <p>
                  <span className="font-semibold text-text">Teslim yeri:</span> {returnLocationLabel}
                </p>
              </>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-text-muted">
            Günlük {formatPrice(vehicle.pricePerDay)}{" "}
            <span className="text-text-muted/80" aria-hidden>
              ×
            </span>{" "}
            <span className="font-medium tabular-nums text-text">{nights} gün</span>
          </p>
        </>
      ) : (
        <p className="text-xs text-text-muted">— · günlük {formatPrice(vehicle.pricePerDay)}</p>
      )}
      <div className="mt-4 space-y-1 border-t border-border-subtle pt-4 text-sm">
        <Row label="Araç" value={formatPrice(vehicleBaseSubtotalTry)} />
        {differentDropoff && differentDropoffDetailLines.length > 0 ? (
          <DifferentDropoffPricingSection
            formatPrice={formatPrice}
            surchargeTry={differentDropoffSurchargeTry}
            lines={differentDropoffDetailLines}
          />
        ) : null}
        <ExtraFeesPricingSection formatPrice={formatPrice} extraFeeTry={extraFeeTry} lines={extraFeeLineItems} />
        <div className="flex justify-between border-t border-border-subtle pt-2 font-semibold text-text">
          <span>Toplam tutar</span>
          <span>{formatPrice(total)}</span>
        </div>
      </div>
    </div>
  );
}

export function BookingWizard({ vehicle }: { vehicle: FleetVehicle }) {
  const { formatPrice } = useI18n();
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  /**
   * Üye değilken misafir JWT olsa bile kapıyı atlamıyoruz (`gate`).
   * Üye oturumu veya araç sayfasından `guestAck=1` + Bearer ile `ready`.
   */
  const [reserveAuthPhase, setReserveAuthPhase] = useState<"loading" | "gate" | "ready">("loading");
  const admittedViaGuestAckRef = useRef(false);
  const spRef = useRef(sp);
  const pathnameRef = useRef(pathname);
  spRef.current = sp;
  pathnameRef.current = pathname;

  const patchQuery = useCallback(
    (mutate: (q: URLSearchParams) => void) => {
      const q = new URLSearchParams(sp.toString());
      mutate(q);
      router.replace(`${pathname}?${q.toString()}`, { scroll: false });
    },
    [pathname, router, sp],
  );

  const guestAckParam = sp.get(RENT_RESERVATION_GUEST_ACK_QUERY);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const isMember = await fetchHasBffMemberSession();
      if (cancelled) return;
      if (isMember) {
        setReserveAuthPhase("ready");
        return;
      }
      if (admittedViaGuestAckRef.current) {
        setReserveAuthPhase("ready");
        return;
      }
      if (guestAckParam === "1") {
        if (cancelled) return;
        admittedViaGuestAckRef.current = true;
        const pre = spRef.current.get(RENT_GUEST_PREFILL_EMAIL_QUERY)?.trim().toLowerCase() ?? "";
        if (pre && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pre)) {
          setEmail(pre);
        }
        setReserveAuthPhase("ready");
        const q = new URLSearchParams(spRef.current.toString());
        q.delete(RENT_RESERVATION_GUEST_ACK_QUERY);
        q.delete(RENT_GUEST_PREFILL_EMAIL_QUERY);
        router.replace(`${pathnameRef.current}?${q.toString()}`, { scroll: false });
        return;
      }
      setReserveAuthPhase("gate");
    })();
    return () => {
      cancelled = true;
    };
  }, [guestAckParam, router]);

  const pickup = sp.get("alis") || "";
  const ret = sp.get("teslim") || "";
  const alisSaatRaw = (sp.get("alis_saat") ?? "").trim();
  const teslimSaatRaw = (sp.get("teslim_saat") ?? "").trim();
  const alisSaat = HERO_HALF_HOUR_SLOTS.includes(alisSaatRaw) ? alisSaatRaw : HERO_HALF_HOUR_SLOTS[0]!;
  const teslimSaat = HERO_HALF_HOUR_SLOTS.includes(teslimSaatRaw) ? teslimSaatRaw : HERO_HALF_HOUR_SLOTS[0]!;
  /** Anasayfa ile aynı yarım saat dilimleri; URL’de yoksa varsayılan yazar. */
  useEffect(() => {
    const needA = !HERO_HALF_HOUR_SLOTS.includes((sp.get("alis_saat") ?? "").trim());
    const needB = !HERO_HALF_HOUR_SLOTS.includes((sp.get("teslim_saat") ?? "").trim());
    if (!needA && !needB) return;
    const q = new URLSearchParams(sp.toString());
    if (needA) q.set("alis_saat", HERO_HALF_HOUR_SLOTS[0]!);
    if (needB) q.set("teslim_saat", HERO_HALF_HOUR_SLOTS[0]!);
    router.replace(`${pathname}?${q.toString()}`, { scroll: false });
  }, [pathname, router, sp]);

  const fromApiVehicle = uuidLikeRe.test(vehicle.id);
  const defaultHandoverPickup = vehicle.defaultPickupHandoverLocationId ?? "";
  const defaultHandoverReturn = vehicle.defaultReturnHandoverLocationId ?? "";

  const [apiPickupOptions, setApiPickupOptions] = useState<{ value: string; label: string; right?: string }[]>([]);
  const [apiReturnOptions, setApiReturnOptions] = useState<{ value: string; label: string; right?: string }[]>([]);
  type HandoverQuote = {
    pickupLegEur: number;
    returnLegEur: number;
    routeEur: number;
    totalEur: number;
    applied: boolean;
  };
  const [handoverQuote, setHandoverQuote] = useState<HandoverQuote | null>(null);

  useEffect(() => {
    if (!fromApiVehicle) {
      setApiPickupOptions([]);
      setApiReturnOptions([]);
      return;
    }
    if (reserveAuthPhase !== "ready") return;
    let cancelled = false;
    void (async () => {
      try {
        const member = await fetchHasBffMemberSession();
        const [p, r] = await Promise.all([
          member ? fetchHandoverLocationsFromRentApi("PICKUP") : fetchHandoverLocationsAsRentGuest("PICKUP"),
          member ? fetchHandoverLocationsFromRentApi("RETURN") : fetchHandoverLocationsAsRentGuest("RETURN"),
        ]);
        if (cancelled) return;
        const mapPickupRows = (rows: unknown[]) =>
          (Array.isArray(rows) ? rows : [])
            .filter((row) => {
              if (row == null || typeof row !== "object") return false;
              return (row as { active?: boolean }).active !== false;
            })
            .map((row) => {
              const o = row as Record<string, unknown>;
              return {
                value: String(o.id ?? ""),
                label: String(o.name ?? ""),
              };
            })
            .filter((x) => x.value.length > 0);
        const mapReturnRows = (rows: unknown[]) =>
          (Array.isArray(rows) ? rows : [])
            .filter((row) => {
              if (row == null || typeof row !== "object") return false;
              return (row as { active?: boolean }).active !== false;
            })
            .map((row) => {
              const o = row as Record<string, unknown>;
              const sur = o.surchargeEur;
              const surNum =
                typeof sur === "number" && Number.isFinite(sur)
                  ? sur
                  : typeof sur === "string"
                    ? Number(sur)
                    : NaN;
              const eur =
                typeof surNum === "number" && Number.isFinite(surNum) && surNum >= 0 ? surNum : 0;
              const right = eur > 0 ? `+${eur} €` : undefined;
              return {
                value: String(o.id ?? ""),
                label: String(o.name ?? ""),
                right,
              };
            })
            .filter((x) => x.value.length > 0);
        const pickupRows = mapPickupRows(p as unknown[]);
        const returnRows = mapReturnRows(r as unknown[]);

        type HandoverSelectOpt = { value: string; label: string; right?: string };
        let pickupOpts: HandoverSelectOpt[] = pickupRows;
        let returnOpts: HandoverSelectOpt[] = returnRows;

        const ph = vehicle.pickupHandoverForBooking;
        if (ph?.id) {
          const eur = ph.surchargeEur;
          pickupOpts = [
            {
              value: ph.id,
              label: ph.name || ph.id,
              right: typeof eur === "number" && eur > 0 ? `+${eur} €` : undefined,
            },
          ];
        }

        const rh = vehicle.returnHandoversForBooking;
        if (rh && rh.length > 0) {
          const byId = new Map(returnRows.map((o) => [o.value, o]));
          returnOpts = rh.map((h) => {
            const merged = byId.get(h.id);
            const eur = h.surchargeEur;
            const rightFromHandover =
              typeof eur === "number" && eur > 0 ? `+${eur} €` : merged?.right;
            return {
              value: h.id,
              label: h.name || h.id,
              right: rightFromHandover,
            };
          });
        }

        setApiPickupOptions(pickupOpts);
        setApiReturnOptions(returnOpts);
      } catch {
        if (!cancelled) {
          setApiPickupOptions([]);
          setApiReturnOptions([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fromApiVehicle, reserveAuthPhase, vehicle.pickupHandoverForBooking, vehicle.returnHandoversForBooking]);

  const firstPickupHandoverId = useMemo(
    () => apiPickupOptions.find((o) => uuidLikeRe.test(o.value))?.value ?? "",
    [apiPickupOptions],
  );
  const firstReturnHandoverId = useMemo(
    () => apiReturnOptions.find((o) => uuidLikeRe.test(o.value))?.value ?? "",
    [apiReturnOptions],
  );

  const rawLokasyon = (sp.get("lokasyon") ?? "").trim();
  const rawLokasyonTeslim = (sp.get("lokasyonTeslim") ?? "").trim();

  /** API aracı: URL’deki demo `lokasyon` slug’ı handover UUID değil; önce gerçek UUID (araç varsayılanı / API listesi). */
  const locId = fromApiVehicle
    ? uuidLikeRe.test(rawLokasyon)
      ? rawLokasyon
      : uuidLikeRe.test(defaultHandoverPickup)
        ? defaultHandoverPickup
        : firstPickupHandoverId
    : rawLokasyon || defaultHandoverPickup || pickupLocations[0]!.id;

  const returnLocId = fromApiVehicle
    ? uuidLikeRe.test(rawLokasyonTeslim)
      ? rawLokasyonTeslim
      : uuidLikeRe.test(defaultHandoverReturn)
        ? defaultHandoverReturn
        : uuidLikeRe.test(defaultHandoverPickup)
          ? defaultHandoverPickup
          : locId || firstReturnHandoverId || firstPickupHandoverId
    : rawLokasyonTeslim || (defaultHandoverReturn || defaultHandoverPickup || locId || pickupLocations[0]!.id);

  useEffect(() => {
    if (!fromApiVehicle) return;
    const badPickup = rawLokasyon.length > 0 && !uuidLikeRe.test(rawLokasyon);
    const badReturn = rawLokasyonTeslim.length > 0 && !uuidLikeRe.test(rawLokasyonTeslim);
    if (!badPickup && !badReturn) return;
    if (!uuidLikeRe.test(locId)) return;
    patchQuery((q) => {
      if (badPickup) q.set("lokasyon", locId);
      if (badReturn && uuidLikeRe.test(returnLocId)) q.set("lokasyonTeslim", returnLocId);
    });
  }, [fromApiVehicle, rawLokasyon, rawLokasyonTeslim, locId, returnLocId]);

  const handoverLabel = useCallback(
    (id: string) => {
      const hit = [...apiPickupOptions, ...apiReturnOptions].find((o) => o.value === id);
      return hit?.label ?? id;
    },
    [apiPickupOptions, apiReturnOptions],
  );

  const pickupLocation =
    fromApiVehicle && uuidLikeRe.test(locId)
      ? { label: handoverLabel(locId), countryCode: "" }
      : getLocationById(locId);
  const returnLocation =
    fromApiVehicle && uuidLikeRe.test(returnLocId)
      ? { label: handoverLabel(returnLocId), countryCode: "" }
      : getLocationById(returnLocId);
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

  const { blocked: bookingCalendarBlocked, loading: bookingCalendarBlockedLoading } =
    useVehicleBlockedIsoDates(vehicle.id);
  const bookingCalendarMaxIso = useMemo(() => toIsoDate(addDays(new Date(), 365)), []);

  const pickupLocationSelectOptions = useMemo(() => {
    if (fromApiVehicle && apiPickupOptions.length > 0) return apiPickupOptions;
    return pickupLocations.map((l) => ({ value: l.id, label: l.label, right: l.countryCode }));
  }, [fromApiVehicle, apiPickupOptions]);

  const returnLocationSelectOptions = useMemo(() => {
    if (fromApiVehicle && apiReturnOptions.length > 0) return apiReturnOptions;
    return pickupLocationSelectOptions;
  }, [fromApiVehicle, apiReturnOptions, pickupLocationSelectOptions]);

  const canChooseDifferentReturn = useMemo(
    () => returnLocationSelectOptions.length > 0 && returnLocationSelectOptions.some((o) => o.value !== locId),
    [returnLocationSelectOptions, locId],
  );
  const differentDropoff = Boolean(locId && returnLocId && locId !== returnLocId);

  /** Araça özel handover listesi: URL’deki UUID izin verilen kümede değilse geçerli varsayılana çekilir. */
  useEffect(() => {
    if (!fromApiVehicle) return;
    if (pickupLocationSelectOptions.length === 0 || returnLocationSelectOptions.length === 0) return;

    const pickupAllowed = new Set(pickupLocationSelectOptions.map((o) => o.value));
    const returnAllowed = new Set(returnLocationSelectOptions.map((o) => o.value));

    const fallbackPickup =
      pickupLocationSelectOptions.find((o) => uuidLikeRe.test(o.value))?.value ?? "";
    const fallbackReturn =
      returnLocationSelectOptions.find((o) => o.value !== fallbackPickup && uuidLikeRe.test(o.value))?.value ??
      returnLocationSelectOptions.find((o) => uuidLikeRe.test(o.value))?.value ??
      "";

    const pBad = uuidLikeRe.test(rawLokasyon) && !pickupAllowed.has(rawLokasyon);
    const rBad = uuidLikeRe.test(rawLokasyonTeslim) && !returnAllowed.has(rawLokasyonTeslim);
    if (!pBad && !rBad) return;

    patchQuery((q) => {
      if (pBad && fallbackPickup) q.set("lokasyon", fallbackPickup);
      if (rBad && fallbackReturn) q.set("lokasyonTeslim", fallbackReturn);
    });
  }, [
    fromApiVehicle,
    rawLokasyon,
    rawLokasyonTeslim,
    pickupLocationSelectOptions,
    returnLocationSelectOptions,
    patchQuery,
  ]);

  useEffect(() => {
    if (!fromApiVehicle || reserveAuthPhase !== "ready") {
      setHandoverQuote(null);
      return;
    }
    if (!differentDropoff || !uuidLikeRe.test(locId) || !uuidLikeRe.test(returnLocId)) {
      setHandoverQuote(null);
      return;
    }
    let cancelled = false;
    setHandoverQuote(null);
    void (async () => {
      const num = (u: unknown) => {
        if (typeof u === "number" && Number.isFinite(u)) return u;
        if (typeof u === "string") {
          const x = Number(u);
          return Number.isFinite(x) ? x : 0;
        }
        return 0;
      };
      try {
        const member = await fetchHasBffMemberSession();
        const raw = member
          ? await fetchHandoverPricingQuoteFromRentApi(locId, returnLocId)
          : await fetchHandoverPricingQuoteAsRentGuest(locId, returnLocId);
        const ru = raw as Record<string, unknown>;
        const q: HandoverQuote = {
          pickupLegEur: num(ru.pickupLegEur),
          returnLegEur: num(ru.returnLegEur),
          routeEur: num(ru.routeEur),
          totalEur: num(ru.totalEur),
          applied: Boolean(ru.applied),
        };
        if (!cancelled) setHandoverQuote(q);
      } catch {
        if (!cancelled) setHandoverQuote(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fromApiVehicle, reserveAuthPhase, differentDropoff, locId, returnLocId]);

  const handoverSurchargeLines = useMemo(() => {
    if (!fromApiVehicle || !differentDropoff || !handoverQuote) return [];
    const lines: { key: string; label: string; amountTry: number }[] = [];
    if (handoverQuote.pickupLegEur > 0) {
      const amountTry = eurToTry(handoverQuote.pickupLegEur);
      if (amountTry > 0) lines.push({ key: "ho-pu", label: "Alış noktası ek ücreti", amountTry });
    }
    if (handoverQuote.returnLegEur > 0) {
      const amountTry = eurToTry(handoverQuote.returnLegEur);
      if (amountTry > 0) lines.push({ key: "ho-re", label: "Teslim noktası ek ücreti", amountTry });
    }
    if (handoverQuote.routeEur > 0) {
      const amountTry = eurToTry(handoverQuote.routeEur);
      if (amountTry > 0) lines.push({ key: "ho-rt", label: "Güzergâh (ülke / bölge geçişi)", amountTry });
    }
    return lines;
  }, [fromApiVehicle, differentDropoff, handoverQuote]);

  const differentDropoffSurchargeTry = useMemo(() => {
    if (!differentDropoff) return 0;
    if (fromApiVehicle) {
      if (!handoverQuote) return 0;
      return eurToTry(handoverQuote.totalEur);
    }
    return crossBorderFee > 0 ? crossBorderFee : DIFFERENT_DROPOFF_DEMO_SURCHARGE_TRY;
  }, [differentDropoff, fromApiVehicle, handoverQuote, crossBorderFee]);

  const pickupSummaryLabel = pickupLocation?.label?.trim() || locId;
  const returnSummaryLabel = returnLocation?.label?.trim() || returnLocId;

  const differentDropoffDetailLines = useMemo((): ExtraFeeLineItem[] => {
    if (!differentDropoff) return [];
    const loc = returnSummaryLabel.trim();
    if (!loc) return [];
    if (fromApiVehicle) {
      if (!handoverQuote) return [];
      const out: ExtraFeeLineItem[] = [
        { key: "dd-ret", label: loc, amountTry: eurToTry(handoverQuote.returnLegEur) },
      ];
      if (handoverQuote.pickupLegEur > 0) {
        out.push({
          key: "dd-pu",
          label: "Alış noktası ek ücreti",
          amountTry: eurToTry(handoverQuote.pickupLegEur),
        });
      }
      if (handoverQuote.routeEur > 0) {
        out.push({
          key: "dd-rt",
          label: "Güzergâh (ülke / bölge geçişi)",
          amountTry: eurToTry(handoverQuote.routeEur),
        });
      }
      return out;
    }
    if (differentDropoffSurchargeTry > 0) {
      return [{ key: "dd-demo", label: loc, amountTry: differentDropoffSurchargeTry }];
    }
    return [];
  }, [differentDropoff, returnSummaryLabel, fromApiVehicle, handoverQuote, differentDropoffSurchargeTry]);

  const [step, setStep] = useState(1);
  /** Ulaşılan en ileri adım; geri gidildikten sonra üst sekmeden tekrar seçilebilmesi için. */
  const [maxStepReached, setMaxStepReached] = useState(1);
  const [reservationExtraTemplates, setReservationExtraTemplates] = useState<ReservationExtraOptionTemplateDto[] | null>(
    null,
  );
  const [reservationExtraLoadError, setReservationExtraLoadError] = useState<string | null>(null);
  const [selectedReservationExtraIds, setSelectedReservationExtraIds] = useState<Set<string>>(() => new Set());
  const [selectedVehicleOptionIds, setSelectedVehicleOptionIds] = useState<Set<string>>(() => new Set());
  const toggleVehicleOption = useCallback((id: string) => {
    setSelectedVehicleOptionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const toggleReservationExtra = useCallback((id: string) => {
    setSelectedReservationExtraIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const [coDriverFullName, setCoDriverFullName] = useState("");
  const [coDriverPhone, setCoDriverPhone] = useState("");
  const [coDriverBirthDate, setCoDriverBirthDate] = useState("");
  const [coDriverLicenseNo, setCoDriverLicenseNo] = useState("");
  const [coDriverPassportNo, setCoDriverPassportNo] = useState("");
  const [coDriverLicenseScan, setCoDriverLicenseScan] = useState<File | null>(null);
  const [coDriverPassportScan, setCoDriverPassportScan] = useState<File | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [licenseNo, setLicenseNo] = useState("");
  const [passportNo, setPassportNo] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [licenseScan, setLicenseScan] = useState<File | null>(null);
  const [passportScan, setPassportScan] = useState<File | null>(null);
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [doneRef, setDoneRef] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [calendarRevealed, setCalendarRevealed] = useState(() => {
    const a = parseIsoDate(pickup);
    const b = parseIsoDate(ret);
    if (!a || !b || b <= a) return false;
    return rentalNights(a, b) >= 1;
  });

  const handleReservationDifferentDropoff = (next: boolean) => {
    setCalendarRevealed(true);
    if (!next) {
      patchQuery((q) => {
        q.set("lokasyonTeslim", locId);
      });
      return;
    }
    if (locId === returnLocId) {
      const alt = returnLocationSelectOptions.find((o) => o.value !== locId)?.value;
      if (alt) {
        patchQuery((q) => {
          q.set("lokasyonTeslim", alt);
        });
      }
    }
  };

  const isLgUp = useIsLgUp();
  const mobileSummaryMode = !isLgUp;
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);
  const mobileStripRef = useRef<HTMLDivElement>(null);
  const [mobileStripHeight, setMobileStripHeight] = useState(96);
  /** Footer görününce şeridin `bottom` değeri (px); 0 = ekran altına yapışık. */
  const [mobileStripDockBottomPx, setMobileStripDockBottomPx] = useState(0);
  const prevWizardStepRef = useRef(step);

  useEffect(() => {
    if (!mobileSummaryMode) return;
    const prev = prevWizardStepRef.current;
    prevWizardStepRef.current = step;
    if (step === 4) {
      setMobileSummaryOpen(true);
      return;
    }
    if (prev === 4 && step !== 4) setMobileSummaryOpen(false);
  }, [mobileSummaryMode, step]);

  useEffect(() => {
    if (!mobileSummaryMode || !mobileSummaryOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileSummaryMode, mobileSummaryOpen]);

  useEffect(() => {
    if (mobileSummaryMode && step === 4 && errors.terms) setMobileSummaryOpen(true);
  }, [mobileSummaryMode, step, errors.terms]);

  useEffect(() => {
    if (!mobileSummaryMode) {
      setMobileStripDockBottomPx(0);
      return;
    }
    let raf = 0;
    const updateDock = () => {
      const footer = document.getElementById("iletisim");
      if (!footer) {
        setMobileStripDockBottomPx(0);
        return;
      }
      const rect = footer.getBoundingClientRect();
      const vh = window.visualViewport?.height ?? window.innerHeight;
      const px = Math.max(0, Math.round(vh - rect.top));
      setMobileStripDockBottomPx(px);
    };
    const onScrollOrResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updateDock);
    };
    updateDock();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", onScrollOrResize);
    vv?.addEventListener("scroll", onScrollOrResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
      vv?.removeEventListener("resize", onScrollOrResize);
      vv?.removeEventListener("scroll", onScrollOrResize);
    };
  }, [mobileSummaryMode]);

  useEffect(() => {
    if (!mobileSummaryMode) return;
    const el = mobileStripRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setMobileStripHeight(el.offsetHeight);
    });
    ro.observe(el);
    setMobileStripHeight(el.offsetHeight);
    return () => ro.disconnect();
  }, [mobileSummaryMode]);

  useEffect(() => {
    if (nights != null) setCalendarRevealed(true);
  }, [nights]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const has = await fetchHasBffMemberSession();
      if (cancelled || !has) return;
      const profile = getStoredAuthUser();
      if (!profile) return;
      if (profile.email && !email) setEmail(profile.email);
      if (profile.phone && !phone) setPhone(profile.phone);
      if (profile.fullName && !fullName) setFullName(profile.fullName);
    })();
    return () => {
      cancelled = true;
    };
  }, [email, fullName, phone]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const member = await fetchHasBffMemberSession();
        const rows = member
          ? await fetchReservationExtraOptionsFromRentApi()
          : await fetchReservationExtraOptionsAsRentGuest();
        if (cancelled) return;
        setReservationExtraTemplates(Array.isArray(rows) ? rows : []);
        setReservationExtraLoadError(null);
      } catch (e) {
        if (cancelled) return;
        setReservationExtraTemplates([]);
        setReservationExtraLoadError(e instanceof Error ? e.message : "Ek hizmet listesi yüklenemedi.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (step >= 1 && step <= 4) {
      setMaxStepReached((m) => Math.max(m, step));
    }
  }, [step]);

  const vehicleBaseSubtotalTry =
    nights != null ? computeRentalSubtotal(vehicle.pricePerDay, nights) + abroadUsageFee : 0;

  const rentalSub = vehicleBaseSubtotalTry + differentDropoffSurchargeTry;

  const apiOptionsFeeTry = useMemo(() => {
    const defs = vehicle.rentOptionDefinitions;
    if (!defs?.length) return 0;
    let s = 0;
    for (const id of selectedVehicleOptionIds) {
      const d = defs.find((x) => x.id === id && x.active !== false);
      if (d) s += d.price;
    }
    return s;
  }, [vehicle.rentOptionDefinitions, selectedVehicleOptionIds]);

  const reservationCatalogFeeTry = useMemo(() => {
    const rows = reservationExtraTemplates;
    if (!rows?.length) return 0;
    let s = 0;
    for (const id of selectedReservationExtraIds) {
      const t = rows.find((x) => x.id === id);
      if (t) s += Number(t.price) || 0;
    }
    return s;
  }, [reservationExtraTemplates, selectedReservationExtraIds]);

  const needsCoDriverForm = useMemo(() => {
    const rows = reservationExtraTemplates;
    if (!rows?.length) return false;
    for (const id of selectedReservationExtraIds) {
      const t = rows.find((x) => x.id === id);
      if (t?.requiresCoDriverDetails) return true;
    }
    return false;
  }, [reservationExtraTemplates, selectedReservationExtraIds]);

  const extraFeeTry = reservationCatalogFeeTry + apiOptionsFeeTry;
  const total = rentalSub + extraFeeTry;

  const extraFeeLineItems = useMemo((): ExtraFeeLineItem[] => {
    const lines: ExtraFeeLineItem[] = [];
    const rows = reservationExtraTemplates;
    if (rows?.length) {
      for (const optId of selectedReservationExtraIds) {
        const t = rows.find((x) => x.id === optId);
        if (t) {
          lines.push({
            key: `res-extra-${optId}`,
            label: t.title,
            amountTry: Number(t.price) || 0,
          });
        }
      }
    }
    const defs = vehicle.rentOptionDefinitions;
    if (defs?.length) {
      for (const optId of selectedVehicleOptionIds) {
        const d = defs.find((x) => x.id === optId && x.active !== false);
        if (d) {
          lines.push({
            key: `veh-opt-${optId}`,
            label: d.title,
            amountTry: d.price,
          });
        }
      }
    }
    return lines;
  }, [reservationExtraTemplates, selectedReservationExtraIds, selectedVehicleOptionIds, vehicle.rentOptionDefinitions]);

  const apiVehicleOptionsSummary = useMemo(() => {
    const defs = vehicle.rentOptionDefinitions;
    if (!defs?.length || selectedVehicleOptionIds.size === 0) return null;
    return [...selectedVehicleOptionIds]
      .map((id) => defs.find((d) => d.id === id)?.title)
      .filter(Boolean)
      .join(" · ");
  }, [vehicle.rentOptionDefinitions, selectedVehicleOptionIds]);

  const reservationExtrasSummary = useMemo(() => {
    const rows = reservationExtraTemplates;
    if (!rows?.length || selectedReservationExtraIds.size === 0) return null;
    return [...selectedReservationExtraIds]
      .map((id) => rows.find((r) => r.id === id)?.title)
      .filter(Boolean)
      .join(" · ");
  }, [reservationExtraTemplates, selectedReservationExtraIds]);

  const combinedExtrasSummaryParts = [reservationExtrasSummary, apiVehicleOptionsSummary].filter(Boolean);
  const combinedExtrasSummary =
    combinedExtrasSummaryParts.length > 0 ? combinedExtrasSummaryParts.join(" · ") : null;

  const validateStep2Contact = () => {
    const e: Record<string, string> = {};
    if (fullName.trim().length < 4) e.fullName = "Ad soyad en az 4 karakter olmalıdır.";
    if (!isEmail(email)) e.email = "Geçerli bir e-posta girin.";
    if (!isPhoneTr(phone)) e.phone = "Geçerli bir Türkiye cep telefonu girin.";
    if (licenseNo.trim().length < 6) e.licenseNo = "Ehliyet numarası / seri bilgisi girin.";
    if (!birthDate) e.birthDate = "Doğum tarihi zorunludur.";
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

  const validateStep3Extras = () => {
    const e: Record<string, string> = {};
    if (needsCoDriverForm) {
      if (coDriverFullName.trim().length < 4) e.coDriverFullName = "Ek şöför adı soyadı en az 4 karakter olmalıdır.";
      if (!isPhoneTr(coDriverPhone)) e.coDriverPhone = "Ek şöför için geçerli bir cep telefonu girin.";
      if (!coDriverBirthDate) e.coDriverBirthDate = "Ek şöför doğum tarihi zorunludur.";
      if (coDriverLicenseNo.trim().length < 6) {
        e.coDriverLicenseNo = "Ek şöför ehliyet numarası / seri bilgisi girin.";
      }
      if (coDriverPassportNo.trim().length < 6) {
        e.coDriverPassportNo = "Ek şöför pasaport numarası girin.";
      }
      if (!coDriverLicenseScan) {
        e.coDriverLicenseScan = "Ek şöför ehliyet görseli yükleyin (net, okunaklı fotoğraf).";
      } else if (!isLikelyImageFile(coDriverLicenseScan)) {
        e.coDriverLicenseScan = "Geçerli bir görsel seçin (JPEG, PNG, WebP; en fazla 8 MB).";
      }
      if (!coDriverPassportScan) {
        e.coDriverPassportScan = "Ek şöför pasaport görseli yükleyin (kimlik sayfası veya pasaport).";
      } else if (!isLikelyImageFile(coDriverPassportScan)) {
        e.coDriverPassportScan = "Geçerli bir görsel seçin (JPEG, PNG, WebP; en fazla 8 MB).";
      }
    }
    setErrors((prev) => {
      const next = { ...prev };
      delete next.coDriverFullName;
      delete next.coDriverPhone;
      delete next.coDriverBirthDate;
      delete next.coDriverLicenseNo;
      delete next.coDriverPassportNo;
      delete next.coDriverLicenseScan;
      delete next.coDriverPassportScan;
      return { ...next, ...e };
    });
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
    if (
      !HERO_HALF_HOUR_SLOTS.includes((sp.get("alis_saat") ?? "").trim()) ||
      !HERO_HALF_HOUR_SLOTS.includes((sp.get("teslim_saat") ?? "").trim())
    ) {
      setErrors({
        dates: "Alış ve teslim saatlerini takvim üzerindeki listelerden seçin.",
      });
      return false;
    }
    if (fromApiVehicle) {
      if (!locId.trim() || !uuidLikeRe.test(locId)) {
        setErrors({
          dates:
            "Bu araç için alış noktası (ofis) tanımlı değil veya liste yüklenemedi. Sayfayı yenileyin; sorun sürerse araç kaydında varsayılan alış noktası ekleyin.",
        });
        return false;
      }
      if (!returnLocId.trim() || !uuidLikeRe.test(returnLocId)) {
        setErrors({
          dates:
            "Teslim noktası tanımlı değil veya liste yüklenemedi. Sayfayı yenileyin veya farklı teslim seçeneklerini kontrol edin.",
        });
        return false;
      }
    }
    if (bookingCalendarBlockedLoading && uuidLikeRe.test(vehicle.id)) {
      setErrors({
        dates: "Dolu günler yükleniyor; lütfen birkaç saniye sonra tekrar deneyin.",
      });
      return false;
    }
    const overlap = blockedDaysInInclusiveRange(pickup, ret, bookingCalendarBlocked);
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

  const buildExtraNoteBlock = () => {
    const lines: string[] = [];
    const rows = reservationExtraTemplates;
    if (rows?.length) {
      for (const id of selectedReservationExtraIds) {
        const t = rows.find((x) => x.id === id);
        if (t) {
          lines.push(`Ek hizmet: ${t.title} — ${Number(t.price) || 0} (şablon: ${t.code})`);
        }
      }
    }
    if (needsCoDriverForm) {
      lines.push(
        [
          "Ek şöför bilgileri:",
          coDriverFullName.trim(),
          coDriverPhone.trim(),
          `Doğum: ${coDriverBirthDate}`,
          `Ehliyet no: ${coDriverLicenseNo.trim()}`,
          `Pasaport no: ${coDriverPassportNo.trim()}`,
          "Ehliyet ve pasaport görselleri talep kaydına eklendi.",
        ].join(" · "),
      );
    }
    const defs = vehicle.rentOptionDefinitions;
    if (defs?.length) {
      for (const id of selectedVehicleOptionIds) {
        const d = defs.find((x) => x.id === id);
        if (d) lines.push(`Araç seçeneği: ${d.title} — ${d.price}`);
      }
    }
    return lines.length ? lines.join("\n") : "";
  };

  const goNext = async () => {
    if (step === 1 && !validateDateRange()) return;
    if (step === 2 && !validateStep2Contact()) return;
    if (step === 3 && !validateStep3Extras()) return;
    if (step === 4) {
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

        let additionalDrivers: CreateRentalRequestFormPayload["additionalDrivers"];
        if (needsCoDriverForm && coDriverLicenseScan && coDriverPassportScan) {
          const [coDriverLicenseImageDataUrl, coDriverPassportImageDataUrl] = await Promise.all([
            fileToDataUrl(coDriverLicenseScan),
            fileToDataUrl(coDriverPassportScan),
          ]);
          additionalDrivers = [
            {
              fullName: coDriverFullName.trim(),
              birthDate: coDriverBirthDate,
              driverLicenseNo: coDriverLicenseNo.trim(),
              passportNo: coDriverPassportNo.trim(),
              driverLicenseImageDataUrl: coDriverLicenseImageDataUrl,
              passportImageDataUrl: coDriverPassportImageDataUrl,
            },
          ];
        }

        const vehicleOpts =
          selectedVehicleOptionIds.size > 0
            ? [...selectedVehicleOptionIds].map((id) => ({ vehicleOptionDefinitionId: id }))
            : [];
        const reservationOpts =
          selectedReservationExtraIds.size > 0
            ? [...selectedReservationExtraIds].map((id) => ({ reservationExtraTemplateId: id }))
            : [];
        const mergedOpts = [...vehicleOpts, ...reservationOpts];
        const apiOpts = mergedOpts.length > 0 ? mergedOpts : undefined;

        const member = await fetchHasBffMemberSession();

        const sa = (sp.get("alis_saat") ?? "").trim();
        const st = (sp.get("teslim_saat") ?? "").trim();
        const timeNote =
          HERO_HALF_HOUR_SLOTS.includes(sa) && HERO_HALF_HOUR_SLOTS.includes(st)
            ? `Alış saati: ${sa} · Teslim saati: ${st}`
            : "";
        const baseNote = buildExtraNoteBlock().trim();
        const combinedNote = [timeNote, baseNote].filter(Boolean).join("\n");

        const payload: CreateRentalRequestFormPayload = {
          vehicleId: uuidLikeRe.test(vehicle.id) ? vehicle.id : undefined,
          startDate: pickup,
          endDate: ret,
          pickupHandoverLocationId: uuidLikeRe.test(locId) ? locId : undefined,
          returnHandoverLocationId: uuidLikeRe.test(returnLocId) ? returnLocId : undefined,
          outsideCountryTravel: planVehicleAbroad,
          note: combinedNote || undefined,
          options: apiOpts,
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
          additionalDrivers,
        };

        const data = member
          ? await createRentalRequestOnRentApi(payload)
          : await createRentalRequestAsRentGuest(payload);
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
    if (step < 4) setStep((s) => s + 1);
  };

  const goBack = () => {
    if (step > 1 && step < 5) {
      setErrors({});
      setStep((s) => s - 1);
    }
  };

  if (reserveAuthPhase === "loading") {
    return (
      <div className="mx-auto max-w-4xl px-4 pb-8 pt-[var(--header-h)] sm:px-6">
        <p className="py-24 text-center text-sm text-text-muted">Oturum kontrol ediliyor…</p>
      </div>
    );
  }

  if (reserveAuthPhase === "gate") {
    const nextHref = `${pathname}${sp.toString() ? `?${sp.toString()}` : ""}`;
    return (
      <div className="mx-auto max-w-4xl px-4 pb-8 pt-[var(--header-h)] sm:px-6">
        <GuestReservationGate
          variant="fullscreen"
          nextLoginHref={nextHref}
          onAuthenticated={(guestEmail) => {
            setEmail(guestEmail);
            admittedViaGuestAckRef.current = true;
            setReserveAuthPhase("ready");
          }}
        />
      </div>
    );
  }

  if (step === 5 && doneRef) {
    return (
      <motion.div
        className="mx-auto max-w-lg px-5 py-24 text-center"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease }}
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-sm border border-accent/30 bg-accent/10 text-xl text-accent">
          ✓
        </div>
        <h1 className="mt-5 text-xl font-semibold text-text sm:text-2xl">Talebiniz alındı</h1>
        <p className="mt-3 text-sm text-text-muted">
          Referans numaranız: <span className="font-mono text-base font-semibold text-accent sm:text-lg">{doneRef}</span>
        </p>
        <p className="mt-3 text-sm text-text-muted">
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
    <div className="mx-auto max-w-4xl px-4 pb-8 pt-[var(--header-h)] sm:px-6 lg:pb-20">
      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        <div className="flex-1">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <RentIconBackLink
              href={`/arac/${vehicle.id}${sp.toString() ? `?${sp.toString()}` : ""}`}
              aria-label="Araca geri"
              className="shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h1 className="m-0 text-2xl font-semibold leading-tight text-text sm:text-3xl">
                Rezervasyon
              </h1>
            </div>
          </div>

          <ol className="mt-8 flex flex-wrap gap-2">
            {steps.map((s, i) => {
              const reachable = s.id <= maxStepReached;
              const isCurrent = step === s.id;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    disabled={!reachable}
                    onClick={() => {
                      if (reachable && s.id !== step) setStep(s.id);
                    }}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      isCurrent
                        ? "bg-accent text-accent-fg"
                        : reachable
                          ? "border border-accent/40 text-accent hover:bg-accent/10"
                          : "cursor-not-allowed border border-border-subtle text-text-muted opacity-60"
                    }`}
                  >
                    {i + 1}. {s.short}
                  </button>
                </li>
              );
            })}
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
                      Alış noktası arama veya araç sayfasından geldiği için burada değiştirilemez. İsterseniz aracı
                      farklı bir yere bırakmayı işaretleyip teslim noktasını seçin; ardından takvimden müsait günleri
                      işaretleyin. Tarihler adres çubuğundaki bağlantıya yazılır.
                    </p>
                  </div>

                  <div className="space-y-4 rounded-xl border border-border-subtle bg-bg-card/60 p-4 sm:p-5">
                    <h3 className="text-sm font-semibold text-text">Alış / teslim noktası</h3>
                    <label className="block text-[11px] font-medium text-text-muted">
                      Alış yeri (sabit)
                      <RentSelect
                        value={locId}
                        onChange={() => {}}
                        disabled
                        options={pickupLocationSelectOptions}
                        ariaLabel="Alış yeri (değiştirilemez)"
                        className="mt-1.5"
                        leadingIcon={<LocationPinIcon className="size-3.5" />}
                        optionLeadingIcon={<LocationPinIcon className="size-3.5" />}
                      />
                    </label>
                    <DifferentDropoffToggle
                      checked={differentDropoff}
                      onChange={handleReservationDifferentDropoff}
                      disabled={!canChooseDifferentReturn}
                      className="mt-1"
                      parenthetical={canChooseDifferentReturn && !fromApiVehicle ? "örn. 35$" : undefined}
                    />
                    {fromApiVehicle && canChooseDifferentReturn && apiReturnOptions.length > 0 && !differentDropoff ? (
                      <p className="mt-2 text-[11px] leading-relaxed text-text-muted">
                        {apiReturnOptions.length} teslim ofisi sunucudan yüklendi. Listeyi görmek için «Aracı farklı bir
                        yere bırakacağım» seçeneğini açın; açık değilse teslim, alış ile aynı kalır.
                      </p>
                    ) : null}
                    {!canChooseDifferentReturn ? (
                      <p className="text-[11px] leading-relaxed text-text-muted">
                        Bu araç için yalnızca tek teslim noktası tanımlı; teslim yeri alış ile aynı kalır.
                      </p>
                    ) : null}
                    {differentDropoff ? (
                      <label className="block text-[11px] font-medium text-text-muted">
                        Teslim yeri
                        <RentSelect
                          value={returnLocId}
                          onChange={(v) => {
                            setCalendarRevealed(true);
                            patchQuery((q) => {
                              q.set("lokasyonTeslim", v);
                            });
                          }}
                          options={returnLocationSelectOptions}
                          ariaLabel="Teslim yeri"
                          className="mt-1.5"
                          leadingIcon={<LocationPinIcon className="size-3.5" />}
                          optionLeadingIcon={<LocationPinIcon className="size-3.5" />}
                        />
                      </label>
                    ) : null}
                    {!fromApiVehicle && crossBorderFee > 0 && (
                      <p className="text-[11px] leading-relaxed text-amber-200/90">
                        Farklı ülke teslimi: tahmini araç bedeline{" "}
                        <span className="font-medium text-text">{formatPrice(crossBorderFee)}</span>{" "}
                        eklenir (demo).
                      </p>
                    )}
                    {!calendarRevealed && (
                      <div className="border-t border-border-subtle pt-4">
                        <button
                          type="button"
                          onClick={() => setCalendarRevealed(true)}
                          className="w-full rounded-lg border border-accent/40 bg-accent/10 px-4 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/15"
                        >
                          Takvimi göster
                        </button>
                        <p className="mt-2 text-[11px] leading-relaxed text-text-muted">
                          Farklı teslim noktasını değiştirdiğinizde takvim otomatik açılır.
                        </p>
                      </div>
                    )}
                  </div>

                  {errors.dates && (
                    <p className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-text">
                      {errors.dates}
                    </p>
                  )}

                  <AnimatePresence>
                    {calendarRevealed && (
                      <motion.div
                        key="step1-calendar"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.3, ease }}
                      >
                        <HeroRentalRangeDatePickers
                          layout="inline"
                          inlineMonthCount={1}
                          minDate={todayIso()}
                          maxDate={bookingCalendarMaxIso}
                          pickupDate={pickupForCalendar}
                          returnDate={returnForCalendar}
                          blockedDates={bookingCalendarBlocked}
                          blockedDatesLoading={bookingCalendarBlockedLoading}
                          onValidateRange={(p, r) =>
                            compareIso(r, p) <= 0
                              ? "Teslim günü alıştan en az 1 gün sonra olmalı."
                              : null
                          }
                          onRangeCommit={(p, r) => {
                            patchQuery((q) => {
                              q.set("alis", p);
                              q.set("teslim", r);
                              if (!q.get("lokasyon")) {
                                const fb =
                                  (fromApiVehicle && apiPickupOptions[0]?.value) ||
                                  pickupLocations[0]!.id;
                                q.set("lokasyon", fb);
                              }
                              if (!q.get("lokasyonTeslim")) q.set("lokasyonTeslim", q.get("lokasyon")!);
                            });
                          }}
                          pickTime={alisSaat}
                          returnTime={teslimSaat}
                          onPickTime={(t) => {
                            patchQuery((q) => q.set("alis_saat", t));
                          }}
                          onReturnTime={(t) => {
                            patchQuery((q) => q.set("teslim_saat", t));
                          }}
                          inlineTitle="Takvim"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
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
                  errors={errors}
                />
              )}
              {step === 3 && (
                <StepExtras
                  rentVehicleOptions={vehicle.rentOptionDefinitions?.filter((d) => d.active !== false)}
                  selectedVehicleOptionIds={selectedVehicleOptionIds}
                  toggleVehicleOption={toggleVehicleOption}
                  formatVehicleOptionTry={(amount) => formatPrice(amount)}
                  reservationExtraTemplates={reservationExtraTemplates}
                  reservationExtraLoadError={reservationExtraLoadError}
                  selectedReservationExtraIds={selectedReservationExtraIds}
                  toggleReservationExtra={toggleReservationExtra}
                  formatReservationExtraTry={(amountTry) => formatPrice(amountTry)}
                  coDriverFullName={coDriverFullName}
                  setCoDriverFullName={setCoDriverFullName}
                  coDriverPhone={coDriverPhone}
                  setCoDriverPhone={setCoDriverPhone}
                  coDriverBirthDate={coDriverBirthDate}
                  setCoDriverBirthDate={setCoDriverBirthDate}
                  coDriverLicenseNo={coDriverLicenseNo}
                  setCoDriverLicenseNo={setCoDriverLicenseNo}
                  coDriverPassportNo={coDriverPassportNo}
                  setCoDriverPassportNo={setCoDriverPassportNo}
                  coDriverLicenseScan={coDriverLicenseScan}
                  setCoDriverLicenseScan={setCoDriverLicenseScan}
                  coDriverPassportScan={coDriverPassportScan}
                  setCoDriverPassportScan={setCoDriverPassportScan}
                  errors={errors}
                />
              )}
              {step === 4 && (
                <StepConfirm
                  vehicle={vehicle}
                  nights={nights}
                  pickup={pickup}
                  ret={ret}
                  pickupLocationLabel={pickupLocation?.label}
                  returnLocationLabel={returnLocation?.label}
                  differentDropoff={differentDropoff}
                  crossBorderFee={crossBorderFee}
                  abroadUsageFee={abroadUsageFee}
                  vehicleBaseSubtotalTry={vehicleBaseSubtotalTry}
                  differentDropoffSurchargeTry={differentDropoffSurchargeTry}
                  differentDropoffDetailLines={differentDropoffDetailLines}
                  handoverSurchargeLines={handoverSurchargeLines}
                  extraFeeTry={extraFeeTry}
                  extraFeeLineItems={extraFeeLineItems}
                  extraSummary={combinedExtrasSummary}
                  total={total}
                  fullName={fullName}
                  email={email}
                  phone={phone}
                  licenseScanName={licenseScan?.name}
                  passportScanName={passportScan?.name}
                  coDriverFullName={needsCoDriverForm ? coDriverFullName : undefined}
                  coDriverLicenseScanName={needsCoDriverForm ? coDriverLicenseScan?.name : undefined}
                  coDriverPassportScanName={needsCoDriverForm ? coDriverPassportScan?.name : undefined}
                  formatPrice={formatPrice}
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
                  omitPricingAndTerms={mobileSummaryMode && step === 4}
                />
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-10 flex w-full min-w-0 flex-wrap items-center gap-3">
            {step > 1 && <RentIconBackButton onClick={goBack} aria-label="Geri" />}
            {!(mobileSummaryMode && step === 4) && (
              <motion.button
                type="button"
                onClick={() => void goNext()}
                className="ml-auto rounded-md bg-accent px-6 py-2.5 text-[13px] font-semibold text-accent-fg shadow-sm"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {step === 4 ? (submitting ? "Gönderiliyor..." : "Rezervasyonu gönder") : "Devam et"}
              </motion.button>
            )}
          </div>
        </div>

        <aside className="hidden lg:block lg:w-80">
          <motion.div
            className="lg:sticky lg:top-20"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <BookingRentalSummaryCard
              vehicle={vehicle}
              nights={nights}
              pickup={pickup}
              ret={ret}
              formatPrice={formatPrice}
              vehicleBaseSubtotalTry={vehicleBaseSubtotalTry}
              differentDropoffSurchargeTry={differentDropoffSurchargeTry}
              differentDropoffDetailLines={differentDropoffDetailLines}
              extraFeeTry={extraFeeTry}
              extraFeeLineItems={extraFeeLineItems}
              total={total}
              differentDropoff={differentDropoff}
              pickupLocationLabel={pickupSummaryLabel}
              returnLocationLabel={returnSummaryLabel}
              pickupTime={alisSaat}
              returnTime={teslimSaat}
            />
          </motion.div>
        </aside>
      </div>

      {mobileSummaryMode && (
        <>
          <div
            className="shrink-0 lg:hidden"
            style={{ height: mobileStripHeight }}
            aria-hidden
          />
          <div
            ref={mobileStripRef}
            className={`fixed left-0 right-0 z-[45] border-t border-accent/35 bg-bg-deep/96 pt-1 shadow-[0_-10px_40px_rgba(0,0,0,0.28)] backdrop-blur-md lg:hidden ${
              mobileStripDockBottomPx > 0 ? "pb-2" : "pb-[max(0.5rem,env(safe-area-inset-bottom))]"
            }`}
            style={{ bottom: mobileStripDockBottomPx }}
          >
            <button
              type="button"
              onClick={() => setMobileSummaryOpen(true)}
              className="mx-auto flex w-full max-w-4xl flex-col items-stretch gap-1 px-4 text-left outline-none ring-accent/40 focus-visible:ring-2 sm:px-6"
            >
              <span className="flex justify-center py-1" aria-hidden>
                <span className="flex size-10 items-center justify-center rounded-full border-2 border-accent/55 bg-accent/12 text-accent shadow-[0_0_0_3px_rgba(201,169,98,0.12)]">
                  <svg
                    className="size-[18px] translate-y-px"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M7 14.5 12 9.5l5 5" />
                  </svg>
                </span>
              </span>
              <span className="flex items-center justify-between gap-3 pb-2.5 pt-0.5">
                <span className="text-sm font-semibold leading-snug text-text">
                  Kiralama özetini görmek için tıklayınız
                </span>
                <span className="shrink-0 text-xs font-bold tabular-nums text-accent">
                  {formatPrice(total)}
                </span>
              </span>
            </button>
          </div>
          <AnimatePresence>
            {mobileSummaryOpen && (
              <>
                <motion.button
                  key="ms-backdrop"
                  type="button"
                  aria-label="Özeti kapat"
                  className="fixed inset-0 z-[55] bg-black/55 lg:hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  onClick={() => setMobileSummaryOpen(false)}
                />
                <motion.div
                  key="ms-sheet"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="mobile-rental-summary-title"
                  className="fixed bottom-0 left-0 right-0 z-[60] flex max-h-[90vh] flex-col overflow-hidden rounded-t-2xl border border-border-subtle border-b-0 bg-bg-raised shadow-[0_-12px_48px_rgba(0,0,0,0.35)] lg:hidden"
                  initial={{ y: "108%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "108%" }}
                  transition={{ duration: 0.36, ease }}
                >
                  <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border-subtle/80 bg-bg-card/95 px-3 pt-2 pb-2">
                    <div className="flex min-w-0 flex-1 flex-col items-center">
                      <div className="h-1 w-10 shrink-0 rounded-full bg-text-muted/35" aria-hidden />
                      <p id="mobile-rental-summary-title" className="mt-2 truncate text-sm font-semibold text-text">
                        Kiralama özeti
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMobileSummaryOpen(false)}
                      className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-text-muted hover:bg-bg-card hover:text-text"
                    >
                      Kapat
                    </button>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
                    <BookingRentalSummaryCard
                      vehicle={vehicle}
                      nights={nights}
                      pickup={pickup}
                      ret={ret}
                      formatPrice={formatPrice}
                      vehicleBaseSubtotalTry={vehicleBaseSubtotalTry}
                      differentDropoffSurchargeTry={differentDropoffSurchargeTry}
                      differentDropoffDetailLines={differentDropoffDetailLines}
                      extraFeeTry={extraFeeTry}
                      extraFeeLineItems={extraFeeLineItems}
                      total={total}
                      differentDropoff={differentDropoff}
                      pickupLocationLabel={pickupSummaryLabel}
                      returnLocationLabel={returnSummaryLabel}
                      pickupTime={alisSaat}
                      returnTime={teslimSaat}
                    />
                    {step === 4 && (
                      <div className="mt-4 space-y-4 border-t border-border-subtle pt-4">
                        <label className="flex cursor-pointer gap-3 text-sm text-text-muted">
                          <input
                            type="checkbox"
                            checked={terms}
                            onChange={(e) => {
                              setTerms(e.target.checked);
                              if (e.target.checked) {
                                setErrors((ePrev) => {
                                  const next = { ...ePrev };
                                  delete next.terms;
                                  return next;
                                });
                              }
                            }}
                            className="mt-1 size-4 accent-accent"
                          />
                          <span>
                            <span className="text-text">Kiralama şartları</span>, sigorta kapsamı ve iptal politikasını
                            okudum, onaylıyorum.
                          </span>
                        </label>
                        {errors.terms && (
                          <p className="text-xs text-amber-300">{errors.terms}</p>
                        )}
                        <motion.button
                          type="button"
                          disabled={submitting}
                          onClick={() => void goNext()}
                          className="w-full rounded-md bg-accent px-6 py-3 text-[13px] font-semibold text-accent-fg shadow-sm disabled:opacity-60"
                          whileHover={{ scale: submitting ? 1 : 1.02 }}
                          whileTap={{ scale: submitting ? 1 : 0.98 }}
                        >
                          {submitting ? "Gönderiliyor..." : "Rezervasyonu gönder"}
                        </motion.button>
                      </div>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
      )}
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

function StepExtras({
  rentVehicleOptions,
  selectedVehicleOptionIds,
  toggleVehicleOption,
  formatVehicleOptionTry,
  reservationExtraTemplates,
  reservationExtraLoadError,
  selectedReservationExtraIds,
  toggleReservationExtra,
  formatReservationExtraTry,
  coDriverFullName,
  setCoDriverFullName,
  coDriverPhone,
  setCoDriverPhone,
  coDriverBirthDate,
  setCoDriverBirthDate,
  coDriverLicenseNo,
  setCoDriverLicenseNo,
  coDriverPassportNo,
  setCoDriverPassportNo,
  coDriverLicenseScan,
  setCoDriverLicenseScan,
  coDriverPassportScan,
  setCoDriverPassportScan,
  errors,
}: {
  rentVehicleOptions?: { id: string; title: string; description?: string; price: number }[];
  selectedVehicleOptionIds: ReadonlySet<string>;
  toggleVehicleOption: (id: string) => void;
  formatVehicleOptionTry: (amountTry: number) => string;
  reservationExtraTemplates: ReservationExtraOptionTemplateDto[] | null;
  reservationExtraLoadError: string | null;
  selectedReservationExtraIds: ReadonlySet<string>;
  toggleReservationExtra: (id: string) => void;
  formatReservationExtraTry: (amountTry: number) => string;
  coDriverFullName: string;
  setCoDriverFullName: (v: string) => void;
  coDriverPhone: string;
  setCoDriverPhone: (v: string) => void;
  coDriverBirthDate: string;
  setCoDriverBirthDate: (v: string) => void;
  coDriverLicenseNo: string;
  setCoDriverLicenseNo: (v: string) => void;
  coDriverPassportNo: string;
  setCoDriverPassportNo: (v: string) => void;
  coDriverLicenseScan: File | null;
  setCoDriverLicenseScan: (v: File | null) => void;
  coDriverPassportScan: File | null;
  setCoDriverPassportScan: (v: File | null) => void;
  errors: Record<string, string>;
}) {
  const input =
    "mt-1.5 w-full rounded-lg border border-border-subtle bg-bg-card px-3 py-2.5 text-[13px] text-text outline-none focus:border-accent/40";
  const hiddenFileInput = "sr-only";
  const coLicenseGalleryRef = useRef<HTMLInputElement>(null);
  const coLicenseCameraRef = useRef<HTMLInputElement>(null);
  const coPassportGalleryRef = useRef<HTMLInputElement>(null);
  const coPassportCameraRef = useRef<HTMLInputElement>(null);

  const coDriverForm = (
        <div
          role="region"
          aria-label="Ek şöför bilgileri"
          className="rounded-b-xl rounded-t-none border border-t-0 border-accent/25 bg-bg-card/60 px-4 pb-4 pt-3 sm:px-5 sm:pb-5"
        >
          <p className="text-[12px] text-text-muted">
            Kimlik doğrulama için aşağıdaki alanları doldurun; ana sürücüden farklı kişi olmalıdır.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Ad soyad" error={errors.coDriverFullName}>
              <input
                className={input}
                value={coDriverFullName}
                onChange={(e) => setCoDriverFullName(e.target.value)}
                autoComplete="name"
              />
            </Field>
            <Field label="Cep telefonu" error={errors.coDriverPhone}>
              <input
                type="tel"
                className={input}
                value={coDriverPhone}
                onChange={(e) => setCoDriverPhone(e.target.value)}
                placeholder="05xx xxx xx xx"
                autoComplete="tel"
              />
            </Field>
            <Field label="Doğum tarihi" error={errors.coDriverBirthDate}>
              <DayPickerPopover
                label="Doğum tarihi"
                value={coDriverBirthDate}
                minDate="1940-01-01"
                maxDate={todayIso()}
                onChange={setCoDriverBirthDate}
                pickMode="yearMonthDay"
                compact
                className="w-full"
              />
            </Field>
            <Field label="Ehliyet seri / no" error={errors.coDriverLicenseNo}>
              <input
                className={input}
                value={coDriverLicenseNo}
                onChange={(e) => setCoDriverLicenseNo(e.target.value)}
              />
            </Field>
            <Field label="Pasaport no" error={errors.coDriverPassportNo} className="sm:col-span-2">
              <input
                className={input}
                value={coDriverPassportNo}
                onChange={(e) => setCoDriverPassportNo(e.target.value)}
                autoComplete="off"
              />
            </Field>
          </div>

          <h4 className="mt-8 text-xs font-semibold uppercase tracking-wider text-accent">
            Ek şöför — ehliyet ve pasaport görseli
          </h4>
          <p className="mt-2 text-[12px] text-text-muted">
            Ana sürücüde olduğu gibi net fotoğraflar yükleyin (JPEG, PNG, WebP; en fazla 8 MB).
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Ehliyet görseli" error={errors.coDriverLicenseScan}>
              <input
                ref={coLicenseGalleryRef}
                type="file"
                accept="image/*"
                className={hiddenFileInput}
                onChange={(e) => setCoDriverLicenseScan(e.target.files?.[0] ?? null)}
              />
              <input
                ref={coLicenseCameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className={hiddenFileInput}
                onChange={(e) => setCoDriverLicenseScan(e.target.files?.[0] ?? null)}
              />
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => coLicenseCameraRef.current?.click()}
                  className="rounded-lg border border-accent/35 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent"
                >
                  Fotoğraf çek
                </button>
                <button
                  type="button"
                  onClick={() => coLicenseGalleryRef.current?.click()}
                  className="rounded-lg border border-border-subtle bg-bg-raised px-3 py-2 text-xs font-semibold text-text"
                >
                  Galeriden seç
                </button>
              </div>
              {coDriverLicenseScan && (
                <p className="mt-1 truncate text-xs text-text-muted" title={coDriverLicenseScan.name}>
                  Seçilen: {coDriverLicenseScan.name}
                </p>
              )}
            </Field>
            <Field label="Pasaport görseli" error={errors.coDriverPassportScan}>
              <input
                ref={coPassportGalleryRef}
                type="file"
                accept="image/*"
                className={hiddenFileInput}
                onChange={(e) => setCoDriverPassportScan(e.target.files?.[0] ?? null)}
              />
              <input
                ref={coPassportCameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className={hiddenFileInput}
                onChange={(e) => setCoDriverPassportScan(e.target.files?.[0] ?? null)}
              />
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => coPassportCameraRef.current?.click()}
                  className="rounded-lg border border-accent/35 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent"
                >
                  Fotoğraf çek
                </button>
                <button
                  type="button"
                  onClick={() => coPassportGalleryRef.current?.click()}
                  className="rounded-lg border border-border-subtle bg-bg-raised px-3 py-2 text-xs font-semibold text-text"
                >
                  Galeriden seç
                </button>
              </div>
              {coDriverPassportScan && (
                <p className="mt-1 truncate text-xs text-text-muted" title={coDriverPassportScan.name}>
                  Seçilen: {coDriverPassportScan.name}
                </p>
              )}
            </Field>
          </div>
        </div>
  );

  const catalogRows =
    reservationExtraTemplates == null
      ? null
      : [...reservationExtraTemplates].sort((a, b) => a.lineOrder - b.lineOrder || a.title.localeCompare(b.title));

  return (
    <div>
      <h2 className="text-xl font-semibold text-text">Ek hizmetler</h2>
      <p className="mt-2 text-sm text-text-muted">
        Genel ek hizmetler sunucu kataloğundan gelir; araca özel ücretli seçenekler ayrı bloktadır. Birden fazla
        seçebilirsiniz.
      </p>
      <div className="mt-8 space-y-3 rounded-xl border border-border-subtle bg-bg-raised/30 p-4 dark:bg-bg-deep/25">
        <h3 className="text-sm font-semibold text-text">Rezervasyon ek hizmetleri</h3>
        {reservationExtraTemplates == null ? (
          <p className="text-[13px] text-text-muted">Ek hizmet listesi yükleniyor…</p>
        ) : reservationExtraLoadError ? (
          <p className="text-[13px] text-amber-300">{reservationExtraLoadError}</p>
        ) : !catalogRows?.length ? (
          <p className="text-[13px] text-text-muted">Şu an listelenecek ek hizmet yok.</p>
        ) : (
          <div className="space-y-2">
            {catalogRows.map((t) => {
              const checked = selectedReservationExtraIds.has(t.id);
              const attachFormBelow = t.requiresCoDriverDetails && checked;
              const rowId = `res-extra-${t.id}`;
              return (
                <Fragment key={t.id}>
                  <label
                    htmlFor={rowId}
                    className={`flex w-full cursor-pointer items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors ${
                      checked
                        ? attachFormBelow
                          ? "rounded-b-none border-b-0 border-accent/40 bg-accent/10 ring-1 ring-accent/30"
                          : "border-accent/40 bg-accent/10 ring-1 ring-accent/30"
                        : "border-border-subtle bg-bg-card/40 hover:border-border-subtle hover:bg-bg-raised/40"
                    }`}
                  >
                    <input
                      id={rowId}
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleReservationExtra(t.id)}
                      className="mt-1 size-4 shrink-0 accent-accent"
                    />
                    <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-text">{t.title}</p>
                        {t.description ? (
                          <p className="mt-1 text-[12px] leading-relaxed text-text-muted">{t.description}</p>
                        ) : null}
                      </div>
                      <span className="shrink-0 rounded-md border border-border-subtle bg-bg-raised/60 px-2 py-1 text-xs font-semibold tabular-nums text-accent">
                        +{formatReservationExtraTry(Number(t.price) || 0)}
                      </span>
                    </div>
                  </label>
                  {attachFormBelow ? coDriverForm : null}
                </Fragment>
              );
            })}
          </div>
        )}
      </div>
      {rentVehicleOptions && rentVehicleOptions.length > 0 ? (
        <div className="mt-8 space-y-3 rounded-xl border border-accent/25 bg-accent/5 p-4">
          <h3 className="text-sm font-semibold text-text">Bu araca özel seçenekler</h3>
          <p className="text-[12px] text-text-muted">
            Sunucudaki araç tanımından gelir; tutarlar günlük kira ile aynı para birimindedir.
          </p>
          <div className="space-y-2">
            {rentVehicleOptions.map((opt) => {
              const checked = selectedVehicleOptionIds.has(opt.id);
              const rowId = `veh-opt-${opt.id}`;
              return (
                <label
                  key={opt.id}
                  htmlFor={rowId}
                  className={`flex w-full cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                    checked
                      ? "border-accent/40 bg-accent/10 ring-1 ring-accent/30"
                      : "border-border-subtle bg-bg-card/40 hover:border-border-subtle"
                  }`}
                >
                  <input
                    id={rowId}
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleVehicleOption(opt.id)}
                    className="mt-1 size-4 shrink-0 accent-accent"
                  />
                  <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-text">{opt.title}</p>
                      {opt.description ? (
                        <p className="mt-1 text-[12px] leading-relaxed text-text-muted">{opt.description}</p>
                      ) : null}
                    </div>
                    <span className="shrink-0 rounded-md border border-border-subtle bg-bg-raised/60 px-2 py-1 text-xs font-semibold tabular-nums text-accent">
                      +{formatVehicleOptionTry(opt.price)}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      ) : null}
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
      <h2 className="text-xl font-semibold text-text">Sürücü bilgileri</h2>
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
            pickMode="yearMonthDay"
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
  differentDropoff,
  crossBorderFee,
  abroadUsageFee,
  vehicleBaseSubtotalTry,
  differentDropoffSurchargeTry,
  differentDropoffDetailLines,
  handoverSurchargeLines,
  extraFeeTry,
  extraFeeLineItems,
  extraSummary,
  total,
  fullName,
  email,
  phone,
  licenseScanName,
  passportScanName,
  coDriverFullName,
  coDriverLicenseScanName,
  coDriverPassportScanName,
  formatPrice,
  terms,
  setTerms,
  termsError,
  omitPricingAndTerms,
}: {
  vehicle: FleetVehicle;
  nights: number | null;
  pickup: string;
  ret: string;
  pickupLocationLabel?: string;
  returnLocationLabel?: string;
  differentDropoff: boolean;
  crossBorderFee: number;
  abroadUsageFee: number;
  vehicleBaseSubtotalTry: number;
  differentDropoffSurchargeTry: number;
  differentDropoffDetailLines: ExtraFeeLineItem[];
  handoverSurchargeLines: { key: string; label: string; amountTry: number }[];
  extraFeeTry: number;
  extraFeeLineItems: ExtraFeeLineItem[];
  extraSummary: string | null;
  total: number;
  fullName: string;
  email: string;
  phone: string;
  licenseScanName?: string;
  passportScanName?: string;
  coDriverFullName?: string;
  coDriverLicenseScanName?: string;
  coDriverPassportScanName?: string;
  formatPrice: (amountTry: number) => string;
  terms: boolean;
  setTerms: (v: boolean) => void;
  termsError?: string;
  /** Mobilde özet çekmecesinde fiyat + şartlar gösterildiğinde ana sütunda tekrar etmesin. */
  omitPricingAndTerms?: boolean;
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-text">Son kontrol</h2>
      {omitPricingAndTerms && (
        <p className="mt-2 text-xs leading-relaxed text-text-muted">
          Toplam tutar ve kiralama şartlarını onaylamak için ekranın altındaki özeti açın; onay aşamasında panel
          otomatik açılır.
        </p>
      )}
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
        {coDriverFullName &&
          (coDriverLicenseScanName || coDriverPassportScanName) && (
            <p>
              <span className="text-text">Ek şöför:</span> {coDriverFullName}
              <span className="block mt-1 text-[11px]">
                {[coDriverLicenseScanName && `Ehliyet görseli: ${coDriverLicenseScanName}`, coDriverPassportScanName && `Pasaport görseli: ${coDriverPassportScanName}`]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
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
        {differentDropoff && returnLocationLabel && differentDropoffDetailLines.length === 0 && (
          <p>
            <span className="text-text">Teslim yeri:</span> {returnLocationLabel}
          </p>
        )}
        {crossBorderFee > 0 && handoverSurchargeLines.length === 0 && (
          <p className="text-[11px] text-amber-200/90">
            Ülkeler arası teslim ek ücreti: {formatPrice(crossBorderFee)}
          </p>
        )}
        {abroadUsageFee > 0 && (
          <p className="text-[11px] text-amber-200/90">
            Yurt dışı araç kullanımı ek ücreti: {formatPrice(abroadUsageFee)}
          </p>
        )}
        {extraSummary && (
          <p>
            <span className="text-text">Ek hizmetler:</span> {extraSummary}
          </p>
        )}
        {!omitPricingAndTerms && (
          <div className="border-t border-border-subtle pt-3">
            <Row label="Araç" value={formatPrice(vehicleBaseSubtotalTry)} />
            {differentDropoff && differentDropoffDetailLines.length > 0 ? (
              <DifferentDropoffPricingSection
                formatPrice={formatPrice}
                surchargeTry={differentDropoffSurchargeTry}
                lines={differentDropoffDetailLines}
              />
            ) : null}
            <ExtraFeesPricingSection formatPrice={formatPrice} extraFeeTry={extraFeeTry} lines={extraFeeLineItems} />
            <div className="mt-2 flex justify-between font-semibold text-text">
              <span>Toplam</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>
        )}
      </div>
      {!omitPricingAndTerms && (
        <>
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
        </>
      )}
    </div>
  );
}

