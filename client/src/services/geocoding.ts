import { COLLEGE_HOTSPOTS } from '../constants/hotspots';

export interface GeocodeResult {
  name: string;
  lat: number;
  lng: number;
  isFallback?: boolean;
  warning?: string;
}

export const DEFAULT_CAMPUS_COORDS = {
  name: 'COEP Main Quad (Campus Grid)',
  lat: 18.5308,
  lng: 73.8553,
  isFallback: true,
  warning: 'Exact location not found. Defaulting to campus grid.',
};

// Search hotspots or query Nominatim with graceful fallback degradation
export async function searchLocations(query: string): Promise<GeocodeResult[]> {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) {
    return COLLEGE_HOTSPOTS.map((h) => ({
      name: h.name,
      lat: h.lat,
      lng: h.lng,
    }));
  }

  // 1. First search pre-seeded college hotspots
  const matchedHotspots = COLLEGE_HOTSPOTS.filter(
    (h) =>
      h.name.toLowerCase().includes(cleanQuery) ||
      h.short_name.toLowerCase().includes(cleanQuery) ||
      h.category.toLowerCase().includes(cleanQuery)
  ).map((h) => ({
    name: h.name,
    lat: h.lat,
    lng: h.lng,
  }));

  if (matchedHotspots.length > 0) {
    return matchedHotspots;
  }

  // 2. Query Nominatim OpenStreetMap API wrapped in try/catch with graceful degradation
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        cleanQuery
      )}&limit=5&countrycodes=in`,
      {
        headers: {
          'Accept-Language': 'en',
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: any) => ({
          name: item.display_name.split(',')[0],
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
        }));
      }
    }
  } catch (err) {
    console.warn('Geocoding network error, degrading gracefully to campus grid:', err);
  }

  // If API fails or returns 0 results for custom text location, resolve with hardcoded campus coordinates and warning
  return [
    {
      name: `${query.trim()} (Campus Grid)`,
      lat: DEFAULT_CAMPUS_COORDS.lat,
      lng: DEFAULT_CAMPUS_COORDS.lng,
      isFallback: true,
      warning: 'Exact location not found. Defaulting to campus grid.',
    },
    ...COLLEGE_HOTSPOTS.slice(0, 3).map((h) => ({
      name: h.name,
      lat: h.lat,
      lng: h.lng,
      isFallback: true,
      warning: 'Exact location not found. Defaulting to campus grid.',
    })),
  ];
}
