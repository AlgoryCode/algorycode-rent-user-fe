import { PhoneOutlineIcon, WhatsAppBrandIcon } from "@/components/ui/Icons";
import {
  SITE_SUPPORT_PHONE_DISPLAY,
  SITE_SUPPORT_PHONE_TEL,
  SITE_SUPPORT_WHATSAPP_URL,
} from "@/lib/siteContact";

export function ReservationCalendarSupportAside({ className = "" }: { className?: string }) {
  return (
    <aside
      className={`flex min-h-0 flex-col justify-center rounded-2xl border border-border-subtle/80 bg-bg-card/55 p-4 shadow-sm backdrop-blur-sm sm:p-5 ${className}`}
    >
      <h3 className="text-base font-semibold leading-snug tracking-tight text-text sm:text-lg">
        Rezervasyonla ilgili sorunuz mu var?
      </h3>
      <p className="mt-1 text-sm font-semibold text-accent">Bize ulaşın</p>
      <p className="mt-2 text-[13px] leading-relaxed text-text-muted">
        WhatsApp veya telefon üzerinden bu kanallardan bize ulaşabilirsiniz.
      </p>
      <ul className="mt-4 space-y-2">
        <li>
          <a
            href={SITE_SUPPORT_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-sm border border-border-subtle bg-bg-raised/40 px-3 py-2.5 text-sm font-medium text-text transition-colors hover:border-accent/40 hover:bg-accent/5"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#25D366]/15 text-[#25D366]">
              <WhatsAppBrandIcon className="size-6" />
            </span>
            <span className="min-w-0">
              <span className="block text-text">WhatsApp</span>
              <span className="text-xs font-normal text-text-muted">Mesaj gönderin</span>
            </span>
          </a>
        </li>
        <li>
          <a
            href={SITE_SUPPORT_PHONE_TEL}
            className="flex items-center gap-3 rounded-xl border border-border-subtle bg-bg-raised/40 px-3 py-2.5 text-sm font-medium text-text transition-colors hover:border-accent/35 hover:bg-accent/5"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <PhoneOutlineIcon className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-text">Telefon</span>
              <span className="text-xs font-normal tabular-nums text-text-muted">
                {SITE_SUPPORT_PHONE_DISPLAY}
              </span>
            </span>
          </a>
        </li>
      </ul>
    </aside>
  );
}
