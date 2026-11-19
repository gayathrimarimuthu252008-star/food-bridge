import { DonationStatus, FoodType, UserRole } from '../../src/shared/types.ts';

export const APP_CONSTANTS = {
  ADMIN_EMAIL: 'admin@foodbridge.org',
  ADMIN_PASSWORD: 'admin123',
  ADMIN_NAME: 'Lakshmi Narayanan',
  CRITICAL_EXPIRY_MINUTES: 60,
  WARNING_EXPIRY_MINUTES: 180,
  EXPIRY_CHECK_INTERVAL_MS: 15_000,
  ALLOCATOR_POLL_INTERVAL_MS: 10_000,
  MAX_THREAD_LOGS: 120,
} as const;

export const ZONE_COORDINATES: Record<string, [number, number]> = {
  'Chennai - T. Nagar': [13.0418, 80.2341],
  'Chennai - Adyar': [13.0012, 80.2565],
  'Chennai - Anna Nagar': [13.085, 80.2101],
  'Chennai - Velachery': [12.9815, 80.218],
  'Coimbatore - RS Puram': [11.0085, 76.9502],
  'Coimbatore - Gandhipuram': [11.0168, 76.9674],
  'Madurai - Meenakshi Temple': [9.9195, 78.1193],
  'Bengaluru - Indiranagar': [12.9784, 77.6408],
  'Bengaluru - Jayanagar': [12.9308, 77.5838],
  'Kochi - Ernakulam': [9.9816, 76.2999],
  'Hyderabad - Banjara Hills': [17.4156, 78.4347],
  'Mysuru - Gokulam': [12.322, 76.6285],
};

export function getAvailableZones(): string[] {
  return Object.keys(ZONE_COORDINATES);
}

export function normalizeZone(zone?: string | null): string {
  if (!zone || !zone.trim()) {
    return 'Chennai - T. Nagar';
  }
  const trimmed = zone.trim();
  const exact = Object.keys(ZONE_COORDINATES).find(
    (k) => k.toLowerCase() === trimmed.toLowerCase(),
  );
  if (exact) return exact;

  const partial = Object.keys(ZONE_COORDINATES).find((k) =>
    k.toLowerCase().includes(trimmed.toLowerCase()),
  );
  return partial ?? 'Chennai - T. Nagar';
}

export function getCoordinatesForZone(zone?: string | null): [number, number] {
  return ZONE_COORDINATES[normalizeZone(zone)];
}

export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.DONOR]: 'Food Donor',
  [UserRole.NGO]: 'NGO',
  [UserRole.VOLUNTEER]: 'Volunteer',
  [UserRole.ADMIN]: 'Admin',
};

export const FOOD_TYPE_LABELS: Record<FoodType, string> = {
  [FoodType.COOKED]: 'Cooked Food',
  [FoodType.PACKAGED]: 'Packaged Food',
  [FoodType.RAW_INGREDIENTS]: 'Raw Ingredients',
};

export const STATUS_META: Record<
  DonationStatus,
  { label: string; color: string; terminal: boolean }
> = {
  [DonationStatus.AVAILABLE]: { label: 'Available', color: '#5E8C5A', terminal: false },
  [DonationStatus.REQUESTED]: { label: 'Requested', color: '#D9A441', terminal: false },
  [DonationStatus.ALLOCATED]: { label: 'Allocated', color: '#4F5D95', terminal: false },
  [DonationStatus.PICKED_UP]: { label: 'Picked Up', color: '#2F6F73', terminal: false },
  [DonationStatus.DELIVERED]: { label: 'Delivered', color: '#5E8C5A', terminal: true },
  [DonationStatus.EXPIRED]: { label: 'Expired', color: '#C8694A', terminal: true },
};
