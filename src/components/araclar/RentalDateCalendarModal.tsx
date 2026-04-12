"use client";

import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { RentalAvailabilityCalendarPanel } from "@/components/calendar/RentalAvailabilityCalendarPanel";

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
            className="relative z-[501] flex max-h-[min(92dvh,720px)] w-full max-w-[440px] flex-col overflow-hidden rounded-t-[1.35rem] border border-border-subtle/35 bg-bg-card/[0.92] shadow-[0_28px_64px_-22px_rgba(15,23,42,0.22)] backdrop-blur-2xl ring-1 ring-inset ring-black/[0.04] dark:bg-bg-card/[0.88] dark:shadow-[0_28px_64px_-20px_rgba(0,0,0,0.5)] dark:ring-white/[0.06] sm:max-h-[90vh] sm:rounded-3xl"
          >
            <RentalAvailabilityCalendarPanel
              headingId="rent-cal-title"
              vehicleId={vehicleId}
              pickup={pickup}
              returnDate={returnDate}
              syncToken={`${pickup}-${returnDate}`}
              footerMode="modal"
              onCommit={(p, r) => {
                onApply(p, r);
                onClose();
              }}
              onCancel={onClose}
              title="Tarih seçimi"
              subtitle="Dolu günler seçilemez. Aralıkta önce alış, sonra teslim gününe tıklayın."
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
