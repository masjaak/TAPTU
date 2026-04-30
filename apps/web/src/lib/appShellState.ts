import type { UserRole } from "@taptu/shared";
import { Home, QrCode, ScanFace, TimerReset, UserRound } from "lucide-react";

export type AppTabKey = "home" | "attendance" | "requests" | "scanner" | "profile";

export type AppShellEvent =
  | { type: "OPEN_HOME" }
  | { type: "OPEN_ATTENDANCE" }
  | { type: "OPEN_REQUESTS" }
  | { type: "OPEN_SCANNER" }
  | { type: "OPEN_PROFILE" };

export type AppTabDefinition = {
  key: AppTabKey;
  label: string;
  icon: typeof Home;
};

const baseTabs: AppTabDefinition[] = [
  { key: "home", label: "Beranda", icon: Home },
  { key: "attendance", label: "Absensi", icon: QrCode },
  { key: "requests", label: "Izin", icon: TimerReset }
];

const roleTabs: Record<UserRole, AppTabDefinition[]> = {
  superadmin: [...baseTabs, { key: "profile", label: "Profil", icon: UserRound }],
  admin: [...baseTabs, { key: "profile", label: "Profil", icon: UserRound }],
  employee: [...baseTabs, { key: "profile", label: "Profil", icon: UserRound }],
  scanner: [...baseTabs, { key: "scanner", label: "Scanner", icon: ScanFace }, { key: "profile", label: "Profil", icon: UserRound }]
};

const eventMap: Record<AppShellEvent["type"], AppTabKey> = {
  OPEN_HOME: "home",
  OPEN_ATTENDANCE: "attendance",
  OPEN_REQUESTS: "requests",
  OPEN_SCANNER: "scanner",
  OPEN_PROFILE: "profile"
};

export function getTabsForRole(role: UserRole): AppTabDefinition[] {
  return roleTabs[role];
}

export function transitionTab(role: UserRole, current: AppTabKey, event: AppShellEvent): AppTabKey {
  const next = eventMap[event.type];
  const allowedTabs = getTabsForRole(role).map((item) => item.key);

  if (!allowedTabs.includes(next)) {
    return current;
  }

  return next;
}
