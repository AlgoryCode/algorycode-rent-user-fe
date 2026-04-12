export type BookingExtra = {
  id: string;
  name: string;
  description: string;
  /** Günlük ücret (varsa) */
  perDay?: number;
  /** Tek seferlik sabit ücret (varsa) */
  flat?: number;
};

export const bookingExtras: BookingExtra[] = [
  {
    id: "gps",
    name: "Premium navigasyon & hotspot",
    description: "Sınırsız veri ve güncel trafik uyarıları",
    perDay: 250,
  },
  {
    id: "child-seat",
    name: "Çocuk koltuğu (9–36 kg)",
    description: "ISOFIX montajı, dezenfekte edilmiş",
    flat: 450,
  },
  {
    id: "extra-driver",
    name: "Ek sürücü",
    description: "Sözleşmeye ikinci sürücü eklenir, kimlik doğrulama dahil",
    flat: 1200,
  },
  {
    id: "km-unlimited",
    name: "Sınırsız km garantisi",
    description: "Günlük limit aşımı endişesi olmadan sürüş",
    perDay: 650,
  },
  {
    id: "delivery",
    name: "Adrese teslim (şehir içi)",
    description: "Tek yön — adresinize teslim veya iade",
    flat: 1200,
  },
];

export function getExtraById(id: string): BookingExtra | undefined {
  return bookingExtras.find((e) => e.id === id);
}
