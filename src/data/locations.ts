export type PickupLocation = {
  id: string;
  label: string;
  detail: string;
  /** ISO 3166-1 alpha-2 (örn. TR, GR) */
  countryCode: string;
};

export const pickupLocations: PickupLocation[] = [
  {
    id: "ist-airport-ist",
    label: "İstanbul Havalimanı (IST)",
    detail: "Terminal katı, özel karşılama noktası",
    countryCode: "TR",
  },
  {
    id: "ist-sabiha",
    label: "Sabiha Gökçen (SAW)",
    detail: "Araç teslim ofisi — P2 otopark yakını",
    countryCode: "TR",
  },
  {
    id: "ist-nisantasi",
    label: "Nişantaşı ofis",
    detail: "Teşvikiye Caddesi — showroom",
    countryCode: "TR",
  },
  {
    id: "ist-maslak",
    label: "Maslak ofis",
    detail: "Plaza teslimi ve vale seçenekleri",
    countryCode: "TR",
  },
  {
    id: "ath-airport",
    label: "Atina Havalimanı (ATH)",
    detail: "Uluslararası dönüş / Yunanistan teslimi (demo)",
    countryCode: "GR",
  },
  {
    id: "skg-airport",
    label: "Selanik Havalimanı (SKG)",
    detail: "Makedonya yakını teslim noktası (demo)",
    countryCode: "GR",
  },
];

export function getLocationById(id: string): PickupLocation | undefined {
  return pickupLocations.find((l) => l.id === id);
}

export function getFirstLocationByCountryCode(countryCode?: string | null): PickupLocation | undefined {
  if (!countryCode) return undefined;
  const cc = countryCode.trim().toUpperCase();
  return pickupLocations.find((l) => l.countryCode.toUpperCase() === cc);
}
