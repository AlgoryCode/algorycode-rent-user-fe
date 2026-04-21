"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { RentIconBackLink } from "@/components/ui/RentIconBack";
import { formatTrDate, formatTrDateTime } from "@/lib/dates";
import {
  fetchRentalByIdFromRentApi,
  fetchRentalRequestByIdFromRentApi,
  fetchRentalRequestByReferenceFromRentApi,
  fetchVehicleByIdFromRentApi,
} from "@/lib/rentApi";
import { isLikelyUuidString } from "@/lib/uuidLike";

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

function getNumber(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim()) {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function getPricedLines(raw: Record<string, unknown>): Array<Record<string, unknown>> {
  const pl = raw.pricedLines ?? raw.priced_lines;
  if (!Array.isArray(pl)) return [];
  return pl.filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null);
}

function lineAmountTry(row: Record<string, unknown>): number {
  const n = getNumber(row, ["lineAmount", "line_amount"]);
  return n ?? 0;
}

function formatTryAmount(n: number): string {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 }).format(n);
}

function normalizeIsoDate(s: string): string {
  const t = s.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  return t;
}

/** Liste DTO’sunda gömülü `vehicle` olabilir; tekil GET’te çoğu zaman yalnızca `vehicleId` gelir. */
function resolveVehicleId(raw: Record<string, unknown>): string {
  const vRaw = raw.vehicle;
  if (typeof vRaw === "string" && isLikelyUuidString(vRaw)) return vRaw.trim();
  const nested = asObj(vRaw);
  return (
    getString(raw, ["vehicleId", "vehicle_id", "carId", "assignedVehicleId"]) ||
    getString(nested, ["id"]) ||
    ""
  );
}

type Kind = "rental" | "request";

export function RentalDetailView({ kind, id }: { kind: Kind; id: string }) {
  const [raw, setRaw] = useState<Record<string, unknown> | null>(null);
  const [vehicleById, setVehicleById] = useState<Record<string, unknown> | null>(null);
  const [vehicleByIdLoading, setVehicleByIdLoading] = useState(false);
  const [vehicleByIdFailed, setVehicleByIdFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      setRaw(null);
      try {
        let row: Record<string, unknown>;
        if (kind === "rental") {
          row = asObj(await fetchRentalByIdFromRentApi(id));
        } else if (isLikelyUuidString(id)) {
          row = asObj(await fetchRentalRequestByIdFromRentApi(id));
        } else {
          row = asObj(await fetchRentalRequestByReferenceFromRentApi(id));
        }
        if (!cancelled) setRaw(row);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Kayıt yüklenemedi.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kind, id]);

  useEffect(() => {
    if (!raw) {
      setVehicleById(null);
      setVehicleByIdLoading(false);
      setVehicleByIdFailed(false);
      return;
    }
    const vid = resolveVehicleId(raw);
    if (!vid) {
      setVehicleById(null);
      setVehicleByIdLoading(false);
      setVehicleByIdFailed(false);
      return;
    }
    const nested = asObj(raw.vehicle);
    const hasNestedDetails =
      Boolean(getString(nested, ["brand"]) || getString(nested, ["model", "name"]) || getString(nested, ["plate"]));
    if (hasNestedDetails) {
      setVehicleById(null);
      setVehicleByIdLoading(false);
      setVehicleByIdFailed(false);
      return;
    }
    let cancelled = false;
    setVehicleByIdLoading(true);
    setVehicleByIdFailed(false);
    setVehicleById(null);
    void (async () => {
      try {
        const v = asObj(await fetchVehicleByIdFromRentApi(vid));
        if (!cancelled) {
          setVehicleById(v);
          setVehicleByIdFailed(false);
        }
      } catch {
        if (!cancelled) {
          setVehicleById(null);
          setVehicleByIdFailed(true);
        }
      } finally {
        if (!cancelled) setVehicleByIdLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [raw]);

  const vehicle = useMemo(() => asObj(raw?.vehicle), [raw]);
  const customer = useMemo(() => asObj(raw?.customer), [raw]);
  const vehicleApi = useMemo(() => vehicleById ?? {}, [vehicleById]);

  const vehicleName =
    getString(vehicle, ["name", "model"]) ||
    getString(vehicleApi, ["model", "name"]) ||
    getString(raw ?? {}, ["vehicleName", "model"]) ||
    "Araç";
  const vehicleBrand =
    getString(vehicle, ["brand"]) ||
    getString(vehicleApi, ["brand"]) ||
    getString(raw ?? {}, ["vehicleBrand", "brand"]) ||
    "—";
  const plate =
    getString(vehicle, ["plate"]) || getString(vehicleApi, ["plate"]) || getString(raw ?? {}, ["plate"]) || "";
  const vehicleId = resolveVehicleId(raw ?? {});

  const startDate = normalizeIsoDate(getString(raw ?? {}, ["startDate", "pickupDate", "rentStart", "alis"]) || "");
  const endDate = normalizeIsoDate(getString(raw ?? {}, ["endDate", "returnDate", "rentEnd", "teslim"]) || "");
  const referenceNo =
    getString(raw ?? {}, ["referenceNo", "reference", "referenceNumber"]) || (kind === "request" ? id : "");
  const status = getString(raw ?? {}, ["status", "statusName", "requestStatus"]) || "—";
  const createdAt = getString(raw ?? {}, ["createdAt", "createdDate", "requestDate", "updatedAt"]) || "";
  const note = getString(raw ?? {}, ["note", "notes", "customerNote"]) || "";
  const pricedLines = raw ? getPricedLines(raw) : [];
  const rentalNightsVal = raw ? getNumber(raw, ["rentalNights", "rental_nights"]) : null;
  const pricingTotalTryVal = raw ? getNumber(raw, ["pricingTotalTry", "pricing_total_try"]) : null;

  const aracHref =
    vehicleId && startDate && endDate
      ? `/arac/${encodeURIComponent(vehicleId)}?${new URLSearchParams({ alis: startDate, teslim: endDate }).toString()}`
      : vehicleId
        ? `/arac/${encodeURIComponent(vehicleId)}`
        : null;

  const title = kind === "rental" ? "Kiralama detayı" : "Rezervasyon talebi";

  return (
    <SiteLayout>
      <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-28 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <RentIconBackLink
            href="/hesabim?section=rezervasyonlar"
            aria-label="Rezervasyonlara dön"
            className="shrink-0"
          />
          <h1 className="m-0 text-2xl font-semibold leading-tight text-text">{title}</h1>
        </div>

        {loading && <p className="text-sm text-text-muted">Yükleniyor…</p>}

        {error && !loading && (
          <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            <p className="m-0 font-medium">{error}</p>
            <p className="mt-2 text-xs text-text-muted">
              Kayıt silinmiş veya erişim yetkiniz olmayabilir. Liste için{" "}
              <Link href="/hesabim?section=rezervasyonlar" className="font-medium text-accent underline">
                Rezervasyonlarım
              </Link>
              &apos;a dönün.
            </p>
          </div>
        )}

        {!loading && !error && raw && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border-subtle/80 bg-bg-card/70 p-5 shadow-sm">
              <div>
                <p className="text-lg font-semibold text-text">
                  {vehicleBrand} {vehicleName}
                </p>
                {vehicleByIdLoading ? (
                  <p className="mt-1 text-xs text-text-muted">Araç bilgisi veritabanından yükleniyor…</p>
                ) : null}
                {vehicleByIdFailed && vehicleId ? (
                  <p className="mt-1 text-xs text-amber-200/90">
                    Araç kartı yüklenemedi (yetki veya ağ). Araç no:{" "}
                    <span className="font-sans tabular-nums tracking-tight text-text-muted">{vehicleId}</span>
                  </p>
                ) : null}
                {plate ? <p className="mt-1 text-sm text-text-muted">Plaka: {plate}</p> : null}
              </div>
              <span className="rounded-md border border-border-subtle bg-bg-raised/40 px-2.5 py-1 text-xs font-medium text-text-muted">
                {status}
              </span>
            </div>

            <section className="rounded-2xl border border-border-subtle/80 bg-bg-card/70 p-5 shadow-sm sm:p-6">
              <h2 className="m-0 text-sm font-semibold uppercase tracking-wide text-text-muted">Tarihler</h2>
              <p className="mt-2 text-base text-text">
                {startDate && endDate ? (
                  <>
                    {formatTrDate(startDate)} → {formatTrDate(endDate)}
                  </>
                ) : (
                  "—"
                )}
              </p>
              {referenceNo ? (
                <p className="mt-3 text-sm text-text-muted">
                  Referans: <span className="font-sans tabular-nums tracking-tight text-text">{referenceNo}</span>
                </p>
              ) : null}
              {createdAt ? (
                <p className="mt-1 text-sm text-text-muted">Oluşturma: {formatTrDateTime(createdAt)}</p>
              ) : null}
            </section>

            {kind === "request" && pricedLines.length > 0 ? (
              <section className="rounded-2xl border border-border-subtle/80 bg-bg-card/70 p-5 shadow-sm sm:p-6">
                <h2 className="m-0 text-sm font-semibold uppercase tracking-wide text-text-muted">Ücret kalemleri</h2>
                {(rentalNightsVal != null || pricingTotalTryVal != null) && (
                  <p className="mt-2 text-xs text-text-muted">
                    {rentalNightsVal != null ? (
                      <span>
                        Gece: <span className="tabular-nums text-text">{rentalNightsVal}</span>
                        {pricingTotalTryVal != null ? " · " : ""}
                      </span>
                    ) : null}
                    {pricingTotalTryVal != null ? (
                      <span>
                        Toplam (TRY):{" "}
                        <span className="tabular-nums font-medium text-text">{formatTryAmount(pricingTotalTryVal)}</span>
                      </span>
                    ) : null}
                  </p>
                )}
                <ul className="mt-3 list-none space-y-3 p-0">
                  {pricedLines.map((line, i) => {
                    const title =
                      getString(line, ["title"]) ||
                      getString(line, ["lineType", "line_type"]) ||
                      "Kalem";
                    const lineType = getString(line, ["lineType", "line_type"]);
                    const qty = getNumber(line, ["quantity"]) ?? 1;
                    const amt = lineAmountTry(line);
                    return (
                      <li
                        key={getString(line, ["id"]) || `${i}-${lineType}-${title}`}
                        className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border-subtle/50 pb-3 last:border-b-0 last:pb-0"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="m-0 text-sm font-medium text-text">{title}</p>
                          {lineType ? (
                            <p className="mt-0.5 font-mono text-xs text-text-muted/90">{lineType}</p>
                          ) : null}
                          <p className="mt-1 text-xs text-text-muted">
                            Miktar: <span className="tabular-nums">{qty}</span>
                          </p>
                        </div>
                        <p className="m-0 shrink-0 text-sm font-semibold tabular-nums text-text">{formatTryAmount(amt)}</p>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            {(getString(customer, ["fullName", "name"]) ||
              getString(customer, ["email"]) ||
              getString(customer, ["phone"])) && (
              <section className="rounded-2xl border border-border-subtle/80 bg-bg-card/70 p-5 shadow-sm sm:p-6">
                <h2 className="m-0 text-sm font-semibold uppercase tracking-wide text-text-muted">İletişim</h2>
                <ul className="mt-3 list-none space-y-1.5 p-0 text-sm text-text">
                  {getString(customer, ["fullName", "name"]) ? (
                    <li>
                      <span className="text-text-muted">Ad: </span>
                      {getString(customer, ["fullName", "name"])}
                    </li>
                  ) : null}
                  {getString(customer, ["email"]) ? (
                    <li>
                      <span className="text-text-muted">E-posta: </span>
                      {getString(customer, ["email"])}
                    </li>
                  ) : null}
                  {getString(customer, ["phone"]) ? (
                    <li>
                      <span className="text-text-muted">Telefon: </span>
                      {getString(customer, ["phone"])}
                    </li>
                  ) : null}
                </ul>
              </section>
            )}

            {note ? (
              <section className="rounded-2xl border border-border-subtle/80 bg-bg-card/70 p-5 shadow-sm sm:p-6">
                <h2 className="m-0 text-sm font-semibold uppercase tracking-wide text-text-muted">Not</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-text">{note}</p>
              </section>
            ) : null}

            {aracHref ? (
              <div className="rounded-xl border border-border-subtle/80 bg-bg-raised/25 px-4 py-3">
                <p className="m-0 text-sm text-text-muted">
                  Bu kayıtla ilişkili araç sayfasına geçmek için:{" "}
                  <Link href={aracHref} className="font-semibold text-accent underline">
                    Araç detayı
                  </Link>
                </p>
              </div>
            ) : null}
          </div>
        )}
      </main>
    </SiteLayout>
  );
}
