import type { Vehicle } from '../types';

/** Build a display URL for a vehicle photo (Supabase public URL or local uploads path). */
export function vehiclePhotoSrc(
  vehicle: Pick<Vehicle, 'photoPath' | 'photoUrl'>
): string | null {
  if (vehicle.photoUrl) return vehicle.photoUrl;
  if (!vehicle.photoPath) return null;
  const segments = vehicle.photoPath.split('/').map((segment) => encodeURIComponent(segment));
  return `/uploads/vehicles/${segments.join('/')}`;
}

/** Photo URL for a publicly shared vehicle (resolved URL or token-gated API path). */
export function publicVehiclePhotoSrc(
  vehicle: Pick<import('../types').PublicVehicle, 'photoUrl' | 'hasPhoto'>,
  token: string
): string | null {
  if (vehicle.photoUrl) return vehicle.photoUrl;
  if (vehicle.hasPhoto) return `/api/public/history/${encodeURIComponent(token)}/photo`;
  return null;
}
