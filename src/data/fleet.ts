export type Transmission = "otomatik" | "manuel";
export type FuelType = "benzin" | "dizel" | "hibrit" | "elektrik";

export type FleetVehicle = {
  id: string;
  name: string;
  brand: string;
  category: string;
  pricePerDay: number;
  specs: string[];
  transmission: Transmission;
  seats: number;
  fuel: FuelType;
  year: number;
  engine: string;
  powerKw: number;
  luggage: number;
  co2: string;
  image: string;
  gallery: string[];
  imageAlt: string;
  badge?: string;
  description: string;
  highlights: string[];
  included: string[];
  notIncluded: string[];
  /** Yaklaşık depozito (gösterim için) */
  depositHint: number;
  /** Filoda araç konumu (demo metin) */
  garageLocation?: string;
  /** Başlangıç kiralama konumu */
  pickupLocationId?: string;
  pickupLocationLabel?: string;
};

export const fleet: FleetVehicle[] = [
  {
    id: "1",
    brand: "Mercedes-Benz",
    name: "Mercedes-AMG GT",
    category: "Grand Tourer",
    pricePerDay: 8900,
    specs: ["V8 Biturbo", "Otomatik", "2 kişi"],
    transmission: "otomatik",
    seats: 2,
    fuel: "benzin",
    year: 2023,
    engine: "4.0L V8 Biturbo",
    powerKw: 350,
    luggage: 350,
    co2: "219 g/km",
    image:
      "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=1200&q=80",
      "https://images.unsplash.com/photo-1614200187524-7d9a7f27c4b2?w=1200&q=80",
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&q=80",
    ],
    imageAlt: "Mercedes-AMG GT dış görünüm",
    badge: "Öne çıkan",
    description:
      "AMG mühendisliği ile harmanlanan GT silüeti; uzun yol ve şehir içinde dengeli sürüş karakteri. Filomuzdaki bakım ve lastik kayıtları dijital olarak paylaşılır.",
    highlights: [
      "AMG Ride Control süspansiyon",
      "Burmester ses sistemi",
      "360° görüş ve park paketi",
    ],
    included: [
      "Kasko + ferdi kaza sigortası",
      "Sınırsız km (standart paket)",
      "7/24 yol yardımı",
      "İç / dış detaylı temizlik",
    ],
    notIncluded: [
      "Yakıt masrafı",
      "Köprü ve otoyol geçişleri",
      "Yurt dışı çıkışı (izin gerektirir)",
    ],
    depositHint: 25000,
    garageLocation:
      "İstanbul, Maslak — Hazırlık noktası A · Filo garajı (demo). Araç bu noktadan veya anlaşmalı ofisten teslim edilir.",
    pickupLocationId: "ist-maslak",
    pickupLocationLabel: "Maslak ofis",
  },
  {
    id: "2",
    brand: "Porsche",
    name: "911 Carrera",
    category: "Spor",
    pricePerDay: 12400,
    specs: ["Flat-6", "PDK", "4 kişi"],
    transmission: "otomatik",
    seats: 4,
    fuel: "benzin",
    year: 2024,
    engine: "3.0L Twin-Turbo Flat-6",
    powerKw: 283,
    luggage: 264,
    co2: "206 g/km",
    image:
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&q=80",
      "https://images.unsplash.com/photo-1614162692292-7ef56ecdd2bf?w=1200&q=80",
      "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=1200&q=80",
    ],
    imageAlt: "Porsche 911 Carrera",
    description:
      "İkonik silüet ve günlük kullanılabilirlik bir arada. PDK şanzıman ile trafikte konfor, açık yolda dinamik sürüş.",
    highlights: ["Sport Chrono paketi", "PCCM Plus navigasyon", "PASM aktif süspansiyon"],
    included: [
      "Tam kasko",
      "Günlük 400 km’ye kadar ücretsiz km",
      "Concierge hattı",
    ],
    notIncluded: ["Track kullanımı", "Yarış lastiği talepleri"],
    depositHint: 35000,
    garageLocation:
      "İstanbul, Maslak — Hazırlık noktası B · Kapalı otopark (demo). Teslim öncesi kontrol tamamlanır.",
    pickupLocationId: "ist-airport-ist",
    pickupLocationLabel: "İstanbul Havalimanı (IST)",
  },
  {
    id: "3",
    brand: "BMW",
    name: "M4 Competition",
    category: "Performans",
    pricePerDay: 7200,
    specs: ["I-6 Twin Turbo", "Manuel 6 ileri", "4 kişi"],
    transmission: "manuel",
    seats: 4,
    fuel: "benzin",
    year: 2023,
    engine: "3.0L I-6 Twin Turbo",
    powerKw: 375,
    luggage: 440,
    co2: "213 g/km",
    image:
      "https://images.unsplash.com/photo-1632245889029-d0e4c3a1d5d4?w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1632245889029-d0e4c3a1d5d4?w=1200&q=80",
      "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=1200&q=80",
      "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=1200&q=80",
    ],
    imageAlt: "BMW M4 Competition",
    description:
      "M xDrive ve Competition ayarı ile keskin viraj tepkileri. İş seyahati ve hafta sonu kaçamakları için ideal performans dengesi.",
    highlights: ["M spor diferansiyel", "Harman Kardon", "Laserlight farlar"],
    included: ["Kasko", "Standart km paketi", "Mobil check-in"],
    notIncluded: ["Ek sürücü (ücretli seçenek)"],
    depositHint: 18000,
    garageLocation:
      "İstanbul, Maslak — Hazırlık noktası A (demo). Performans filosu ile aynı hat üzerinde.",
    pickupLocationId: "ist-sabiha",
    pickupLocationLabel: "Sabiha Gökçen (SAW)",
  },
  {
    id: "4",
    brand: "Land Rover",
    name: "Range Rover Autobiography",
    category: "SUV",
    pricePerDay: 9800,
    specs: ["P530 Mild Hybrid", "8 ileri", "5 kişi"],
    transmission: "otomatik",
    seats: 5,
    fuel: "hibrit",
    year: 2024,
    engine: "4.4L V8 Mild Hybrid",
    powerKw: 390,
    luggage: 725,
    co2: "248 g/km",
    image:
      "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=1200&q=80",
      "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=1200&q=80",
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=1200&q=80",
    ],
    imageAlt: "Range Rover SUV",
    badge: "Aile",
    description:
      "Geniş iç hacim, hava süspansiyonu ve üst düzey konfor. Havalimanı karşılama ve bagaj desteği ile aile ve VIP transferlerine uygundur.",
    highlights: ["Meridian imza ses", "Executive koltuklar", "All Terrain Progress Control"],
    included: ["Tam sigorta paketi", "Havalimanı teslim seçeneği", "7/24 destek"],
    notIncluded: ["Off-road parkur kullanımı"],
    depositHint: 28000,
    garageLocation:
      "İstanbul, Maslak — SUV hazırlık alanı (demo). Geniş araçlar için ayrı yükleme rampası.",
    pickupLocationId: "ist-nisantasi",
    pickupLocationLabel: "Nişantaşı ofis",
  },
  {
    id: "5",
    brand: "Tesla",
    name: "Model S Plaid",
    category: "Elektrik",
    pricePerDay: 6500,
    specs: ["Üç motor", "Otomatik", "5 kişi"],
    transmission: "otomatik",
    seats: 5,
    fuel: "elektrik",
    year: 2024,
    engine: "Tri Motor AWD",
    powerKw: 760,
    luggage: 745,
    co2: "0 g/km (kullanım)",
    image:
      "https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=1200&q=80",
      "https://images.unsplash.com/photo-1617704548623-29b0488daa42?w=1200&q=80",
      "https://images.unsplash.com/photo-1617788138017-80ad40651399?w=1200&q=80",
    ],
    imageAlt: "Tesla Model S",
    description:
      "Sessiz ve güçlü sürüş, OTA güncellemeleri ve geniş bagaj. Şehir içi ve uzun mesafe için düşük işletme maliyeti.",
    highlights: ["Autopilot (temel)", "17\" eğimli ekran", "HEPA filtre"],
    included: ["Şarj adaptörü", "Tam kasko", "Mobil uygulama erişimi"],
    notIncluded: ["Supercharger ücretleri (fişe yansır)"],
    depositHint: 15000,
    garageLocation:
      "İstanbul, Maslak — Elektrikli filo istasyonu (demo). Şarj seviyesi teslim öncesi raporlanır.",
    pickupLocationId: "ist-maslak",
    pickupLocationLabel: "Maslak ofis",
  },
  {
    id: "6",
    brand: "Audi",
    name: "A8 L 55 TFSI",
    category: "Sedan",
    pricePerDay: 8200,
    specs: ["V6 Mild Hybrid", "Tiptronic", "4 kişi"],
    transmission: "otomatik",
    seats: 4,
    fuel: "hibrit",
    year: 2023,
    engine: "3.0L V6 Mild Hybrid",
    powerKw: 250,
    luggage: 505,
    co2: "178 g/km",
    image:
      "https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=1200&q=80",
      "https://images.unsplash.com/photo-1614200187524-7d9a7f27c4b2?w=1200&q=80",
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1200&q=80",
    ],
    imageAlt: "Audi A8 sedan",
    description:
      "Arka koltuk masajı ve B&O 3D ses ile iş odaklı uzun yolculuklar için premium sedan. Şoförlü kullanım taleplerine uygundur.",
    highlights: ["Predictive active suspension", "HD Matrix LED", "4 bölge klima"],
    included: ["Kasko", "Concierge rezervasyon desteği", "Ofis içi teslim"],
    notIncluded: ["Şoför hizmeti (ayrı paket)"],
    depositHint: 22000,
    garageLocation:
      "İstanbul, Maslak — VIP hazırlık holü (demo). İç detay ve kokpit son kontrol burada yapılır.",
    pickupLocationId: "ist-airport-ist",
    pickupLocationLabel: "İstanbul Havalimanı (IST)",
  },
];

export function formatTry(n: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Liste / özet satırları için ondalıklı TL metni (örn. 5.257,75 TL) */
export function formatTryDecimal(n: number) {
  return `${new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)} TL`;
}

export function getVehicleById(id: string): FleetVehicle | undefined {
  return fleet.find((v) => v.id === id);
}

export function getFleetCategories(): string[] {
  return [...new Set(fleet.map((v) => v.category))].sort();
}

export function getPriceBounds(): { min: number; max: number } {
  const prices = fleet.map((v) => v.pricePerDay);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}
