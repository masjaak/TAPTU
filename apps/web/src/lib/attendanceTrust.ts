export type AttendanceTrustStatus =
  | "checking"
  | "ready"
  | "blocked_clock"
  | "blocked_location"
  | "blocked_integrity";

export interface AttendanceTrustPolicy {
  officeName: string;
  officeLatitude: number;
  officeLongitude: number;
  allowedRadiusMeters: number;
  maxTimeSkewMinutes: number;
  maxLocationAccuracyMeters: number;
}

export interface AttendanceTrustSignal {
  serverTimeSkewMinutes?: number;
  distanceFromOfficeMeters?: number;
  locationAccuracyMeters?: number;
  mockLocationDetected?: boolean;
}

export interface AttendanceTrustState {
  status: AttendanceTrustStatus;
  canClock: boolean;
  title: string;
  detail: string;
}

export const secureAttendancePolicy: AttendanceTrustPolicy = {
  officeName: "TAPTU HQ",
  officeLatitude: -6.2088,
  officeLongitude: 106.8456,
  allowedRadiusMeters: 150,
  maxTimeSkewMinutes: 5,
  maxLocationAccuracyMeters: 80
};

export function evaluateAttendanceTrust(
  signal: AttendanceTrustSignal,
  policy: AttendanceTrustPolicy
): AttendanceTrustState {
  if (signal.serverTimeSkewMinutes === undefined || signal.distanceFromOfficeMeters === undefined) {
    return {
      status: "checking",
      canClock: false,
      title: "Verifikasi perangkat dibutuhkan",
      detail: "Absensi aktif setelah waktu server, lokasi kerja, dan integritas GPS selesai dicek."
    };
  }

  if (Math.abs(signal.serverTimeSkewMinutes) > policy.maxTimeSkewMinutes) {
    return {
      status: "blocked_clock",
      canClock: false,
      title: "Jam perangkat tidak valid",
      detail: `Selisih waktu melebihi ${policy.maxTimeSkewMinutes} menit dari waktu server. Perbaiki jam otomatis sebelum absen.`
    };
  }

  if (signal.distanceFromOfficeMeters > policy.allowedRadiusMeters) {
    return {
      status: "blocked_location",
      canClock: false,
      title: "Di luar radius lokasi kerja",
      detail: `Absensi hanya aktif dalam radius ${policy.allowedRadiusMeters} meter dari ${policy.officeName}.`
    };
  }

  if (
    signal.mockLocationDetected ||
    (signal.locationAccuracyMeters !== undefined && signal.locationAccuracyMeters > policy.maxLocationAccuracyMeters)
  ) {
    return {
      status: "blocked_integrity",
      canClock: false,
      title: "Integritas lokasi perlu dicek",
      detail: "Sinyal GPS tidak cukup akurat atau terindikasi dimodifikasi. Matikan aplikasi lokasi palsu lalu verifikasi ulang."
    };
  }

  return {
    status: "ready",
    canClock: true,
    title: "Perangkat terverifikasi",
    detail: "Waktu memakai acuan server, lokasi berada dalam radius kerja, dan sinyal GPS layak dipakai."
  };
}

export function calculateDistanceMeters(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
) {
  const earthRadiusMeters = 6371000;
  const fromLat = toRadians(from.latitude);
  const toLat = toRadians(to.latitude);
  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLon = toRadians(to.longitude - from.longitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(earthRadiusMeters * c);
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
