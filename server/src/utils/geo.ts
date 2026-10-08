// Geographic calculations, Haversine formula, and Corridor Matching

export interface LatLng {
  lat: number;
  lng: number;
}

// Convert degrees to radians
function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// Haversine distance in kilometers
export function haversineDistance(p1: LatLng, p2: LatLng): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(p2.lat - p1.lat);
  const dLng = toRad(p2.lng - p1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(p1.lat)) *
      Math.cos(toRad(p2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(3));
}

// Haversine distance in meters
export function calculateHaversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  return haversineDistance({ lat: lat1, lng: lng1 }, { lat: lat2, lng: lng2 }) * 1000;
}

// Get the scalar projection parameter t of point p onto line segment v -> w
// t = 0 represents point v, t = 1 represents point w
// t < 0 is behind v, t > 1 is beyond w
export function getProjectionParameter(p: LatLng, v: LatLng, w: LatLng): number {
  const l2 =
    (w.lat - v.lat) * (w.lat - v.lat) + (w.lng - v.lng) * (w.lng - v.lng);
  if (l2 === 0) return 0;
  return (
    ((p.lat - v.lat) * (w.lat - v.lat) + (p.lng - v.lng) * (w.lng - v.lng)) /
    l2
  );
}

// Distance from a point to a line segment (in km)
export function pointToSegmentDistance(
  p: LatLng,
  v: LatLng,
  w: LatLng
): number {
  const l2 =
    (w.lat - v.lat) * (w.lat - v.lat) + (w.lng - v.lng) * (w.lng - v.lng);
  if (l2 === 0) return haversineDistance(p, v);

  let t = getProjectionParameter(p, v, w);
  t = Math.max(0, Math.min(1, t));

  const projection: LatLng = {
    lat: v.lat + t * (w.lat - v.lat),
    lng: v.lng + t * (w.lng - v.lng),
  };

  return haversineDistance(p, projection);
}

// Distance from a point to a polyline
export function pointToPolylineDistance(
  p: LatLng,
  polyline: [number, number][]
): number {
  if (polyline.length === 0) return 9999;
  if (polyline.length === 1) {
    return haversineDistance(p, { lat: polyline[0][0], lng: polyline[0][1] });
  }
  let minDist = 9999;
  for (let i = 0; i < polyline.length - 1; i++) {
    const v: LatLng = { lat: polyline[i][0], lng: polyline[i][1] };
    const w: LatLng = { lat: polyline[i + 1][0], lng: polyline[i + 1][1] };
    const d = pointToSegmentDistance(p, v, w);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

export interface RouteCompatibility {
  isValid: boolean;
  reason?: string;
  isSameDestination: boolean;
  isEnRouteDropoff: boolean;
  destCorridorDistanceKm: number;
  pickupCorridorDistanceKm: number;
  destToRiderDestDistanceKm: number;
}

/**
 * Validates that a passenger's trip aligns with a rider's trajectory:
 * Case 1 (Same Destination): Passenger Destination is within 1.5 km of Rider Destination B -> MATCH.
 * Case 2 (Drop-off On The Way): Passenger Destination is within 1.0 km of the Rider's route polyline
 *                               AND the drop-off occurs before/at Rider Destination B -> MATCH.
 * If Destination C is off-route, in a different direction, or beyond B -> STRICT FAIL (do not show or allow join).
 */
export function validateRouteCompatibility(
  riderPickup: LatLng,
  riderDest: LatLng,
  passengerPickup: LatLng,
  passengerDest: LatLng,
  pickupName?: string,
  destName?: string,
  riderPickupName?: string,
  riderDestName?: string
): RouteCompatibility {
  const polyline = generateInterpolatedRoute(riderPickup, riderDest, 10);
  const pPickupDist = pointToSegmentDistance(passengerPickup, riderPickup, riderDest);
  const pDestDist = pointToSegmentDistance(passengerDest, riderPickup, riderDest);
  const polylineDestDist = pointToPolylineDistance(passengerDest, polyline);
  const polylinePickupDist = pointToPolylineDistance(passengerPickup, polyline);

  const effectiveDestDist = Math.min(pDestDist, polylineDestDist);
  const effectivePickupDist = Math.min(pPickupDist, polylinePickupDist);

  const destToDestDist = haversineDistance(passengerDest, riderDest);
  const pickupToStartDist = haversineDistance(passengerPickup, riderPickup);

  const tPickup = getProjectionParameter(passengerPickup, riderPickup, riderDest);
  const tDest = getProjectionParameter(passengerDest, riderPickup, riderDest);

  // Check destination name match
  const pDestClean = (destName || '').trim().toLowerCase();
  const rDestClean = (riderDestName || '').trim().toLowerCase();
  const nameDestMatch =
    pDestClean.length >= 3 &&
    (rDestClean.includes(pDestClean) || pDestClean.includes(rDestClean));

  // Case 1 (Same Destination): Passenger Destination is within 1.5 km of Rider Destination B -> MATCH.
  const isSameDestination = destToDestDist <= 1.5 || (nameDestMatch && destToDestDist <= 2.0);

  // Case 2 (Drop-off On The Way): Passenger Destination is within 1.0 km of the route polyline
  // AND the drop-off occurs before/at Rider Destination B (tDest <= 1.02)
  // AND in forward direction from pickup (tDest >= -0.05 and tDest >= tPickup - 0.05)
  const isEnRouteDropoff =
    effectiveDestDist <= 1.0 &&
    tDest >= -0.05 &&
    tDest <= 1.02 &&
    tDest >= tPickup - 0.05;

  const destValid = isSameDestination || isEnRouteDropoff;

  // Check pickup name match
  const pPickupClean = (pickupName || '').trim().toLowerCase();
  const rPickupClean = (riderPickupName || '').trim().toLowerCase();
  const namePickupMatch =
    pPickupClean.length >= 3 &&
    (rPickupClean.includes(pPickupClean) || pPickupClean.includes(rPickupClean));

  // Pickup must be within 2.5 km of rider start or route corridor
  const pickupValid = effectivePickupDist <= 2.5 || pickupToStartDist <= 2.5 || namePickupMatch;

  let reason = '';
  if (!destValid) {
    if (tDest > 1.02 && !isSameDestination) {
      reason = "Destination is beyond rider's destination (detours/overshoots are not permitted).";
    } else {
      reason = "Destination is off rider's route corridor (detours to destination C are not permitted).";
    }
  } else if (!pickupValid) {
    reason = "Pickup location is too far from rider's route corridor.";
  }

  return {
    isValid: destValid && pickupValid,
    reason: destValid && pickupValid ? '' : reason,
    isSameDestination,
    isEnRouteDropoff,
    destCorridorDistanceKm: effectiveDestDist,
    pickupCorridorDistanceKm: effectivePickupDist,
    destToRiderDestDistanceKm: destToDestDist,
  };
}

// Parse "HH:mm" to minutes from midnight
export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Check if two times are within +/- windowMinutes
export function isTimeWithinWindow(
  time1: string,
  time2: string,
  windowMinutes: number = 30
): boolean {
  const m1 = timeToMinutes(time1);
  const m2 = timeToMinutes(time2);
  const diff = Math.abs(m1 - m2);
  return diff <= windowMinutes;
}

// Interpolate waypoints between two points for fallback map polyline
export function generateInterpolatedRoute(
  start: LatLng,
  end: LatLng,
  steps: number = 8
): [number, number][] {
  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const fraction = i / steps;
    // Add a tiny realistic curve perturbation based on sine wave
    const perturbation = Math.sin(fraction * Math.PI) * 0.0015;
    const lat = start.lat + (end.lat - start.lat) * fraction + perturbation;
    const lng = start.lng + (end.lng - start.lng) * fraction - perturbation * 0.5;
    coords.push([Number(lat.toFixed(5)), Number(lng.toFixed(5))]);
  }
  return coords;
}
