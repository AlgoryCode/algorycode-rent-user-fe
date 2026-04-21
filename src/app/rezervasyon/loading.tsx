export default function RezervasyonLoading() {
  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center gap-4 px-5 pb-20 pt-[calc(var(--header-h)+2rem)]">
      <div
        className="size-10 animate-spin rounded-full border-2 border-accent/25 border-t-accent"
        aria-hidden
      />
      <p className="text-sm font-medium text-text-muted">Rezervasyon hazırlanıyor…</p>
      <p className="max-w-sm text-center text-xs text-text-muted/90">
        Araç ve tarih bilgisi yükleniyor; birkaç saniye sürebilir.
      </p>
    </div>
  );
}
