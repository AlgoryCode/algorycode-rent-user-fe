import { SiteLayout } from "@/components/layout/SiteLayout";

export default function OdemelerPage() {
  return (
    <SiteLayout>
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-28 sm:px-6">
        <h1 className="text-2xl font-semibold text-text">Ödemeler</h1>
        <p className="mt-2 text-sm text-text-muted">
          Bu sayfa yalnızca <strong className="font-medium text-text">RENT_MANAGER</strong> ve{" "}
          <strong className="font-medium text-text">RENT_ADMIN</strong> rolleri için açıktır. Ödeme listesi ve
          işlemler burada toplanabilir.
        </p>
      </main>
    </SiteLayout>
  );
}
