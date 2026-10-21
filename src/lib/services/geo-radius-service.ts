import { IL_ZIP_COORDINATES } from "../data/il-zip-coordinates";

export const HUB_LOCATION = {
  city: "Lake in the Hills",
  state: "IL",
  zip: "60156",
  lat: 42.1817,
  lng: -88.3287,
  freeRadiusMiles: 30.0,
  maxServiceRadiusMiles: 40.0,
  defaultExtendedFee: 10.0,
} as const;

export interface GeoRadiusResult {
  distanceMiles: number;
  isServiceable: boolean;
  isFreeDelivery: boolean;
  isExtendedArea: boolean;
  deliveryFee: number;
  city?: string;
  message: string;
}

export function haversineDistanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Calculates delivery distance, serviceability (<= 40 miles), and delivery fees (Free for <= 30 miles, $10 for 30-40 miles).
 */
export function calculateDeliveryRadius(
  zipOrAddress?: string,
  cityHint?: string,
  customExtendedFee?: number
): GeoRadiusResult {
  const extendedFee = typeof customExtendedFee === "number" && customExtendedFee >= 0
    ? customExtendedFee
    : HUB_LOCATION.defaultExtendedFee;

  const raw = (zipOrAddress || "").trim();
  const zipMatch = raw.match(/\b\d{5}\b/);
  const zip = zipMatch ? zipMatch[0] : "";

  // 1. Instant accurate lookup from regional coordinate centroid table
  if (zip && IL_ZIP_COORDINATES[zip]) {
    const [lat, lng, cityName] = IL_ZIP_COORDINATES[zip];
    const distanceMiles = haversineDistanceMiles(HUB_LOCATION.lat, HUB_LOCATION.lng, lat, lng);
    return buildResult(distanceMiles, extendedFee, cityName || cityHint);
  }

  // 2. City name direct lookup from regional table
  if (cityHint) {
    const cleanCity = cityHint.trim().toLowerCase();
    const match = Object.values(IL_ZIP_COORDINATES).find(([, , c]) => c.toLowerCase() === cleanCity);
    if (match) {
      const distanceMiles = haversineDistanceMiles(HUB_LOCATION.lat, HUB_LOCATION.lng, match[0], match[1]);
      return buildResult(distanceMiles, extendedFee, match[2]);
    }
  }

  // 3. Fallback for unlisted/pending input: If no ZIP or blank, assume local hub default
  if (!zip) {
    return {
      distanceMiles: 0,
      isServiceable: true,
      isFreeDelivery: true,
      isExtendedArea: false,
      deliveryFee: 0,
      message: "Within 30-mile standard zone • Free Delivery ($0.00)",
    };
  }

  // 4. Fallback for external ZIP codes (non-Illinois or far outside)
  const isIllinois = zip.startsWith("60") || zip.startsWith("61");
  const fallbackDistance = isIllinois ? 42.0 : 75.0; // Assume outside service range if unknown IL or out of state
  return buildResult(fallbackDistance, extendedFee, cityHint);
}

function buildResult(distanceMiles: number, extendedFee: number, city?: string): GeoRadiusResult {
  const isServiceable = distanceMiles <= HUB_LOCATION.maxServiceRadiusMiles;
  const isFreeDelivery = distanceMiles <= HUB_LOCATION.freeRadiusMiles;
  const isExtendedArea = distanceMiles > HUB_LOCATION.freeRadiusMiles && distanceMiles <= HUB_LOCATION.maxServiceRadiusMiles;
  const deliveryFee = isFreeDelivery ? 0 : isExtendedArea ? extendedFee : 0;

  let message = "";
  if (isFreeDelivery) {
    message = `Within 30-mile standard zone (${distanceMiles} mi) • Free Delivery ($0.00)`;
  } else if (isExtendedArea) {
    message = `Extended area (${distanceMiles} mi from hub) • $${extendedFee.toFixed(2)} Delivery Fee applies`;
  } else {
    message = `Outside 40-mile service radius (~${distanceMiles} mi away). Doorstep service is only available within 40 miles of Lake in the Hills, IL.`;
  }

  return {
    distanceMiles,
    isServiceable,
    isFreeDelivery,
    isExtendedArea,
    deliveryFee,
    city,
    message,
  };
}

export interface ServiceableCityItem {
  city: string;
  defaultZip: string;
  distanceMiles: number;
  isExtended: boolean;
  deliveryFee: number;
}

export function getServiceableCities(extendedFee: number = HUB_LOCATION.defaultExtendedFee): ServiceableCityItem[] {
  const map = new Map<string, ServiceableCityItem>();
  for (const [zip, [lat, lng, city]] of Object.entries(IL_ZIP_COORDINATES)) {
    const dist = haversineDistanceMiles(HUB_LOCATION.lat, HUB_LOCATION.lng, lat, lng);
    if (dist <= HUB_LOCATION.maxServiceRadiusMiles) {
      const isExt = dist > HUB_LOCATION.freeRadiusMiles;
      const fee = isExt ? extendedFee : 0;
      const existing = map.get(city);
      if (!existing || dist < existing.distanceMiles) {
        map.set(city, { city, defaultZip: zip, distanceMiles: dist, isExtended: isExt, deliveryFee: fee });
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => a.city.localeCompare(b.city));
}

export const SERVICEABLE_CITIES: ServiceableCityItem[] = getServiceableCities();

export function getDefaultZipForCity(cityName: string): string {
  const clean = (cityName || "").trim().toLowerCase();
  if (!clean) return "";
  const found = SERVICEABLE_CITIES.find((c) => c.city.toLowerCase() === clean);
  return found ? found.defaultZip : "";
}

export function getCityForZip(zipCode: string): string {
  const clean = (zipCode || "").trim().slice(0, 5);
  return IL_ZIP_COORDINATES[clean] ? IL_ZIP_COORDINATES[clean][2] : "";
}

