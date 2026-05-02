import type { UserRole } from "@taptu/shared";
import {
  BarChart3,
  Home,
  MapPinned,
  QrCode,
  ScanFace,
  Settings,
  TimerReset,
  UserRound,
  Users
} from "lucide-react";

export type NavigationRole = UserRole | "manager";

export type AppSectionKey =
  | "home"
  | "team"
  | "attendance"
  | "requests"
  | "locations"
  | "reports"
  | "scanner"
  | "profile"
  | "settings";

export type AppTabKey = AppSectionKey;

export type AppShellEvent =
  | { type: "OPEN_HOME" }
  | { type: "OPEN_TEAM" }
  | { type: "OPEN_ATTENDANCE" }
  | { type: "OPEN_REQUESTS" }
  | { type: "OPEN_LOCATIONS" }
  | { type: "OPEN_REPORTS" }
  | { type: "OPEN_SCANNER" }
  | { type: "OPEN_PROFILE" }
  | { type: "OPEN_SETTINGS" };

export type AppTabDefinition = {
  key: AppSectionKey;
  label: string;
  icon: typeof Home;
  path: string;
  description?: string;
};

const sections: Record<AppSectionKey, AppTabDefinition> = {
  home: { key: "home", label: "Beranda", icon: Home, path: "/app", description: "Ringkasan workspace" },
  team: { key: "team", label: "Tim", icon: Users, path: "/app/team", description: "Karyawan dan supervisor" },
  attendance: { key: "attendance", label: "Absensi", icon: QrCode, path: "/app/attendance", description: "Clock dan validasi" },
  requests: { key: "requests", label: "Izin", icon: TimerReset, path: "/app/requests", description: "Pengajuan dan approval" },
  locations: { key: "locations", label: "Lokasi", icon: MapPinned, path: "/app/locations", description: "Geofence kerja" },
  reports: { key: "reports", label: "Laporan", icon: BarChart3, path: "/app/reports", description: "Rekap HR" },
  scanner: { key: "scanner", label: "Scanner", icon: ScanFace, path: "/app/scanner", description: "Mode kiosk" },
  profile: { key: "profile", label: "Profil", icon: UserRound, path: "/app/profile", description: "Akun pengguna" },
  settings: { key: "settings", label: "Settings", icon: Settings, path: "/app/settings", description: "Konfigurasi workspace" }
};

const roleNavigation: Record<NavigationRole, AppSectionKey[]> = {
  superadmin: ["home", "team", "attendance", "requests", "locations", "reports", "settings", "profile"],
  admin: ["home", "team", "attendance", "requests", "locations", "reports", "profile"],
  manager: ["home", "team", "attendance", "requests", "reports", "profile"],
  employee: ["home", "attendance", "requests", "profile"],
  scanner: ["scanner", "attendance", "profile"]
};

const compactNavigation: Record<UserRole, AppSectionKey[]> = {
  superadmin: ["home", "attendance", "requests", "profile"],
  admin: ["home", "attendance", "requests", "profile"],
  employee: ["home", "attendance", "requests", "profile"],
  scanner: ["home", "attendance", "requests", "scanner", "profile"]
};

const defaultSection: Record<NavigationRole, AppSectionKey> = {
  superadmin: "home",
  admin: "home",
  manager: "home",
  employee: "home",
  scanner: "scanner"
};

const eventMap: Record<AppShellEvent["type"], AppSectionKey> = {
  OPEN_HOME: "home",
  OPEN_TEAM: "team",
  OPEN_ATTENDANCE: "attendance",
  OPEN_REQUESTS: "requests",
  OPEN_LOCATIONS: "locations",
  OPEN_REPORTS: "reports",
  OPEN_SCANNER: "scanner",
  OPEN_PROFILE: "profile",
  OPEN_SETTINGS: "settings"
};

export function getTabsForRole(role: UserRole): AppTabDefinition[] {
  return compactNavigation[role].map((key) => sections[key]);
}

export function getNavigationForRole(role: NavigationRole): AppTabDefinition[] {
  return roleNavigation[role].map((key) => sections[key]);
}

export function getDefaultAppSection(role: NavigationRole): AppSectionKey {
  return defaultSection[role];
}

export function toAppSection(value: string | undefined, role: NavigationRole): AppSectionKey {
  const candidate = value === undefined ? getDefaultAppSection(role) : (value as AppSectionKey);
  const allowed = new Set(roleNavigation[role]);

  if (allowed.has(candidate)) {
    return candidate;
  }

  return getDefaultAppSection(role);
}

export function transitionTab(role: UserRole, current: AppTabKey, event: AppShellEvent): AppTabKey {
  const next = eventMap[event.type];
  const allowedTabs = getTabsForRole(role).map((item) => item.key);

  if (!allowedTabs.includes(next)) {
    return current;
  }

  return next;
}

export function transitionAppSection(role: NavigationRole, current: AppSectionKey, event: AppShellEvent): AppSectionKey {
  const next = eventMap[event.type];
  const allowedSections = getNavigationForRole(role).map((item) => item.key);

  if (!allowedSections.includes(next)) {
    return current;
  }

  return next;
}
