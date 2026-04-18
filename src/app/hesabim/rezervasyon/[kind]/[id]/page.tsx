import { notFound } from "next/navigation";
import { RentalDetailView } from "@/components/account/RentalDetailView";

type Kind = "rental" | "request";

function isKind(v: string): v is Kind {
  return v === "rental" || v === "request";
}

type Props = {
  params: Promise<{ kind: string; id: string }>;
};

export default async function HesabimRezervasyonDetayPage({ params }: Props) {
  const { kind, id } = await params;
  if (!isKind(kind) || !id?.trim()) notFound();

  return <RentalDetailView kind={kind} id={id.trim()} />;
}
