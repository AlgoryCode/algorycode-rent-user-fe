import { DocumentTextOutlineIcon } from "@/components/ui/Icons";

export function VehicleRentalConditionsCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-border-subtle/80 bg-bg-card/55 p-4 shadow-sm backdrop-blur-sm sm:p-5 ${className}`}
    >
      <h3 className="text-base font-semibold tracking-tight text-text sm:text-lg">
        Kiralama koşulları
      </h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-text-muted">
        Ehliyet, yaş, yakıt ve iptal gibi özet bilgiler aşağıdaki SSS bölümünde yer alır.
      </p>
      <a
        href="#arac-sss"
        className="mt-3 flex items-center gap-3 rounded-xl border border-border-subtle bg-bg-raised/40 px-3 py-2.5 text-sm font-medium text-text transition-colors hover:border-accent/35 hover:bg-accent/5"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <DocumentTextOutlineIcon className="size-5" />
        </span>
        <span className="min-w-0">
          <span className="block text-text">Koşullara göz at</span>
          <span className="text-xs font-normal text-text-muted">Sıkça sorulan sorular</span>
        </span>
      </a>
    </div>
  );
}
