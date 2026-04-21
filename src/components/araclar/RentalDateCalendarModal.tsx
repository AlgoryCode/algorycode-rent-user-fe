"use client";

import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { HeroRentalRangeDatePickers } from "@/components/ui/HeroRentalRangeDatePickers";
import { useVehicleBlockedIsoDates } from "@/hooks/useVehicleBlockedIsoDates";
import { compareIso } from "@/lib/calendarGrid";
import { addDays, todayIso, toIsoDate } from "@/lib/dates";

type Props = {
  open: boolean;
  onClose: () => void;
  pickup: string;
  returnDate: string;
  onApply: (pickup: string, ret: string) => void;
  vehicleId?: string | null;
};

export function RentalDateCalendarModal({
  open,
  onClose,
  pickup,
  returnDate,
  onApply,
  vehicleId,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const { blocked, loading: blockedLoading } = useVehicleBlockedIsoDates(vehicleId ?? null);
  const maxIso = useMemo(() => toIsoDate(addDays(new Date(), 365)), []);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[500] flex items-end justify-center sm:items-center sm:p-4">
          <motion.button
            type="button"
            aria-label="Kapat"
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal
            aria-labelledby="rent-cal-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-[501] flex max-h-[min(92dvh,720px)] w-full max-w-[min(100%,920px)] flex-col overflow-hidden rounded-t-[1.35rem] border border-border-subtle/35 bg-bg-card/[0.92] shadow-[0_28px_64px_-22px_rgba(15,23,42,0.22)] backdrop-blur-2xl ring-1 ring-inset ring-black/[0.04] sm:max-h-[90vh] sm:rounded-3xl"
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border-subtle/70 px-4 py-3">
              <h2 id="rent-cal-title" className="text-lg font-semibold tracking-tight text-text">
                Tarih seçimi
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-text-muted transition-colors hover:bg-bg-raised hover:text-text"
              >
                Kapat
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-4 sm:py-4">
              <HeroRentalRangeDatePickers
                layout="inline"
                inlineFramed={false}
                hideInlineTitle
                hideTimeSelects
                className="w-full"
                minDate={todayIso()}
                maxDate={maxIso}
                pickupDate={pickup}
                returnDate={returnDate}
                blockedDates={blocked}
                blockedDatesLoading={blockedLoading}
                onValidateRange={(p, r) =>
                  compareIso(r, p) <= 0 ? "Teslim günü alıştan en az 1 gün sonra olmalı." : null
                }
                onRangeCommit={(p, r) => {
                  onApply(p, r);
                  onClose();
                }}
                pickTime="10:00"
                returnTime="10:00"
                onPickTime={() => {}}
                onReturnTime={() => {}}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
