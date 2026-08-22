/**
 * SETU — demo-level station proximity check.
 *
 * This is NOT a production anti-spoofing system: browser geolocation can be
 * faked trivially. It exists to demonstrate the product flow only.
 */

export const GEOFENCE_RADIUS_METERS = 300;

export interface LatLng {
  lat: number;
  lng: number;
}

export type GeofenceStatus =
  | "INSIDE"
  | "OUTSIDE"
  | "PERMISSION_DENIED"
  | "UNAVAILABLE"
  | "UNSUPPORTED";

export interface GeofenceResult {
  status: GeofenceStatus;
  locationVerified: boolean;
  /** Metres from the station, when a fix was obtained. */
  distanceMeters: number | null;
  message: string;
}

const EARTH_RADIUS_M = 6_371_000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance between two coordinates, in metres. */
export function haversineDistanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function getCurrentPosition(
  timeoutMs = 8000,
): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("UNSUPPORTED"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: timeoutMs,
      maximumAge: 30_000,
    });
  });
}

/**
 * Check the device against a station. Never throws — a failure simply means
 * locationVerified: false, and the caller must not hard-block submission.
 */
export async function checkStationProximity(
  station: LatLng,
  radiusMeters: number = GEOFENCE_RADIUS_METERS,
): Promise<GeofenceResult> {
  try {
    const pos = await getCurrentPosition();
    const distanceMeters = haversineDistanceMeters(station, {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
    });
    const inside = distanceMeters <= radiusMeters;
    return {
      status: inside ? "INSIDE" : "OUTSIDE",
      locationVerified: inside,
      distanceMeters,
      message: inside
        ? `Location verified — about ${Math.round(distanceMeters)} m from the station.`
        : `You don't appear to be near this station (about ${formatDistance(
            distanceMeters,
          )} away) — report anyway?`,
    };
  } catch (err) {
    const code = (err as GeolocationPositionError | Error & { code?: number })
      .code;
    if (code === 1) {
      return {
        status: "PERMISSION_DENIED",
        locationVerified: false,
        distanceMeters: null,
        message:
          "Location permission denied — submitting without a proximity check.",
      };
    }
    if ((err as Error).message === "UNSUPPORTED") {
      return {
        status: "UNSUPPORTED",
        locationVerified: false,
        distanceMeters: null,
        message:
          "This device can't share location — submitting without a proximity check.",
      };
    }
    return {
      status: "UNAVAILABLE",
      locationVerified: false,
      distanceMeters: null,
      message:
        "Couldn't get your location — submitting without a proximity check.",
    };
  }
}

export function formatDistance(meters: number): string {
  return meters < 1000
    ? `${Math.round(meters)} m`
    : `${(meters / 1000).toFixed(1)} km`;
}
