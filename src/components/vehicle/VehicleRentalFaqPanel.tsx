const faqItems: { q: string; a: string }[] = [
  {
    q: "Kiralama ve sürücü koşulları nelerdir?",
    a: "Geçerli ehliyet, kimlik ve kredi kartı gereklidir. Minimum yaş ve ehliyet süresi araç sınıfına göre değişebilir; rezervasyon onayında netleşir (demo akış).",
  },
  {
    q: "Yakıt ve kilometre politikası nedir?",
    a: "Araç alıştaki yakıt seviyesi ile aynı seviyede iade edilir. Günlük km kotası ve aşım ücreti sözleşmede belirtilir (demo veride sabit örnek metin).",
  },
  {
    q: "İptal veya tarih değişikliği yapabilir miyim?",
    a: "Ücretsiz iptal penceresi ve değişiklik kuralları seçilen pakete ve tarihe göre değişir. Ödeme öncesi özet ekranında koşullar gösterilir.",
  },
  {
    q: "Alış ve teslim saatleri nasıl işler?",
    a: "Standart alış/teslim günleri takvimde seçtiğiniz aralığa göre hesaplanır. Havalimanı veya ofis noktalarında saat penceresi bir sonraki adımda seçilir.",
  },
  {
    q: "Depozito ve hasar süreci nedir?",
    a: "Ön provizyon / depozito kartınızda bloke edilebilir; iade hasarsız teslimde çözülür. Detaylar dijital sözleşmede yer alır (demo).",
  },
];

export function VehicleRentalFaqPanel({ className = "" }: { className?: string }) {
  return (
    <section
      id="arac-sss"
      aria-labelledby="arac-sss-baslik"
      className={`scroll-mt-28 rounded-xl border border-border-subtle bg-bg-card/40 px-3 py-3 shadow-sm sm:px-3.5 sm:py-3.5 ${className}`}
    >
      <h2
        id="arac-sss-baslik"
        className="font-display text-sm font-semibold tracking-tight text-text sm:text-base"
      >
        Sıkça sorulan sorular
      </h2>
      <p className="mt-1 text-[11px] leading-snug text-text-muted sm:text-[12px]">
        Kiralama ve araç kullanımına dair özet bilgiler. Kesin koşullar rezervasyon özeti ve sözleşmede
        yer alır.
      </p>
      <div className="mt-2.5 space-y-1 sm:mt-3">
        {faqItems.map((item) => (
          <details
            key={item.q}
            className="group rounded-lg border border-border-subtle/70 bg-bg-raised/30 open:border-border-subtle open:bg-bg-raised/45"
          >
            <summary className="cursor-pointer list-none px-2.5 py-2 text-[12px] font-medium leading-snug text-text sm:px-3 sm:py-2.5 sm:text-[13px] [&::-webkit-details-marker]:hidden">
              <span className="flex items-start justify-between gap-2">
                <span className="min-w-0">{item.q}</span>
                <span className="shrink-0 text-[10px] font-normal text-text-muted group-open:hidden">+</span>
                <span className="hidden shrink-0 text-[10px] font-normal text-text-muted group-open:inline">−</span>
              </span>
            </summary>
            <p className="border-t border-border-subtle/50 px-2.5 pb-2.5 pt-1.5 text-[11px] leading-relaxed text-text-muted sm:px-3 sm:pb-3 sm:pt-2 sm:text-[12px]">
              {item.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
