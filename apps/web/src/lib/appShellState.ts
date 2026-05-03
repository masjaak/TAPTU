import type { UserRole } from "@taptu/shared";
import {
  BarChart3,
  CalendarDays,
  Clock3,
  History,
  Home,
  MapPinned,
  ScanFace,
  Settings,
  TimerReset,
  UserRound,
  Users,
  WalletCards
} from "lucide-react";

export type NavigationRole = UserRole;

export type AppSectionKey =
  | "home"
  | "team"
  | "attendance"
  | "history"
  | "requests"
  | "schedule"
  | "payslip"
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
  | { type: "OPEN_HISTORY" }
  | { type: "OPEN_REQUESTS" }
  | { type: "OPEN_SCHEDULE" }
  | { type: "OPEN_PAYSLIP" }
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
  attendance: { key: "attendance", label: "Presensi", icon: Clock3, path: "/app/attendance", description: "Check-in dan validasi" },
  history: { key: "history", label: "Riwayat", icon: History, path: "/app/history", description: "Histori absensi pribadi" },
  requests: { key: "requests", label: "Pengajuan", icon: TimerReset, path: "/app/requests", description: "Pengajuan dan approval" },
  schedule: { key: "schedule", label: "Jadwal", icon: CalendarDays, path: "/app/schedule", description: "Shift kerja pribadi" },
  payslip: { key: "payslip", label: "Slip Gaji", icon: WalletCards, path: "/app/payslip", description: "Ringkasan payroll pribadi" },
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
  employee: ["home", "attendance", "history", "requests", "schedule", "payslip", "profile"],
  scanner: ["scanner", "profile"]
};

const compactNavigation: Record<UserRole, AppSectionKey[]> = {
  superadmin: ["home", "attendance", "requests", "profile"],
  admin: ["home", "attendance", "requests", "profile"],
  manager: ["home", "attendance", "requests", "profile"],
  employee: ["home", "attendance", "history", "requests", "schedule", "payslip", "profile"],
  scanner: ["scanner", "profile"]
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
  OPEN_HISTORY: "history",
  OPEN_REQUESTS: "requests",
  OPEN_SCHEDULE: "schedule",
  OPEN_PAYSLIP: "payslip",
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
