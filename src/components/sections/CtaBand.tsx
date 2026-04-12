"use client";

import { motion } from "framer-motion";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { SITE_SUPPORT_PHONE_TEL } from "@/lib/siteContact";
import { Reveal } from "@/components/ui/Reveal";

export function CtaBand() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-20">
      <Reveal y={32}>
        <motion.div
          className="relative overflow-hidden rounded-xl border border-border-subtle bg-bg-card px-6 py-10 text-center sm:px-10 sm:py-12"
          whileHover={{ scale: 1.005 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        >
          <h2 className="text-xl font-semibold tracking-tight text-text sm:text-2xl">
            Hafta sonu veya iş seyahati —{" "}
            <span className="text-accent">aracı birkaç tıkla</span> ayırtın
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-[13px] text-text-muted sm:text-sm">
            Tarih ve lokasyonu seçin; uygun araçları anında listeleyin.
          </p>
          <motion.div
            className="mt-6 flex flex-wrap justify-center gap-2"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <AnimatedButton variant="primary" href="/araclar">
              Müsait araçlar
            </AnimatedButton>
            <AnimatedButton variant="ghost" href={SITE_SUPPORT_PHONE_TEL}>
              Bizi arayın
            </AnimatedButton>
          </motion.div>
        </motion.div>
      </Reveal>
    </section>
  );
}
