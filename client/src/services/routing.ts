export interface RouteResult {
  coordinates: [number, number][]; // [lat, lng]
  distanceKm: number;
  durationMinutes: number;
}

// Convert degrees to radians
function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// Haversine distance in km
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(3));
}

// Geodesic interpolation fallback
function generateInterpolatedRoute(
  startLat: number,
  startLng: number,
  destLat: number,
  destLng: number,
  steps: number = 10
): [number, number][] {
  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const fraction = i / steps;
    // Add subtle curvature to simulate road routing
    const perturbation = Math.sin(fraction * Math.PI) * 0.0018;
    const lat = startLat + (destLat - startLat) * fraction + perturbation;
    const lng = startLng + (destLng - startLng) * fraction - perturbation * 0.6;
    coords.push([Number(lat.toFixed(5)), Number(lng.toFixed(5))]);
  }
  return coords;
}

// Fetch route from OSRM or fallback to interpolated geodesic route
export async function getRoute(
  startLat: number,
  startLng: number,
  destLat: number,
  destLng: number
): Promise<RouteResult> {
  const straightDistance = haversineDistance(startLat, startLng, destLat, destLng);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        // OSRM returns coordinates in [lng, lat] format
        const coords: [number, number][] = route.geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]]
        );
        const distKm = Number((route.distance / 1000).toFixed(2));
        const durMins = Math.round(route.duration / 60);

        return {
          coordinates: coords,
          distanceKm: distKm,
          durationMinutes: Math.max(durMins, 3),
        };
      }
    }
  } catch (err) {
    console.warn('OSRM route failed or timed out, applying Haversine fallback:', err);
  }

  // Fallback: Haversine distance * road tortuosity factor (~1.25)
  const estimatedRoadDistance = Number((straightDistance * 1.25).toFixed(2));
  const estimatedDuration = Math.max(Math.round(estimatedRoadDistance * 3), 4);
  const fallbackCoords = generateInterpolatedRoute(startLat, startLng, destLat, destLng);

  return {
    coordinates: fallbackCoords,
    distanceKm: estimatedRoadDistance,
    durationMinutes: estimatedDuration,
  };
}
