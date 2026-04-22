import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted px-4">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold text-foreground">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Sayfa bulunamadı</p>
        <Link href="/" className="font-semibold text-primary underline-offset-4 hover:underline">
          Ana sayfaya dön
        </Link>
      </div>
    </div>
  );
}
