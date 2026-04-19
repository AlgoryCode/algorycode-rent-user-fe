"use client";

import { useEffect, useState } from "react";
import { vehicleBlockedDates, blockedSetForVehicle } from "@/data/availability";
import { toIsoDate } from "@/lib/dates";
import { fetchVehicleCalendarOccupancyFromRentApi } from "@/lib/rentApi";
import { blockedIsoDateSetFromOccupancyRanges } from "@/lib/rentalBlockedIsoDates";

const DEMO_VEHICLE_IDS = new Set(Object.keys(vehicleBlockedDates));

function addMonths(d: Date, months: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + months);
  return x;
}

export type VehicleBlockedIsoDatesState = {
  blocked: Set<string>;
  /** Gerçek araç UUID’si için sunucudan doluluk çekilirken true */
  loading: boolean;
};

/**
 * Takvimde kullanılacak YYYY-MM-DD dolu günler: demo araçlar yerel veri, gerçek araçlar
 * `GET /vehicles/{id}/calendar/occupancy` (kiralama + onaylı/bekleyen talep; her aralıkta başlangıç ve bitiş günü dahil).
 */
export function useVehicleBlockedIsoDates(vehicleId: string | null | undefined): VehicleBlockedIsoDatesState {
  const [blocked, setBlocked] = useState<Set<string>>(() => blockedSetForVehicle(vehicleId ?? null));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const id = vehicleId?.trim() ?? "";
    let cancelled = false;

    if (!id) {
      queueMicrotask(() => {
        if (cancelled) return;
        setLoading(false);
        setBlocked(blockedSetForVehicle(null));
      });
      return () => {
        cancelled = true;
      };
    }
    if (DEMO_VEHICLE_IDS.has(id)) {
      queueMicrotask(() => {
        if (cancelled) return;
        setLoading(false);
        setBlocked(blockedSetForVehicle(id));
      });
      return () => {
        cancelled = true;
      };
    }

    const startDate = toIsoDate(addMonths(new Date(), -6));
    const endDate = toIsoDate(addMonths(new Date(), 24));

    queueMicrotask(() => {
      if (cancelled) return;
      setLoading(true);
      setBlocked(new Set());
    });

    void fetchVehicleCalendarOccupancyFromRentApi(id, startDate, endDate)
      .then((dto) => {
        if (cancelled) return;
        setBlocked(blockedIsoDateSetFromOccupancyRanges(dto.ranges ?? []));
      })
      .catch(() => {
        if (!cancelled) setBlocked(new Set());
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [vehicleId]);

  return { blocked, loading };
}
