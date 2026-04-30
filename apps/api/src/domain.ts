import type { UserRole } from "@taptu/shared";

export type AttendanceMode = "QR" | "GPS" | "Selfie" | "Manual";
export type AttendanceFlowState = "idle" | "checked_in" | "checked_out";
export type RequestFlowStatus = "Menunggu" | "Disetujui" | "Ditolak";

export interface AttendanceRecord {
  userId: string;
  state: AttendanceFlowState;
  checkInAt?: string;
  checkInMethod?: AttendanceMode;
  checkOutAt?: string;
  checkOutMethod?: AttendanceMode;
}

export interface RequestRecord {
  id: string;
  userId: string;
  title: string;
  detail: string;
  status: RequestFlowStatus;
  createdAt: string;
}

export interface ScannerRecord {
  token: string;
  expiresInSeconds: number;
  scansToday: number;
  locationName: string;
}

export interface DemoStore {
  attendance: Record<string, AttendanceRecord>;
  requests: RequestRecord[];
  scanner: ScannerRecord;
}

export type AttendanceEvent =
  | { type: "CHECK_IN"; method: AttendanceMode; at: string }
  | { type: "CHECK_OUT"; method: AttendanceMode; at: string };

export type RequestEvent =
  | { type: "CREATE"; request: RequestRecord }
  | { type: "APPROVE"; id: string; actorRole: UserRole }
  | { type: "REJECT"; id: string; actorRole: UserRole };

export function reduceAttendance(record: AttendanceRecord, event: AttendanceEvent): AttendanceRecord {
  if (event.type === "CHECK_IN") {
    if (record.state !== "idle") {
      return record;
    }

    return {
      ...record,
      state: "checked_in",
      checkInAt: event.at,
      checkInMethod: event.method
    };
  }

  if (record.state !== "checked_in") {
    return record;
  }

  return {
    ...record,
    state: "checked_out",
    checkOutAt: event.at,
    checkOutMethod: event.method
  };
}

export function reduceRequests(requests: RequestRecord[], event: RequestEvent): RequestRecord[] {
  if (event.type === "CREATE") {
    return [event.request, ...requests];
  }

  if (event.actorRole !== "admin" && event.actorRole !== "superadmin") {
    return requests;
  }

  return requests.map((request) => {
    if (request.id !== event.id || request.status !== "Menunggu") {
      return request;
    }

    return {
      ...request,
      status: event.type === "APPROVE" ? "Disetujui" : "Ditolak"
    };
  });
}

export function refreshScannerToken(previous: ScannerRecord): ScannerRecord {
  const nextToken = `HDR-${Math.random().toString(36).slice(2, 5).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

  return {
    ...previous,
    token: nextToken,
    expiresInSeconds: 30
  };
}

export function createInitialStore(): DemoStore {
  return {
    attendance: {
      "usr-employee-01": {
        userId: "usr-employee-01",
        state: "idle"
      }
    },
    requests: [
      {
        id: "req-001",
        userId: "usr-employee-01",
        title: "Izin pribadi",
        detail: "Perlu keluar kantor pukul 15.00 untuk urusan keluarga.",
        status: "Menunggu",
        createdAt: "2026-04-30T08:30:00.000Z"
      }
    ],
    scanner: {
      token: "HDR-31A-7XZ",
      expiresInSeconds: 30,
      scansToday: 124,
      locationName: "Gerbang Utama"
    }
  };
}
