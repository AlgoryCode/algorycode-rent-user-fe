"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useI18n } from "@/components/i18n/LocaleProvider";
import type { FleetVehicle } from "@/data/fleet";
import { blockedDaysInInclusiveRange } from "@/data/availability";
import { useVehicleBlockedIsoDates } from "@/hooks/useVehicleBlockedIsoDates";
import { getLocationById } from "@/data/locations";
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
  fetchReservationExtraOptionsAsRentGuest,
  fetchReservationExtraOptionsFromRentApi,
  type CreateRentalRequestFormPayload,
  type ReservationExtraOptionTemplateDto,
} from "@/lib/rentApi";
import { buildRentalRequestPricingLines } from "@/lib/rentalRequestPricing";
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
import { fetchFleetVehicleById } from "@/lib/rentFleetClient";
import { parseSurchargeEur } from "@/lib/rentFleetCore";
import { isLikelyUuidString } from "@/lib/uuidLike";

const steps = [
  { id: 1, title: "Tarih seçimi", short: "Tarih" },
  { id: 2, title: "Bilgileriniz", short: "Bilgi" },
  { id: 3, title: "Ek hizmetler", short: "Ek" },
  { id: 4, title: "Onay", short: "Onay" },
];

/** Demo: farklı bırakış (örn. 35$) — alış/teslim ülkesi aynıyken uygulanan sabit TRY ek ücreti */
const DIFFERENT_DROPOFF_DEMO_SURCHARGE_TRY = 1250;

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function isPhoneTr(s: string) {
  const d = s.replace(/\D/g, "");
  return d.length >= 10 && d.length <= 13;
}

const maxUploadBytes = 8 * 1024 * 1024;

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

type ExtraFeeLineItem = {
  key: string;
  label: string;
  amountTry: number;
  /** Seçili teslim `surchargeEur`; doluysa sağ sütunda TRY yerine bu EUR gösterilir */
  displayEurSurcharge?: number;
};

/** Yalnızca seçili teslim satırı `surchargeEur` (başka alan / yedek yok) */
type DifferentDropoffPricingMeta = { eur: number };

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
  lines,
}: {
  formatPrice: (amountTry: number) => string;
  lines: ExtraFeeLineItem[];
}) {
  if (lines.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <p className="font-medium text-text">Farklı teslim noktası</p>
      <ul className="ml-1.5 space-y-0.5 border-l-2 border-border-subtle/60 pl-2.5 text-[12px] leading-snug text-text-muted">
        {lines.map((row) => (
          <li key={row.key} className="flex justify-between gap-2">
            <span className="min-w-0">
              <span className="text-text-muted/80" aria-hidden>
                -{" "}
              </span>
              {row.label}
            </span>
            <span className="shrink-0 tabular-nums text-text">
              {typeof row.displayEurSurcharge === "number" &&
              Number.isFinite(row.displayEurSurcharge) &&
              row.displayEurSurcharge > 0
                ? formatEurSurchargeAmount(row.displayEurSurcharge)
                : formatPrice(row.amountTry)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SummaryVehicleRentalPricingRows({
  formatPrice,
  nights,
  pricePerDay,
  abroadUsageFee,
}: {
  formatPrice: (amountTry: number) => string;
  nights: number | null;
  pricePerDay: number;
  abroadUsageFee: number;
}) {
  const rentalOnly = nights != null ? computeRentalSubtotal(pricePerDay, nights) : 0;
  return (
    <>
      <div className="text-text-muted">
        <p className="font-medium text-text">Günlük Kiralama Bedeli</p>
        {nights != null && nights > 0 ? (
          <ul className="ml-1.5 mt-1 space-y-0.5 border-l-2 border-border-subtle/60 pl-2.5 text-[12px] leading-snug">
            <li className="flex justify-between gap-2 tabular-nums">
              <span className="min-w-0 text-text-muted">
                <span className="text-text-muted/80" aria-hidden>
                  -{" "}
                </span>
                {nights} gün × {formatPrice(pricePerDay)}
              </span>
              <span className="shrink-0 text-text">{formatPrice(rentalOnly)}</span>
            </li>
          </ul>
        ) : (
          <p className="mt-1 pl-3 text-xs leading-snug text-text-muted">— Tarih seçilince hesaplanır</p>
        )}
      </div>
      {abroadUsageFee > 0 ? (
        <div className="mt-1">
          <Row label="Yurt dışı kullanım ek ücreti" value={formatPrice(abroadUsageFee)} />
        </div>
      ) : null}
    </>
  );
}

function BookingRentalSummaryCard({
  vehicle,
  nights,
  pickup,
  ret,
  formatPrice,
  abroadUsageFee,
  differentDropoffDetailLines,
  differentDropoffSelectedSurchargeEur,
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
  abroadUsageFee: number;
  differentDropoffDetailLines: ExtraFeeLineItem[];
  /** Seçilen teslim satırının EUR ek ücreti; teslim yeri satırında gösterilir */
  differentDropoffSelectedSurchargeEur?: number | null;
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
    <div className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-br from-bg-card to-bg-raised/80 p-4 ring-1 ring-border-subtle/70">
        <p className="text-[11px] font-medium uppercase tracking-wider text-text-muted">{vehicle.brand}</p>
        <p className="mt-0.5 text-[15px] font-bold leading-snug tracking-tight text-text">{vehicle.name}</p>
        <p className="mt-2 text-[11px] font-medium uppercase tracking-wider text-text-muted">Günlük</p>
        <p className="tabular-nums text-lg font-bold leading-none text-accent">
          {formatPrice(vehicle.pricePerDay)}
          <span className="text-xs font-semibold text-text-muted"> / gün</span>
        </p>
      </div>

      {nights != null && pickup && ret ? (
        <section className="rounded-2xl bg-bg-card/50 px-3.5 py-3 ring-1 ring-border-subtle/50">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">Plan</p>
          <div className="mt-2.5 space-y-2 text-[13px] leading-snug text-text-muted">
            <div className="flex gap-2">
              <span className="w-14 shrink-0 text-[11px] font-semibold uppercase text-text-muted/90">Alış</span>
              <span className="min-w-0 text-text">
                {formatTrDate(pickup)}
                {pickupTime ? (
                  <span className="ml-1.5 tabular-nums text-text-muted">· {pickupTime}</span>
                ) : null}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="w-14 shrink-0 text-[11px] font-semibold uppercase text-text-muted/90">Teslim</span>
              <span className="min-w-0 text-text">
                {formatTrDate(ret)}
                {returnTime ? (
                  <span className="ml-1.5 tabular-nums text-text-muted">· {returnTime}</span>
                ) : null}
              </span>
            </div>
            {differentDropoff ? (
              <div className="border-t border-border-subtle/60 pt-2.5 text-[12px]">
                <p>
                  <span className="font-semibold text-text">Alış yeri</span>
                  <span className="mt-0.5 block text-text-muted">{pickupLocationLabel}</span>
                </p>
                <p className="mt-2">
                  <span className="font-semibold text-text">Teslim yeri</span>
                  <span className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-text-muted">
                    <span>{returnLocationLabel}</span>
                    {differentDropoffSelectedSurchargeEur != null &&
                    Number.isFinite(differentDropoffSelectedSurchargeEur) &&
                    differentDropoffSelectedSurchargeEur > 0 ? (
                      <span className="tabular-nums font-semibold text-accent">
                        {formatSurchargeEurSuffix(differentDropoffSelectedSurchargeEur)}
                      </span>
                    ) : null}
                  </span>
                </p>
              </div>
            ) : null}
          </div>
        </section>
      ) : (
        <p className="rounded-xl bg-bg-card/40 px-3 py-2.5 text-xs text-text-muted ring-1 ring-border-subtle/40">
          Tarih aralığını seçtiğinizde plan özeti burada görünür.
        </p>
      )}

      <section className="rounded-2xl bg-bg-card/40 px-3.5 py-3 ring-1 ring-border-subtle/50">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">Ücret</p>
        <div className="mt-2 space-y-1 text-sm">
          <SummaryVehicleRentalPricingRows
            formatPrice={formatPrice}
            nights={nights}
            pricePerDay={vehicle.pricePerDay}
            abroadUsageFee={abroadUsageFee}
          />
          {differentDropoff && differentDropoffDetailLines.length > 0 ? (
            <DifferentDropoffPricingSection formatPrice={formatPrice} lines={differentDropoffDetailLines} />
          ) : null}
          <ExtraFeesPricingSection formatPrice={formatPrice} extraFeeTry={extraFeeTry} lines={extraFeeLineItems} />
        </div>
        <div className="mt-4 flex items-end justify-between gap-3 border-t border-border-subtle/70 pt-3">
          <span className="text-sm font-bold text-text">Toplam</span>
          <span className="text-xl font-bold tabular-nums tracking-tight text-accent">{formatPrice(total)}</span>
        </div>
      </section>
    </div>
  );
}

type VehicleHandoverSelectOpt = {
  value: string;
  label: string;
  right?: string;
  /** Dashboard / handover kaydı EUR ek ücreti; farklı teslim toplamı buna göre hesaplanır */
  surchargeEur?: number;
};

function mapHandoverPickupRows(rows: unknown[]): VehicleHandoverSelectOpt[] {
  return (Array.isArray(rows) ? rows : [])
    .filter((row) => {
      if (row == null || typeof row !== "object") return false;
      return (row as { active?: boolean }).active !== false;
    })
    .map((row) => {
      const o = row as Record<string, unknown>;
      return { value: String(o.id ?? ""), label: String(o.name ?? "") };
    })
    .filter((x) => x.value.length > 0);
}

/** Katalog / seçicide `+12 €` gibi etiketler */
function formatSurchargeEurSuffix(eur: number): string {
  if (!Number.isFinite(eur) || eur <= 0) return "";
  const r = Math.round(eur * 100) / 100;
  const s = Number.isInteger(r) ? String(r) : r.toFixed(2).replace(/\.?0+$/, "");
  return `+${s} €`;
}

/** Liste / özet: panel `surchargeEur` (€ işareti, + yok) */
function formatEurSurchargeAmount(eur: number): string {
  if (!Number.isFinite(eur) || eur <= 0) return "";
  const r = Math.round(eur * 100) / 100;
  const s = Number.isInteger(r) ? String(r) : r.toFixed(2).replace(/\.?0+$/, "");
  return `${s} €`;
}

function mapHandoverReturnRows(rows: unknown[]): VehicleHandoverSelectOpt[] {
  return (Array.isArray(rows) ? rows : [])
    .filter((row) => {
      if (row == null || typeof row !== "object") return false;
      return (row as { active?: boolean }).active !== false;
    })
    .map((row) => {
      const o = row as Record<string, unknown>;
      const parsed = parseSurchargeEur(o);
      const eur = parsed != null && parsed > 0 ? parsed : undefined;
      const right = eur != null ? formatSurchargeEurSuffix(eur) : undefined;
      return {
        value: String(o.id ?? ""),
        label: String(o.name ?? ""),
        right,
        surchargeEur: eur,
      };
    })
    .filter((x) => x.value.length > 0);
}

/** Araç kaydından alış seçenekleri; `null` ise global PICKUP kataloğu gerekir */
function pickupOptionsFromVehicle(vehicle: FleetVehicle): VehicleHandoverSelectOpt[] | null {
  const ph = vehicle.pickupHandoverForBooking;
  if (ph?.id) {
    const eur = ph.surchargeEur;
    return [
      {
        value: ph.id,
        label: ph.name || ph.id,
        right: typeof eur === "number" && eur > 0 ? formatSurchargeEurSuffix(eur) : undefined,
        surchargeEur: typeof eur === "number" && eur > 0 ? eur : undefined,
      },
    ];
  }
  const id = vehicle.defaultPickupHandoverLocationId?.trim() ?? "";
  if (isLikelyUuidString(id)) {
    return [
      {
        value: id,
        label:
          vehicle.defaultPickupHandoverName?.trim() ||
          vehicle.pickupLocationLabel?.trim() ||
          id,
        right: undefined,
      },
    ];
  }
  return null;
}

/** Araç kaydından teslim seçenekleri; `null` ise global RETURN kataloğu gerekir */
function returnOptionsFromVehicle(vehicle: FleetVehicle): VehicleHandoverSelectOpt[] | null {
  const rh = vehicle.returnHandoversForBooking;
  if (rh && rh.length > 0) {
    return rh.map((h) => {
      const eur = h.surchargeEur;
      const n = typeof eur === "number" && Number.isFinite(eur) && eur > 0 ? eur : undefined;
      return {
        value: h.id,
        label: h.name || h.id,
        right: n != null ? formatSurchargeEurSuffix(n) : undefined,
        surchargeEur: n,
      };
    });
  }
  const ph = vehicle.pickupHandoverForBooking;
  const fallbackReturnId =
    vehicle.defaultReturnHandoverLocationId?.trim() || vehicle.defaultPickupHandoverLocationId?.trim() || "";
  if (fallbackReturnId && isLikelyUuidString(fallbackReturnId)) {
    return [
      {
        value: fallbackReturnId,
        label:
          vehicle.defaultReturnHandoverName?.trim() ||
          vehicle.defaultPickupHandoverName?.trim() ||
          vehicle.pickupLocationLabel?.trim() ||
          ph?.name ||
          fallbackReturnId,
        right: undefined,
      },
    ];
  }
  if (fallbackReturnId) {
    return [
      {
        value: fallbackReturnId,
        label:
          vehicle.defaultReturnHandoverName?.trim() ||
          vehicle.defaultPickupHandoverName?.trim() ||
          ph?.name ||
          fallbackReturnId,
        right: undefined,
      },
    ];
  }
  return null;
}

export function BookingWizard({ vehicle: ssrVehicle }: { vehicle: FleetVehicle }) {
  const { formatPrice } = useI18n();
  const [vehicle, setVehicle] = useState(ssrVehicle);
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setVehicle(ssrVehicle);
  }, [ssrVehicle.id]);

  useEffect(() => {
    if (!isLikelyUuidString(ssrVehicle.id)) return;
    let cancelled = false;
    void (async () => {
      try {
        const v = await fetchFleetVehicleById(ssrVehicle.id);
        if (!cancelled && v) setVehicle(v);
      } catch {
        /* sunucu props */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ssrVehicle.id]);
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

  const fromApiVehicle = isLikelyUuidString(vehicle.id);
  const defaultHandoverPickup = vehicle.defaultPickupHandoverLocationId ?? "";
  const defaultHandoverReturn = vehicle.defaultReturnHandoverLocationId ?? "";

  const [apiPickupOptions, setApiPickupOptions] = useState<VehicleHandoverSelectOpt[]>([]);
  const [apiReturnOptions, setApiReturnOptions] = useState<VehicleHandoverSelectOpt[]>([]);

  useEffect(() => {
    if (!fromApiVehicle) {
      setApiPickupOptions([]);
      setApiReturnOptions([]);
      return;
    }
    if (reserveAuthPhase !== "ready") return;
    let cancelled = false;

    const vPickup = pickupOptionsFromVehicle(vehicle);
    const vReturn = returnOptionsFromVehicle(vehicle);
    const needPickupApi = vPickup === null;
    const needReturnApi = vReturn === null;

    if (!needPickupApi && !needReturnApi) {
      setApiPickupOptions(vPickup);
      setApiReturnOptions(vReturn);
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      try {
        const member = await fetchHasBffMemberSession();
        const p = needPickupApi
          ? await (member ? fetchHandoverLocationsFromRentApi("PICKUP") : fetchHandoverLocationsAsRentGuest("PICKUP"))
          : [];
        const r = needReturnApi
          ? await (member ? fetchHandoverLocationsFromRentApi("RETURN") : fetchHandoverLocationsAsRentGuest("RETURN"))
          : [];
        if (cancelled) return;

        const pickupRows = needPickupApi ? mapHandoverPickupRows(p as unknown[]) : [];
        const returnRows = needReturnApi ? mapHandoverReturnRows(r as unknown[]) : [];

        let pickupOpts: VehicleHandoverSelectOpt[] = needPickupApi ? pickupRows : vPickup!;
        let returnOpts: VehicleHandoverSelectOpt[] = needReturnApi ? returnRows : vReturn!;

        if (needPickupApi) {
          const ph = vehicle.pickupHandoverForBooking;
          if (ph?.id) {
            const eur = ph.surchargeEur;
            pickupOpts = [
              {
                value: ph.id,
                label: ph.name || ph.id,
                right: typeof eur === "number" && eur > 0 ? formatSurchargeEurSuffix(eur) : undefined,
                surchargeEur: typeof eur === "number" && eur > 0 ? eur : undefined,
              },
            ];
          } else {
            const def = vehicle.defaultPickupHandoverLocationId?.trim() ?? "";
            if (isLikelyUuidString(def)) {
              const hit = pickupRows.find((o) => o.value === def);
              pickupOpts = hit
                ? [hit]
                : [
                    {
                      value: def,
                      label:
                        vehicle.defaultPickupHandoverName?.trim() ||
                        vehicle.pickupLocationLabel?.trim() ||
                        def,
                      right: undefined,
                    },
                  ];
            }
          }
        }

        if (needReturnApi) {
          const rh = vehicle.returnHandoversForBooking;
          if (rh && rh.length > 0) {
            const byId = new Map(returnRows.map((o) => [o.value, o]));
            returnOpts = rh.map((h) => {
              const merged = byId.get(h.id);
              const fromVehicle =
                typeof h.surchargeEur === "number" && Number.isFinite(h.surchargeEur) && h.surchargeEur > 0
                  ? h.surchargeEur
                  : undefined;
              const catalogSur =
                merged &&
                typeof merged.surchargeEur === "number" &&
                Number.isFinite(merged.surchargeEur) &&
                merged.surchargeEur > 0
                  ? merged.surchargeEur
                  : undefined;
              /** Araç kaydında yoksa RETURN kataloğundaki tutar (seçicideki +€ ile özet/toplam aynı olsun) */
              const sur = fromVehicle ?? catalogSur;
              return {
                value: h.id,
                label: h.name || h.id,
                right: sur != null ? formatSurchargeEurSuffix(sur) : merged?.right,
                surchargeEur: sur,
              };
            });
          } else {
            const ph = vehicle.pickupHandoverForBooking;
            const fallbackReturnId =
              vehicle.defaultReturnHandoverLocationId?.trim() ||
              vehicle.defaultPickupHandoverLocationId?.trim() ||
              pickupOpts[0]?.value ||
              "";
            if (fallbackReturnId) {
              const fromCatalog = returnRows.find((o) => o.value === fallbackReturnId);
              returnOpts = fromCatalog
                ? [fromCatalog]
                : [
                    {
                      value: fallbackReturnId,
                      label:
                        vehicle.defaultReturnHandoverName?.trim() ||
                        vehicle.defaultPickupHandoverName?.trim() ||
                        ph?.name ||
                        fallbackReturnId,
                      right: undefined,
                    },
                  ];
            } else {
              returnOpts = [];
            }
          }
        }

        if (!cancelled) {
          setApiPickupOptions(pickupOpts);
          setApiReturnOptions(returnOpts);
        }
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
  }, [
    fromApiVehicle,
    reserveAuthPhase,
    vehicle.pickupHandoverForBooking,
    vehicle.returnHandoversForBooking,
    vehicle.defaultPickupHandoverLocationId,
    vehicle.defaultReturnHandoverLocationId,
    vehicle.defaultPickupHandoverName,
    vehicle.defaultReturnHandoverName,
    vehicle.pickupLocationLabel,
  ]);

  const vehiclePickupOpts = useMemo(
    () => pickupOptionsFromVehicle(vehicle) ?? [],
    [
      vehicle.pickupHandoverForBooking,
      vehicle.defaultPickupHandoverLocationId,
      vehicle.defaultPickupHandoverName,
      vehicle.pickupLocationLabel,
    ],
  );
  const vehicleReturnOpts = useMemo(
    () => returnOptionsFromVehicle(vehicle) ?? [],
    [
      vehicle.returnHandoversForBooking,
      vehicle.defaultReturnHandoverLocationId,
      vehicle.defaultPickupHandoverLocationId,
      vehicle.defaultReturnHandoverName,
      vehicle.defaultPickupHandoverName,
      vehicle.pickupLocationLabel,
      vehicle.pickupHandoverForBooking,
    ],
  );

  const firstPickupHandoverId = useMemo(() => {
    const list = fromApiVehicle && apiPickupOptions.length > 0 ? apiPickupOptions : vehiclePickupOpts;
    return list.find((o) => isLikelyUuidString(o.value))?.value ?? "";
  }, [fromApiVehicle, apiPickupOptions, vehiclePickupOpts]);

  const firstReturnHandoverId = useMemo(() => {
    const list = fromApiVehicle && apiReturnOptions.length > 0 ? apiReturnOptions : vehicleReturnOpts;
    return list.find((o) => isLikelyUuidString(o.value))?.value ?? "";
  }, [fromApiVehicle, apiReturnOptions, vehicleReturnOpts]);

  const rawLokasyon = (sp.get("lokasyon") ?? "").trim();
  const rawLokasyonTeslim = (sp.get("lokasyonTeslim") ?? "").trim();

  const firstVehiclePickupValue =
    vehiclePickupOpts.find((o) => isLikelyUuidString(o.value))?.value ?? vehiclePickupOpts[0]?.value ?? "";

  /** API aracı: URL’deki demo `lokasyon` slug’ı handover UUID değil; önce gerçek UUID (araç varsayılanı / API listesi). */
  const locId = fromApiVehicle
    ? isLikelyUuidString(rawLokasyon)
      ? rawLokasyon
      : isLikelyUuidString(defaultHandoverPickup)
        ? defaultHandoverPickup
        : firstPickupHandoverId
    : rawLokasyon || defaultHandoverPickup || firstVehiclePickupValue;

  const returnLocId = fromApiVehicle
    ? isLikelyUuidString(rawLokasyonTeslim)
      ? rawLokasyonTeslim
      : isLikelyUuidString(defaultHandoverReturn)
        ? defaultHandoverReturn
        : isLikelyUuidString(defaultHandoverPickup)
          ? defaultHandoverPickup
          : locId || firstReturnHandoverId || firstPickupHandoverId
    : rawLokasyonTeslim ||
      (defaultHandoverReturn ||
        defaultHandoverPickup ||
        locId ||
        vehicleReturnOpts.find((o) => isLikelyUuidString(o.value))?.value ||
        vehicleReturnOpts[0]?.value ||
        "");

  useEffect(() => {
    if (!fromApiVehicle) return;
    const badPickup = rawLokasyon.length > 0 && !isLikelyUuidString(rawLokasyon);
    const badReturn = rawLokasyonTeslim.length > 0 && !isLikelyUuidString(rawLokasyonTeslim);
    if (!badPickup && !badReturn) return;
    if (!isLikelyUuidString(locId)) return;
    patchQuery((q) => {
      if (badPickup) q.set("lokasyon", locId);
      if (badReturn && isLikelyUuidString(returnLocId)) q.set("lokasyonTeslim", returnLocId);
    });
  }, [fromApiVehicle, rawLokasyon, rawLokasyonTeslim, locId, returnLocId]);

  const handoverLabel = useCallback(
    (id: string) => {
      const hit = [...apiPickupOptions, ...apiReturnOptions, ...vehiclePickupOpts, ...vehicleReturnOpts].find(
        (o) => o.value === id,
      );
      return hit?.label ?? id;
    },
    [apiPickupOptions, apiReturnOptions, vehiclePickupOpts, vehicleReturnOpts],
  );

  const pickupLocation =
    fromApiVehicle && isLikelyUuidString(locId)
      ? { label: handoverLabel(locId), countryCode: "" }
      : getLocationById(locId) ?? { label: handoverLabel(locId), countryCode: "" };
  const returnLocation =
    fromApiVehicle && isLikelyUuidString(returnLocId)
      ? { label: handoverLabel(returnLocId), countryCode: "" }
      : getLocationById(returnLocId) ?? { label: handoverLabel(returnLocId), countryCode: "" };
  const pickupSummaryLabel = pickupLocation?.label?.trim() || locId;
  const returnSummaryLabel = returnLocation?.label?.trim() || returnLocId;
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
    return vehiclePickupOpts;
  }, [fromApiVehicle, apiPickupOptions, vehiclePickupOpts]);

  const returnLocationSelectOptions = useMemo(() => {
    if (fromApiVehicle && apiReturnOptions.length > 0) return apiReturnOptions;
    return vehicleReturnOpts;
  }, [fromApiVehicle, apiReturnOptions, vehicleReturnOpts]);

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
      pickupLocationSelectOptions.find((o) => isLikelyUuidString(o.value))?.value ?? "";
    const fallbackReturn =
      returnLocationSelectOptions.find((o) => o.value !== fallbackPickup && isLikelyUuidString(o.value))?.value ??
      returnLocationSelectOptions.find((o) => isLikelyUuidString(o.value))?.value ??
      "";

    const pBad = isLikelyUuidString(rawLokasyon) && !pickupAllowed.has(rawLokasyon);
    const rBad = isLikelyUuidString(rawLokasyonTeslim) && !returnAllowed.has(rawLokasyonTeslim);
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

  /** Yalnızca seçili teslim satırının `surchargeEur`; alan yoksa veya ≤0 ise ek ücret yok */
  const differentDropoffPricingMeta = useMemo((): DifferentDropoffPricingMeta | null => {
    if (!fromApiVehicle || !differentDropoff) return null;
    const hit = returnLocationSelectOptions.find((o) => o.value === returnLocId);
    const s = hit?.surchargeEur;
    if (typeof s !== "number" || !Number.isFinite(s) || s <= 0) return null;
    return { eur: s };
  }, [fromApiVehicle, differentDropoff, returnLocId, returnLocationSelectOptions]);

  const selectedReturnHandoverSurchargeEur = differentDropoffPricingMeta?.eur ?? null;

  const differentDropoffSurchargeTry = useMemo(() => {
    if (!differentDropoff) return 0;
    if (fromApiVehicle) {
      if (selectedReturnHandoverSurchargeEur == null) return 0;
      return eurToTry(selectedReturnHandoverSurchargeEur);
    }
    return crossBorderFee > 0 ? crossBorderFee : DIFFERENT_DROPOFF_DEMO_SURCHARGE_TRY;
  }, [differentDropoff, fromApiVehicle, selectedReturnHandoverSurchargeEur, crossBorderFee]);

  const differentDropoffDetailLines = useMemo((): ExtraFeeLineItem[] => {
    if (!differentDropoff) return [];
    const loc = returnSummaryLabel.trim();
    if (!loc) return [];
    if (fromApiVehicle) {
      if (selectedReturnHandoverSurchargeEur == null) return [];
      const eur = selectedReturnHandoverSurchargeEur;
      return [
        {
          key: "dd-ret",
          label: loc,
          amountTry: eurToTry(eur),
          displayEurSurcharge: eur,
        },
      ];
    }
    if (differentDropoffSurchargeTry > 0) {
      return [{ key: "dd-demo", label: loc, amountTry: differentDropoffSurchargeTry }];
    }
    return [];
  }, [
    differentDropoff,
    returnSummaryLabel,
    fromApiVehicle,
    selectedReturnHandoverSurchargeEur,
    differentDropoffSurchargeTry,
  ]);

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

  const [rentalSummaryOpen, setRentalSummaryOpen] = useState(false);
  const prevWizardStepRef = useRef(step);

  useEffect(() => {
    const prev = prevWizardStepRef.current;
    prevWizardStepRef.current = step;
    if (step === 4) {
      setRentalSummaryOpen(true);
      return;
    }
    if (prev === 4 && step !== 4) setRentalSummaryOpen(false);
  }, [step]);

  useEffect(() => {
    if (!rentalSummaryOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [rentalSummaryOpen]);

  useEffect(() => {
    if (step === 4 && errors.terms) setRentalSummaryOpen(true);
  }, [step, errors.terms]);

  useEffect(() => {
    if (!rentalSummaryOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setRentalSummaryOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rentalSummaryOpen]);

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
      if (!locId.trim() || !isLikelyUuidString(locId)) {
        setErrors({
          dates:
            "Bu araç için alış noktası (ofis) tanımlı değil veya liste yüklenemedi. Sayfayı yenileyin; sorun sürerse araç kaydında varsayılan alış noktası ekleyin.",
        });
        return false;
      }
      if (!returnLocId.trim() || !isLikelyUuidString(returnLocId)) {
        setErrors({
          dates:
            "Teslim noktası tanımlı değil veya liste yüklenemedi. Sayfayı yenileyin veya farklı teslim seçeneklerini kontrol edin.",
        });
        return false;
      }
    }
    if (bookingCalendarBlockedLoading && isLikelyUuidString(vehicle.id)) {
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

        const reservationExtrasForPricing = [...selectedReservationExtraIds].map((tid) => {
          const t = (reservationExtraTemplates ?? []).find((x) => x.id === tid);
          return {
            templateId: tid,
            title: t?.title?.trim() || "Ek hizmet",
            priceTry: Number(t?.price) || 0,
          };
        });
        const vehicleOptionsForPricing = [...selectedVehicleOptionIds].map((defId) => {
          const d = vehicle.rentOptionDefinitions?.find((x) => x.id === defId);
          return {
            definitionId: defId,
            title: d?.title?.trim() || "Araç seçeneği",
            priceTry: Number(d?.price) || 0,
          };
        });
        const pricingLines = buildRentalRequestPricingLines({
          nights,
          vehiclePricePerDayTry: vehicle.pricePerDay,
          differentDropoff,
          differentDropoffSurchargeTry,
          handoverSurchargeEur: selectedReturnHandoverSurchargeEur,
          abroadUsageFeeTry: abroadUsageFee,
          planVehicleAbroad,
          reservationExtras: reservationExtrasForPricing,
          vehicleOptions: vehicleOptionsForPricing,
        });

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
          vehicleId: isLikelyUuidString(vehicle.id) ? vehicle.id : undefined,
          startDate: pickup,
          endDate: ret,
          pickupHandoverLocationId: isLikelyUuidString(locId) ? locId : undefined,
          returnHandoverLocationId: isLikelyUuidString(returnLocId) ? returnLocId : undefined,
          outsideCountryTravel: planVehicleAbroad,
          note: combinedNote || undefined,
          options: apiOpts,
          pricingLines,
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
      <div className="mx-auto max-w-lg px-5 py-24 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-sm border border-accent/30 bg-accent/10 text-xl text-accent">
          ✓
        </div>
        <h1 className="mt-5 text-xl font-semibold text-text sm:text-2xl">Talebiniz alındı</h1>
        <p className="mt-3 text-sm text-text-muted">
          Referans numaranız:{" "}
          <span className="font-sans text-base font-semibold tabular-nums tracking-tight text-accent sm:text-lg">{doneRef}</span>
        </p>
        <p className="mt-3 text-sm text-text-muted">
          Concierge ekibimiz kimlik doğrulama ve ödeme bağlantısı için 30 dakika içinde sizi
          arayacak. Bu demo ortamında gerçek ödeme alınmaz.
        </p>
        <AnimatedButton variant="primary" href="/" className="mt-10">
          Ana sayfaya dön
        </AnimatedButton>
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-4xl px-4 pb-8 pt-[var(--header-h)] sm:px-6 lg:pb-20">
      <div className="mt-6 min-w-0">
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
                        ? "bg-btn-solid text-btn-solid-fg"
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

          <div key={step} className="mt-10">
              {step === 1 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-text">Tarih seçimi</h2>

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
                            const optionRow = returnLocationSelectOptions.find((o) => o.value === v);
                            const vehicleRow =
                              vehicle.returnHandoversForBooking?.find((h) => h.id === v) ?? null;
                            if (process.env.NODE_ENV === "development") {
                              console.log("[BookingWizard] teslim yeri seçimi", {
                                selectedId: v,
                                selectOptionRow: optionRow ?? null,
                                vehicleReturnHandoverRaw: vehicleRow,
                              });
                            }
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

                  {calendarRevealed ? (
                      <div>
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
                                  vehiclePickupOpts[0]?.value ||
                                  (isLikelyUuidString(defaultHandoverPickup) ? defaultHandoverPickup : "");
                                if (fb) q.set("lokasyon", fb);
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
                      </div>
                    ) : null}
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
                  differentDropoffSurchargeTry={differentDropoffSurchargeTry}
                  differentDropoffDetailLines={differentDropoffDetailLines}
                  fromApiVehicle={fromApiVehicle}
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
                  omitPricingAndTerms
                />
              )}
            </div>

          <div className="mt-10 flex w-full min-w-0 flex-wrap items-center gap-3">
            {step > 1 && <RentIconBackButton onClick={goBack} aria-label="Geri" />}
            {step !== 4 && (
              <button
                type="button"
                onClick={() => void goNext()}
                className="ml-auto rounded-md bg-btn-solid px-6 py-2.5 text-[13px] font-semibold text-btn-solid-fg shadow-sm"
              >
                Devam et
              </button>
            )}
          </div>
      </div>

      {!rentalSummaryOpen ? (
        <button
          type="button"
          onClick={() => setRentalSummaryOpen(true)}
          className="fixed top-1/2 z-[60] flex max-h-[min(70vh,520px)] w-11 -translate-y-1/2 flex-col items-center justify-center gap-2 rounded-l-2xl border border-r-0 border-border-subtle bg-bg-card/95 py-4 text-[10px] font-bold uppercase leading-tight tracking-wide text-text shadow-[0_8px_32px_rgba(15,23,42,0.18)] backdrop-blur-md transition hover:border-accent/35 hover:bg-bg-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          style={{ right: "max(0px, env(safe-area-inset-right))" }}
          aria-expanded={false}
          aria-controls="rental-summary-drawer"
          aria-label="Kiralama özetini aç"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-accent/15 text-accent" aria-hidden>
            <svg
              viewBox="0 0 24 24"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
            </svg>
          </span>
          <span
            className="select-none px-0.5 text-center text-[9px] text-text-muted [writing-mode:vertical-rl] rotate-180"
            style={{ textOrientation: "mixed" }}
          >
            Özet
          </span>
          <span className="max-w-[2.5rem] truncate px-0.5 text-center text-[10px] font-bold tabular-nums leading-none text-accent [writing-mode:vertical-rl] rotate-180">
            {formatPrice(total)}
          </span>
        </button>
      ) : null}

      <button
        type="button"
        aria-label={rentalSummaryOpen ? "Özeti kapat" : undefined}
        className={`fixed inset-0 z-[55] border-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 ease-out ${
          rentalSummaryOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        tabIndex={rentalSummaryOpen ? 0 : -1}
        onClick={() => setRentalSummaryOpen(false)}
      />

      <div
        id="rental-summary-drawer"
        role="dialog"
        aria-modal="true"
        aria-hidden={!rentalSummaryOpen}
        aria-labelledby="rental-summary-drawer-title"
        className={`fixed inset-y-0 right-0 z-[60] flex w-full max-w-md flex-col border-l border-border-subtle bg-bg-raised shadow-[-20px_0_60px_rgba(0,0,0,0.22)] transition-transform duration-300 ease-out ${
          rentalSummaryOpen ? "translate-x-0" : "translate-x-full pointer-events-none"
        }`}
        style={{ paddingRight: "env(safe-area-inset-right)" }}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border-subtle bg-bg-card/90 px-4 py-3.5">
          <h2 id="rental-summary-drawer-title" className="text-base font-semibold tracking-tight text-text">
            Kiralama özeti
          </h2>
          <button
            type="button"
            onClick={() => setRentalSummaryOpen(false)}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-text-muted transition hover:bg-bg-raised hover:text-text"
          >
            Kapat
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <BookingRentalSummaryCard
            vehicle={vehicle}
            nights={nights}
            pickup={pickup}
            ret={ret}
            formatPrice={formatPrice}
            abroadUsageFee={abroadUsageFee}
            differentDropoffDetailLines={differentDropoffDetailLines}
            differentDropoffSelectedSurchargeEur={differentDropoffPricingMeta?.eur ?? null}
            extraFeeTry={extraFeeTry}
            extraFeeLineItems={extraFeeLineItems}
            total={total}
            differentDropoff={differentDropoff}
            pickupLocationLabel={pickupSummaryLabel}
            returnLocationLabel={returnSummaryLabel}
            pickupTime={alisSaat}
            returnTime={teslimSaat}
          />
          {step === 4 ? (
            <div className="mt-6 space-y-4 border-t border-border-subtle pt-5">
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
                  <span className="text-text">Kiralama şartları</span>, sigorta kapsamı ve iptal politikasını okudum,
                  onaylıyorum.
                </span>
              </label>
              {errors.terms && <p className="text-xs text-amber-300">{errors.terms}</p>}
              <button
                type="button"
                disabled={submitting}
                onClick={() => void goNext()}
                className="w-full rounded-xl bg-btn-solid px-6 py-3.5 text-[13px] font-semibold text-btn-solid-fg shadow-sm transition hover:opacity-95 disabled:opacity-60"
              >
                {submitting ? "Gönderiliyor..." : "Rezervasyonu gönder"}
              </button>
            </div>
          ) : null}
        </div>
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
      <div className="mt-8 space-y-3 rounded-xl border border-border-subtle bg-bg-raised/30 p-4">
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
  differentDropoffSurchargeTry,
  differentDropoffDetailLines,
  fromApiVehicle,
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
  differentDropoffSurchargeTry: number;
  differentDropoffDetailLines: ExtraFeeLineItem[];
  fromApiVehicle: boolean;
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
  /** Özet sağ çekmecede; ana sütunda fiyat + şartlar tekrarlanmasın. */
  omitPricingAndTerms?: boolean;
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-text">Son kontrol</h2>
      {omitPricingAndTerms && (
        <p className="mt-2 text-xs leading-relaxed text-text-muted">
          Tutar dökümü, toplam ve kiralama şartları sağdaki «Özet» panelinde; onay adımında panel otomatik açılır.
          Kapatmak için dışarı tıklayın veya Esc tuşuna basın.
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
        {crossBorderFee > 0 && !(fromApiVehicle && differentDropoff) && (
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
            <SummaryVehicleRentalPricingRows
              formatPrice={formatPrice}
              nights={nights}
              pricePerDay={vehicle.pricePerDay}
              abroadUsageFee={abroadUsageFee}
            />
            {differentDropoff && differentDropoffDetailLines.length > 0 ? (
              <DifferentDropoffPricingSection formatPrice={formatPrice} lines={differentDropoffDetailLines} />
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

