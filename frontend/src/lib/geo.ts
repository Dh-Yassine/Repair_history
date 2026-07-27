export interface LatLng {
  lat: number;
  lng: number;
}

const geocodeCache = new Map<string, LatLng | null>();

/** Great-circle distance in kilometres */
export function distanceKm(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function formatDistanceKm(km: number): string {
  if (km < 1) return '< 1 km';
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

/** Free geocoding (OpenStreetMap). Results are cached for the session. */
export async function geocodeAddress(address: string): Promise<LatLng | null> {
  const key = address.trim().toLowerCase();
  if (!key) return null;
  if (geocodeCache.has(key)) return geocodeCache.get(key) ?? null;

  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('format', 'json');
    url.searchParams.set('q', address.trim());
    url.searchParams.set('limit', '1');

    const res = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'fr,en',
        'User-Agent': 'AutoHistory/1.0 (repair-history app)',
      },
    });
    if (!res.ok) {
      geocodeCache.set(key, null);
      return null;
    }
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    const hit = data[0];
    const coords = hit ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null;
    geocodeCache.set(key, coords);
    return coords;
  } catch {
    geocodeCache.set(key, null);
    return null;
  }
}

export function mapsSearchUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function mapsDirectionsUrl(origin: LatLng, destination: string | LatLng) {
  const dest =
    typeof destination === 'string'
      ? encodeURIComponent(destination)
      : `${destination.lat},${destination.lng}`;
  const o = `${origin.lat},${origin.lng}`;
  return `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${dest}`;
}

export function mapsNearbyRepairsUrl(origin: LatLng | null, query = 'car repair') {
  const q = encodeURIComponent(query);
  if (origin) {
    return `https://www.google.com/maps/search/${q}/@${origin.lat},${origin.lng},14z`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

/**
 * Embed map for a repair search (no API key).
 * When `pinToOrigin` is true, center on the user; otherwise let Google center on the query
 * (needed when the user typed a city — otherwise `ll` keeps the map on the old GPS area).
 */
export function mapsNearbyRepairsEmbedUrl(
  query = 'car repair',
  origin?: LatLng | null,
  pinToOrigin = false
) {
  const q = encodeURIComponent(query);
  if (pinToOrigin && origin) {
    return `https://maps.google.com/maps?q=${q}&ll=${origin.lat},${origin.lng}&z=14&output=embed`;
  }
  return `https://maps.google.com/maps?q=${q}&z=13&output=embed`;
}

/** Lightweight map preview for a single address (no API key). */
export function mapsEmbedUrl(address: string) {
  return `https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=14&output=embed`;
}

export function requestUserLocation(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('GEOLOCATION_UNAVAILABLE'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) reject(new Error('GEOLOCATION_DENIED'));
        else reject(new Error('GEOLOCATION_FAILED'));
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 120000 }
    );
  });
}
