"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    q: "Araç kiralamak için hangi belgeler gerekli?",
    a: "Türkiye'de geçerli bir ehliyet (en az 1 yıllık), kimlik veya pasaport ve kredi kartı yeterli. Yabancı misafirlerimiz uluslararası ehliyet kullanabilir.",
  },
  {
    q: "Minimum kiralama yaşı kaç?",
    a: "Minimum 21 yaşında olmanız ve en az 1 yıllık ehliyetinizin bulunması gerekir. Bazı premium araçlar için yaş sınırı 25 olabilir.",
  },
  {
    q: "Rezervasyonumu ücretsiz iptal edebilir miyim?",
    a: "Evet, rezervasyonunuzu alış tarihinden 48 saat öncesine kadar herhangi bir ücret ödemeden iptal edebilirsiniz.",
  },
  {
    q: "Aracı farklı bir şehirde teslim edebilir miyim?",
    a: "Tek yön kiralama mümkündür. Şehirler arası teslimatta küçük bir hizmet bedeli uygulanabilir. Detayları arama sırasında görebilirsiniz.",
  },
  {
    q: "Kasko ve sigorta dahil mi?",
    a: "Tüm araçlarımız zorunlu trafik sigortası ve tam kasko ile sunulur. İsteğe bağlı süper kasko paketi ile muafiyetinizi sıfırlayabilirsiniz.",
  },
  {
    q: "Yakıt politikası nasıl işliyor?",
    a: "Aracı aldığınız yakıt seviyesinde teslim etmeniz beklenir. Tam-tam politikası uygulanır; eksik yakıt teslim edilmesi durumunda fark faturalandırılır.",
  },
];

export function QuestFaq() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section id="sss" className="container mx-auto px-4 py-16 lg:py-24">
      <div className="grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-16">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-primary">Yardım merkezi</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            Sıkça Sorulan
            <br />
            Sorular
          </h2>
          <p className="mt-4 text-muted-foreground">
            Aklındaki her şeyin cevabı burada. Bulamadıysan{" "}
            <a href="#iletisim" className="font-semibold text-primary underline-offset-4 hover:underline">
              bize ulaş
            </a>
            .
          </p>
        </div>

        <div className="space-y-3">
          {FAQS.map((item, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={item.q}
                className={cn(
                  "rounded-2xl border bg-card transition-all duration-300 ease-smooth",
                  isOpen ? "border-primary/40 shadow-[var(--shadow-card)]" : "border-border/60 hover:border-border",
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="text-base font-bold text-foreground md:text-lg">{item.q}</span>
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-300",
                      isOpen ? "rotate-180 bg-primary text-primary-foreground" : "bg-muted text-foreground",
                    )}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </span>
                </button>
                <div
                  className={cn(
                    "grid transition-all duration-500 ease-smooth",
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 leading-relaxed text-muted-foreground">{item.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
