import { useEffect, useMemo, useRef, useState, type CSSProperties, type ChangeEvent, type MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  Clock3,
  Download,
  FileClock,
  FolderKanban,
  LogOut,
  MapPinned,
  QrCode,
  RefreshCw,
  ScanFace,
  Search,
  ShieldCheck,
  TimerReset,
  Users
} from "lucide-react";

import type {
  AdminOverview,
  AttendanceExceptionItem,
  AttendanceRecord,
  AttendanceReportFilters,
  AttendanceReportRow,
  AttendanceTimelineItem,
  AuditLogItem,
  DashboardPayload,
  DashboardScheduleItem,
  DashboardStat,
  DepartmentItem,
  EmployeeListItem,
  EmployeeSummary,
  LeaveRequestItem,
  NotificationItem,
  ShiftRecord,
  UserRole,
  WorkLocationItem
} from "@taptu/shared";

import {
  AppShell,
  CategorySelect,
  DataTable,
  Dialog,
  EmptyState,
  ErrorState,
  FilterSelect,
  FormInput,
  LoadingState,
  PageHeader,
  Panel,
  PrimaryButton,
  SecondaryButton,
  SelectInput,
  StatCard,
  StatusBadge
} from "../components/app";
import {
  approveRequest,
  cancelRequest,
  checkIn,
  checkOut,
  createDepartment,
  createRequest,
  createShift,
  createWorkLocation,
  exportReportCsv,
  fetchAuditLogs,
  fetchAdminOverview,
  fetchAttendanceHistoryByFilter,
  fetchDepartments,
  fetchEmployeeList,
  fetchEmployeeSummary,
  fetchExceptionQueue,
  fetchManagerEmployeeList,
  fetchManagerExceptionQueue,
  fetchManagerOverview,
  fetchManagerRequests,
  fetchNotifications,
  fetchReportRows,
  fetchRequestDetail,
  fetchRequests,
  fetchScannerState,
  fetchShifts,
  fetchWorkLocations,
  getDashboard,
  reassignEmployeeDepartment,
  refreshScannerToken,
  markNotificationRead,
  reviewException,
  updateDepartment,
  updateShift,
  updateWorkLocation
} from "../lib/api";
import { getNavigationForRole, toAppSection, type AppTabKey } from "../lib/appShellState";
import {
  calculateDistanceMeters,
  evaluateAttendanceTrust,
  secureAttendancePolicy,
  type AttendanceTrustSignal
} from "../lib/attendanceTrust";
import {
  getRequestCategoryMeta,
  nextScannerCountdown,
  REQUEST_CATEGORY_META,
  validateRequestForm,
  type RequestFormState
} from "../lib/mobileWorkflow";
import { clearSession, readSession } from "../lib/session";

const attendanceFilters = ["all", "present", "issue"] as const;
const requestCategories = ["Izin", "Cuti", "Sakit", "Koreksi Absensi", "Lupa Check-in/out"] as const;
const DEPARTMENT_ACTION_MENU_WIDTH = 192;
const DEPARTMENT_ACTION_MENU_MAX_HEIGHT = 260;
const DEPARTMENT_ACTION_MENU_MARGIN = 8;

interface DepartmentActionMenuPosition {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
}

const employeeStatusFilters = [
  { value: "", label: "Semua status" },
  { value: "present", label: "Hadir" },
  { value: "late", label: "Terlambat" },
  { value: "absent", label: "Belum hadir" },
  { value: "leave", label: "Izin" }
] as const;
const reportStatusFilters = [
  { value: "", label: "Semua status" },
  { value: "Tepat waktu", label: "Hadir" },
  { value: "Terlambat", label: "Terlambat" },
  { value: "Belum check-in", label: "Belum hadir" },
  { value: "needs_review", label: "Perlu review" },
  { value: "Selesai", label: "Selesai" },
  { value: "Izin", label: "Izin" }
] as const;
type EmployeeCheckInMode = "qr" | "face";
type EmployeeCheckInFlowState = "idle" | "qr_scanned" | "face_captured" | "confirmation" | "submitting" | "success";
type CapturedSelfie = {
  previewUrl: string;
  dataUrl: string;
  fileName: string;
  contentType: string;
};
type PendingCheckIn = {
  method: "QR" | "Selfie";
  capturedAt: string;
  locationName: string;
  shiftName: string;
  validationStatus: AttendanceRecord["validationStatus"];
  validationReasons: string[];
  scannerToken?: string;
  selfie?: CapturedSelfie;
};
type AttendanceHistorySource = Partial<AttendanceTimelineItem> & {
  date?: string;
  attendanceDate?: string;
  attendance_date?: string;
  checkInTime?: string;
  check_in_time?: string;
  checkOutTime?: string;
  check_out_time?: string;
  checkInMethod?: string;
  check_in_method?: string;
  locationName?: string;
  location_name?: string;
  workLocationName?: string;
  work_location_name?: string;
};

const roleLabels: Record<UserRole, string> = {
  superadmin: "Superadmin",
  admin: "Admin HR",
  manager: "Manager",
  employee: "Employee",
  scanner: "Scanner Kiosk"
};

const EMPTY_PROFILE_VALUE = "Belum ditetapkan";

const WORKFLOW_STATUS_LABELS: Record<string, string> = {
  pending_manager: "Menunggu Manager",
  approved_by_manager: "Disetujui Manager",
  pending_hr: "Menunggu HR",
  approved: "Disetujui",
  rejected: "Ditolak",
  cancelled: "Dibatalkan"
};

function getWorkflowStatusLabel(workflowStatus?: string): string | undefined {
  return workflowStatus ? WORKFLOW_STATUS_LABELS[workflowStatus] : undefined;
}

function canShowApprovalActionsForRequest(role: UserRole, workflowStatus?: string): boolean {
  if (role === "admin" || role === "superadmin") {
    return workflowStatus === undefined || workflowStatus === "pending_hr" || workflowStatus === "approved_by_manager";
  }

  if (role === "manager") {
    return workflowStatus === undefined || workflowStatus === "pending_manager";
  }

  return false;
}

function countApprovalStages(items: LeaveRequestItem[]) {
  return {
    waitingManager: items.filter((item) => item.workflowStatus === "pending_manager").length,
    waitingHr: items.filter((item) => item.workflowStatus === "pending_hr" || item.workflowStatus === "approved_by_manager").length
  };
}

function profileValue(value?: string | null) {
  return value && value.trim() !== "" ? value : EMPTY_PROFILE_VALUE;
}

function isAttendanceMethod(value: unknown): value is AttendanceTimelineItem["method"] {
  return value === "QR" || value === "GPS" || value === "Selfie" || value === "Manual";
}

function normalizeAttendanceStatus(value: unknown): AttendanceTimelineItem["status"] {
  if (value === "Terlambat" || value === "Izin" || value === "Belum check-in") {
    return value;
  }

  return "Tepat waktu";
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Selfie belum bisa diproses."));
    };
    reader.onerror = () => reject(new Error("Selfie belum bisa diproses."));
    reader.readAsDataURL(file);
  });
}

function formatAttendanceDateLabel(value?: string) {
  if (!value) {
    return "Hari ini";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function formatAttendanceTime(value?: string) {
  if (!value) {
    return "--.--";
  }

  if (value.includes("T") && value.length >= 16) {
    return value.slice(11, 16);
  }

  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  }

  return value;
}

function formatAttendanceDuration(checkInTime?: string, checkOutTime?: string) {
  if (!checkInTime || !checkOutTime) {
    return "Belum selesai";
  }

  const start = new Date(checkInTime);
  const end = new Date(checkOutTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end.getTime() < start.getTime()) {
    return "Belum selesai";
  }

  const totalMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}j ${String(minutes).padStart(2, "0")}m`;
}

function getEffectiveAttendanceState(summary: EmployeeSummary | null, fallback: "idle" | "checked_in" | "checked_out") {
  return summary?.currentAttendanceState ?? fallback;
}

function normalizeAttendanceHistoryItems(items: AttendanceHistorySource[]): AttendanceTimelineItem[] {
  return items.map((item) => {
    const date = item.date ?? item.attendanceDate ?? item.attendance_date;
    const checkInTime = item.checkInTime ?? item.check_in_time;
    const checkOutTime = item.checkOutTime ?? item.check_out_time;
    const method = item.method ?? item.checkInMethod ?? item.check_in_method;
    const locationName = item.locationName ?? item.location_name ?? item.workLocationName ?? item.work_location_name;
    const checkInLabel = formatAttendanceTime(checkInTime);
    const checkOutLabel = formatAttendanceTime(checkOutTime);

    return {
      id: item.id,
      day: item.day ?? formatAttendanceDateLabel(date ?? checkInTime ?? checkOutTime),
      status: normalizeAttendanceStatus(item.status),
      time: item.time ?? checkInLabel,
      method: isAttendanceMethod(method) ? method : "Manual",
      checkInTime: checkInTime ? checkInLabel : item.time,
      checkOutTime: checkOutTime ? checkOutLabel : undefined,
      duration: item.duration ?? formatAttendanceDuration(checkInTime, checkOutTime),
      locationName
    };
  });
}

export function AppPage() {
  const [session] = useState(() => readSession());
  const navigate = useNavigate();
  const { section } = useParams<{ section?: string }>();
  const sessionRole = session?.user.role ?? "employee";
  const activeSection = useMemo(() => toAppSection(section, sessionRole), [section, sessionRole]);

  const [greeting, setGreeting] = useState("");
  const [stats, setStats] = useState<DashboardStat[]>([]);
  const [schedule, setSchedule] = useState<DashboardScheduleItem[]>([]);
  const [attendance, setAttendance] = useState<AttendanceTimelineItem[]>([]);
  const [attendanceState, setAttendanceState] = useState<"idle" | "checked_in" | "checked_out">("idle");
  const [requests, setRequests] = useState<LeaveRequestItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [scannerToken, setScannerToken] = useState<string | undefined>();
  const [scannerMeta, setScannerMeta] = useState<{ expiresInSeconds: number; scansToday: number; locationName: string } | null>(null);
  const [scannerScans, setScannerScans] = useState<Array<{ id: string; employeeName: string; status: "success" | "invalid" | "expired"; time: string; detail: string }>>([]);
  const [tab, setTab] = useState<AppTabKey>(activeSection);
  const [historyFilter, setHistoryFilter] = useState<(typeof attendanceFilters)[number]>("all");
  const [adminOverview, setAdminOverview] = useState<AdminOverview | null>(null);
  const [employeeSummary, setEmployeeSummary] = useState<EmployeeSummary | null>(null);
  const [requestForm, setRequestForm] = useState<RequestFormState>({
    category: "Izin",
    startDate: "",
    endDate: "",
    title: "",
    detail: ""
  });
  const [changePasswordForm, setChangePasswordForm] = useState({
    current: "",
    next: "",
    confirm: ""
  });
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [requestDetail, setRequestDetail] = useState<LeaveRequestItem | null>(null);
  const [exceptionQueue, setExceptionQueue] = useState<AttendanceExceptionItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [approvalNotes, setApprovalNotes] = useState<Record<string, string>>({});
  const [exceptionNotes, setExceptionNotes] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ message: string; tone: "ok" | "err" } | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [checkInFlowState, setCheckInFlowState] = useState<EmployeeCheckInFlowState>("idle");
  const [checkInMode, setCheckInMode] = useState<EmployeeCheckInMode>("qr");
  const [pendingCheckIn, setPendingCheckIn] = useState<PendingCheckIn | null>(null);
  const [submittedCheckIn, setSubmittedCheckIn] = useState<PendingCheckIn | null>(null);
  const [dashboardLoaded, setDashboardLoaded] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [attendanceTrustSignal, setAttendanceTrustSignal] = useState<AttendanceTrustSignal>(() =>
    session?.token.startsWith("demo:")
      ? {
          serverTimeSkewMinutes: 0,
          distanceFromOfficeMeters: 96,
          locationAccuracyMeters: 24,
          mockLocationDetected: false
        }
      : { serverTimeSkewMinutes: 0 }
  );
  const [attendanceCapture, setAttendanceCapture] = useState({
    locationLat: undefined as number | undefined,
    locationLng: undefined as number | undefined,
    selfieUrl: "",
    selfieData: undefined as string | undefined,
    selfieFileName: undefined as string | undefined,
    selfieContentType: undefined as string | undefined,
    requiredSelfie: true,
    deviceId: ""
  });

  const [employeeList, setEmployeeList] = useState<EmployeeListItem[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeDepartmentFilter, setEmployeeDepartmentFilter] = useState("");
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState("");
  const [workLocations, setWorkLocations] = useState<WorkLocationItem[]>([]);
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [adminAttendanceRows, setAdminAttendanceRows] = useState<AttendanceReportRow[]>([]);
  const [reportRows, setReportRows] = useState<AttendanceReportRow[]>([]);
  const [reportFilters, setReportFilters] = useState<{ dateFrom: string; dateTo: string; employeeId: string; departmentId: string; status: string }>({
    dateFrom: "",
    dateTo: "",
    employeeId: "",
    departmentId: "",
    status: ""
  });
  const [reportLoaded, setReportLoaded] = useState(false);
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [locationForm, setLocationForm] = useState({ name: "", address: "", latitude: "", longitude: "", radiusMeters: "150" });
  const [locationFormOpen, setLocationFormOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<WorkLocationItem | null>(null);
  const [shiftForm, setShiftForm] = useState({ name: "", startTime: "", endTime: "", gracePeriodMinutes: "10", workLocationId: "", breakStartTime: "", breakEndTime: "" });
  const [shiftFormOpen, setShiftFormOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftRecord | null>(null);
  const [adminOverviewLoaded, setAdminOverviewLoaded] = useState(false);
  const [adminOverviewError, setAdminOverviewError] = useState<string | null>(null);
  const [attendanceHistoryLoaded, setAttendanceHistoryLoaded] = useState(false);
  const [attendanceHistoryError, setAttendanceHistoryError] = useState<string | null>(null);
  const [adminAttendanceLoaded, setAdminAttendanceLoaded] = useState(false);
  const [adminAttendanceError, setAdminAttendanceError] = useState<string | null>(null);
  const [employeeSummaryLoaded, setEmployeeSummaryLoaded] = useState(false);
  const [employeeSummaryError, setEmployeeSummaryError] = useState<string | null>(null);
  const [scannerLoaded, setScannerLoaded] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [exceptionQueueLoaded, setExceptionQueueLoaded] = useState(false);
  const [exceptionQueueError, setExceptionQueueError] = useState<string | null>(null);
  const [employeeListLoaded, setEmployeeListLoaded] = useState(false);
  const [employeeListError, setEmployeeListError] = useState<string | null>(null);
  const [managerRequestsLoaded, setManagerRequestsLoaded] = useState(false);
  const [managerRequestsError, setManagerRequestsError] = useState<string | null>(null);
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [workLocationsLoaded, setWorkLocationsLoaded] = useState(false);
  const [workLocationsError, setWorkLocationsError] = useState<string | null>(null);
  const [shiftsLoaded, setShiftsLoaded] = useState(false);
  const [shiftsError, setShiftsError] = useState<string | null>(null);
  const [auditLogsLoaded, setAuditLogsLoaded] = useState(false);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [departmentsLoaded, setDepartmentsLoaded] = useState(false);
  const [departmentsError, setDepartmentsError] = useState<string | null>(null);
  const [divisiFormOpen, setDivisiFormOpen] = useState(false);
  const [editingDivisi, setEditingDivisi] = useState<DepartmentItem | null>(null);
  const [divisiForm, setDivisiForm] = useState({ name: "", managerId: "" });
  const [divisiFormError, setDivisiFormError] = useState<string | null>(null);
  const [openDepartmentActionId, setOpenDepartmentActionId] = useState<string | null>(null);
  const [departmentActionMenuPosition, setDepartmentActionMenuPosition] = useState<DepartmentActionMenuPosition | null>(null);
  const [departmentActionError, setDepartmentActionError] = useState<string | null>(null);
  const [ubahPenempatanEmployee, setUbahPenempatanEmployee] = useState<EmployeeListItem | null>(null);
  const [ubahPenempatanDeptId, setUbahPenempatanDeptId] = useState("");
  const [ubahPenempatanError, setUbahPenempatanError] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [requestFormError, setRequestFormError] = useState<string | null>(null);
  const [approvalErrors, setApprovalErrors] = useState<Record<string, string>>({});
  const [exceptionErrors, setExceptionErrors] = useState<Record<string, string>>({});
  const [locationFormError, setLocationFormError] = useState<string | null>(null);
  const [shiftFormError, setShiftFormError] = useState<string | null>(null);
  const [reportFilterError, setReportFilterError] = useState<string | null>(null);
  const selfieInputRef = useRef<HTMLInputElement | null>(null);
  const departmentActionMenuRef = useRef<HTMLDivElement | null>(null);
  const departmentActionButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const appNavigation = useMemo(() => {
    const unreadCount = notifications.filter((n) => !n.readAt).length;
    return getNavigationForRole(sessionRole).map((item) =>
      item.key === "notifications" && unreadCount > 0
        ? { ...item, badge: unreadCount }
        : item
    );
  }, [sessionRole, notifications]);
  const attendanceTrust = useMemo(
    () => evaluateAttendanceTrust(attendanceTrustSignal, secureAttendancePolicy),
    [attendanceTrustSignal]
  );

  const isAdmin = sessionRole === "admin" || sessionRole === "superadmin";
  const isManager = sessionRole === "manager";
  const isEmployee = sessionRole === "employee";
  const isScanner = sessionRole === "scanner";
  const canReviewRequests = isAdmin || isManager;

  useEffect(() => {
    setTab(activeSection);
  }, [activeSection]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const storageKey = "taptu-device-id";
    const existing = localStorage.getItem(storageKey);
    const deviceId = existing ?? `device-${Math.random().toString(36).slice(2, 10)}`;
    if (!existing) {
      localStorage.setItem(storageKey, deviceId);
    }
    setAttendanceCapture((current) => ({ ...current, deviceId }));
  }, []);

  useEffect(() => {
    if (!session) {
      return;
    }

    getDashboard(session.token)
      .then((data: DashboardPayload) => {
        setGreeting(data.greeting);
        setStats(data.stats);
        setSchedule(data.schedule);
        if (!isAdmin) {
          setAttendance(normalizeAttendanceHistoryItems(data.attendance));
        }
        setAttendanceState(data.attendanceState ?? "idle");
        if (!isManager) {
          setRequests(data.requests);
        }
        setScannerToken(data.scannerToken);
        setDashboardLoaded(true);
        setPageError(null);
      })
      .catch((error) => {
        clearSession();
        setPageError(error instanceof Error ? error.message : "Workspace gagal dimuat.");
        location.assign("/login");
      });
  }, [session?.token]);

  useEffect(() => {
    if (!session) {
      return;
    }

    if ((tab === "history" || (tab === "attendance" && isEmployee)) && !attendanceHistoryLoaded) {
      setAttendanceHistoryError(null);
      fetchAttendanceHistoryByFilter(session.token, historyFilter)
        .then((items) => {
          const normalizedItems = normalizeAttendanceHistoryItems(items);
          setAttendance(normalizedItems);
          setAttendanceHistoryLoaded(true);
        })
        .catch((error) => {
          setAttendanceHistoryError(error instanceof Error ? error.message : "Riwayat absensi gagal dimuat.");
          setAttendanceHistoryLoaded(true);
        });
    }

    if (tab === "home" && (isAdmin || isManager) && !adminOverview && !adminOverviewLoaded) {
      const loadOverview = isManager ? fetchManagerOverview : fetchAdminOverview;
      loadOverview(session.token)
        .then((data) => {
          setAdminOverview(data);
          setAdminOverviewLoaded(true);
          setAdminOverviewError(null);
        })
        .catch((error) => {
          setAdminOverviewLoaded(true);
          setAdminOverviewError(error instanceof Error ? error.message : isManager ? "Ringkasan tim gagal dimuat." : "Ringkasan admin gagal dimuat.");
        });
    }

    if ((tab === "home" || tab === "attendance" || tab === "schedule" || tab === "payslip" || tab === "profile") && isEmployee && !employeeSummary && !employeeSummaryLoaded) {
      fetchEmployeeSummary(session.token)
        .then((data) => {
          setEmployeeSummary(data);
          setEmployeeSummaryLoaded(true);
          setEmployeeSummaryError(null);
        })
        .catch((error) => {
          setEmployeeSummaryLoaded(true);
          setEmployeeSummaryError(error instanceof Error ? error.message : "Status absensi pribadi gagal dimuat.");
        });
    }

    if (tab === "attendance" && isAdmin && !adminAttendanceLoaded) {
      setAdminAttendanceError(null);
      fetchReportRows(session.token)
        .then((rows) => {
          setAdminAttendanceRows(rows);
          setAdminAttendanceLoaded(true);
        })
        .catch((error) => {
          setAdminAttendanceLoaded(true);
          setAdminAttendanceError(error instanceof Error ? error.message : "Presensi organisasi gagal dimuat.");
        });
    }

    if (tab === "scanner" && !scannerLoaded && (isScanner || isAdmin)) {
      setScannerError(null);
      fetchScannerState(session.token)
        .then((response) => {
          setScannerToken(response.token);
          setScannerMeta({
            expiresInSeconds: response.expiresInSeconds,
            scansToday: response.scansToday,
            locationName: response.locationName
          });
          setScannerScans(response.recentScans);
          setScannerLoaded(true);
        })
        .catch((error) => {
          setScannerLoaded(true);
          setScannerError(error instanceof Error ? error.message : "Status scanner gagal dimuat.");
        });
    }

    if (tab === "requests" && isManager && !managerRequestsLoaded) {
      setManagerRequestsError(null);
      fetchManagerRequests(session.token)
        .then((items) => {
          setRequests(items);
          setManagerRequestsLoaded(true);
        })
        .catch((error) => {
          setRequests([]);
          setManagerRequestsLoaded(true);
          setManagerRequestsError(error instanceof Error ? error.message : "Daftar pengajuan tim gagal dimuat.");
        });
    }

    if (tab === "notifications" && !notificationsLoaded) {
      setNotificationsError(null);
      fetchNotifications(session.token)
        .then((items) => {
          setNotifications(items);
          setNotificationsLoaded(true);
        })
        .catch((error) => {
          setNotificationsLoaded(true);
          setNotificationsError(error instanceof Error ? error.message : "Notifikasi gagal dimuat.");
        });
    }

    if ((tab === "team" || tab === "exceptions") && (isAdmin || isManager) && !exceptionQueueLoaded) {
      const loadExceptions = isManager ? fetchManagerExceptionQueue : fetchExceptionQueue;
      setExceptionQueueError(null);
      loadExceptions(session.token)
        .then((items) => {
          setExceptionQueue(items);
          setExceptionQueueLoaded(true);
        })
        .catch((error) => {
          setExceptionQueueLoaded(true);
          setExceptionQueueError(error instanceof Error ? error.message : "Exception queue gagal dimuat.");
        });
    }

    if ((tab === "team" || tab === "structure" || tab === "exceptions" || (tab === "reports" && isAdmin) || (tab === "attendance" && isManager)) && (isAdmin || isManager) && !employeeListLoaded) {
      const loadEmployees = isManager ? fetchManagerEmployeeList : fetchEmployeeList;
      setEmployeeListError(null);
      loadEmployees(session.token)
        .then((items) => {
          setEmployeeList(items);
          setEmployeeListLoaded(true);
        })
        .catch((error) => {
          setEmployeeListLoaded(true);
          setEmployeeListError(error instanceof Error ? error.message : "Daftar karyawan gagal dimuat.");
        });
    }

    if ((tab === "team" || tab === "structure" || tab === "reports") && isAdmin && !departmentsLoaded) {
      setDepartmentsError(null);
      Promise.resolve(fetchDepartments(session.token) ?? [])
        .then((items) => {
          setDepartments(items ?? []);
          setDepartmentsLoaded(true);
        })
        .catch((error) => {
          setDepartmentsLoaded(true);
          setDepartmentsError(error instanceof Error ? error.message : "Daftar divisi gagal dimuat.");
        });
    }

    if (tab === "locations" && (isAdmin || isManager) && !workLocationsLoaded) {
      setWorkLocationsError(null);
      fetchWorkLocations(session.token)
        .then((items) => {
          setWorkLocations(items);
          setWorkLocationsLoaded(true);
        })
        .catch((error) => {
          setWorkLocationsLoaded(true);
          setWorkLocationsError(error instanceof Error ? error.message : "Daftar lokasi kerja gagal dimuat.");
        });
    }

    if (tab === "locations" && (isAdmin || isManager) && !shiftsLoaded) {
      setShiftsError(null);
      fetchShifts(session.token)
        .then((items) => {
          setShifts(items);
          setShiftsLoaded(true);
        })
        .catch((error) => {
          setShiftsLoaded(true);
          setShiftsError(error instanceof Error ? error.message : "Daftar shift gagal dimuat.");
        });
    }

    if (tab === "reports" && (isAdmin || isManager) && !auditLogsLoaded) {
      fetchAuditLogs(session.token)
        .then((items) => {
          setAuditLogs(items);
          setAuditLogsLoaded(true);
        })
        .catch(() => {
          setAuditLogsLoaded(true);
        });
    }

    if (tab === "reports" && (isAdmin || isManager) && !reportLoaded) {
      setReportError(null);
      fetchReportRows(session.token)
        .then((rows) => {
          setReportRows(rows);
          setReportLoaded(true);
          setReportError(null);
        })
        .catch((error) => {
          setReportLoaded(true);
          setReportError(error instanceof Error ? error.message : "Laporan gagal dimuat.");
        });
    }
  }, [adminAttendanceLoaded, adminOverview, adminOverviewLoaded, attendanceHistoryLoaded, auditLogsLoaded, departmentsLoaded, employeeListLoaded, employeeSummary, employeeSummaryLoaded, exceptionQueueLoaded, historyFilter, isAdmin, isEmployee, isManager, isScanner, managerRequestsLoaded, notificationsLoaded, reportLoaded, scannerLoaded, session, shiftsLoaded, tab, workLocationsLoaded]);

  useEffect(() => {
    if (tab !== "scanner" || !scannerMeta) {
      return;
    }

    const timer = window.setInterval(() => {
      setScannerMeta((current) =>
        current
          ? {
              ...current,
              expiresInSeconds: nextScannerCountdown(current.expiresInSeconds)
            }
          : current
      );
    }, 1000);

    return () => window.clearInterval(timer);
  }, [scannerMeta, tab]);

  const departmentOptions = useMemo(() => {
    return departments
      .filter((department) => department.isActive !== false)
      .map((department) => ({ id: department.id, name: department.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [departments]);

  const departmentUnavailableReason = departmentsError
    ? `Backend divisi belum tersedia: ${departmentsError}`
    : !departmentsLoaded
      ? "Daftar divisi masih dimuat."
      : undefined;

  const managerOptions = useMemo(() => {
    return employeeList
      .filter((employee) => employee.role === "manager")
      .map((employee) => ({ value: employee.id, label: employee.fullName }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [employeeList]);

  function getDepartmentActionMenuPosition(rect: DOMRect): DepartmentActionMenuPosition {
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 1024;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 768;
    const width = DEPARTMENT_ACTION_MENU_WIDTH;
    const estimatedHeight = 176;
    const left = Math.min(
      Math.max(DEPARTMENT_ACTION_MENU_MARGIN, rect.right - width),
      Math.max(DEPARTMENT_ACTION_MENU_MARGIN, viewportWidth - width - DEPARTMENT_ACTION_MENU_MARGIN)
    );
    const spaceBelow = viewportHeight - rect.bottom - DEPARTMENT_ACTION_MENU_MARGIN;
    const spaceAbove = rect.top - DEPARTMENT_ACTION_MENU_MARGIN;

    if (spaceBelow < 176 && spaceAbove > spaceBelow) {
      return {
        bottom: Math.max(DEPARTMENT_ACTION_MENU_MARGIN, viewportHeight - rect.top + 4),
        left,
        width
      };
    }

    return {
      top: Math.max(
        DEPARTMENT_ACTION_MENU_MARGIN,
        Math.min(rect.bottom + 4, viewportHeight - estimatedHeight - DEPARTMENT_ACTION_MENU_MARGIN)
      ),
      left,
      width
    };
  }

  function closeDepartmentActionMenu() {
    setOpenDepartmentActionId(null);
    setDepartmentActionMenuPosition(null);
  }

  function toggleDepartmentActionMenu(departmentId: string, event: ReactMouseEvent<HTMLButtonElement>) {
    setDepartmentActionError(null);

    if (openDepartmentActionId === departmentId) {
      closeDepartmentActionMenu();
      return;
    }

    departmentActionButtonRefs.current[departmentId] = event.currentTarget;
    setDepartmentActionMenuPosition(getDepartmentActionMenuPosition(event.currentTarget.getBoundingClientRect()));
    setOpenDepartmentActionId(departmentId);
  }

  useEffect(() => {
    if (!openDepartmentActionId) return;
    const activeDepartmentActionId = openDepartmentActionId;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      const activeTrigger = departmentActionButtonRefs.current[activeDepartmentActionId];
      closeDepartmentActionMenu();
      activeTrigger?.focus();
    }

    function handleMouseDown(event: MouseEvent) {
      const target = event.target as Node;
      const activeTrigger = departmentActionButtonRefs.current[activeDepartmentActionId];
      if (activeTrigger?.contains(target) || departmentActionMenuRef.current?.contains(target)) return;
      closeDepartmentActionMenu();
    }

    function handleViewportChange() {
      const activeTrigger = departmentActionButtonRefs.current[activeDepartmentActionId];
      if (!activeTrigger) {
        closeDepartmentActionMenu();
        return;
      }

      setDepartmentActionMenuPosition(getDepartmentActionMenuPosition(activeTrigger.getBoundingClientRect()));
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [openDepartmentActionId]);

  const filteredEmployees = useMemo(() => {
    const normalizedSearch = employeeSearch.trim().toLowerCase();
    return employeeList.filter((emp) => {
      if (!isManager && employeeDepartmentFilter && emp.departmentId !== employeeDepartmentFilter) return false;
      if (!isManager && employeeStatusFilter && emp.todayStatus !== employeeStatusFilter) return false;
      if (!normalizedSearch) return true;
      return [
        emp.fullName,
        emp.email,
        emp.employeeCode ?? "",
        isManager ? emp.departmentName ?? "" : "",
        isManager ? emp.managerName ?? "" : ""
      ].some((value) => value.toLowerCase().includes(normalizedSearch));
    });
  }, [employeeList, employeeSearch, employeeDepartmentFilter, employeeStatusFilter, isManager]);

  const divisiList = useMemo(() => {
    const map = new Map<string, { name: string; employees: EmployeeListItem[] }>();
    employeeList.forEach((emp) => {
      if (!emp.departmentId || !emp.departmentName) return;
      if (!map.has(emp.departmentId)) {
        map.set(emp.departmentId, { name: emp.departmentName, employees: [] });
      }
      map.get(emp.departmentId)!.employees.push(emp);
    });
    return Array.from(map, ([id, data]) => {
      const uniqueManagers = [...new Set(data.employees.map((e) => e.managerName).filter(Boolean))];
      return {
        id,
        name: data.name,
        memberCount: data.employees.length,
        managerName: uniqueManagers.length > 0 ? uniqueManagers.join(", ") : null
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [employeeList]);

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  const currentSession = session;
  const isConnectedDemoUser = currentSession.user.organizationName === "Taptu Demo Company";

  function setActionMessage(message: string, tone: "ok" | "err" = "ok") {
    setFeedback({ message, tone });
    window.setTimeout(() => setFeedback(null), 2800);
  }

  function updateEmployeeRecord(partial: Partial<AttendanceRecord>, nextState: "idle" | "checked_in" | "checked_out") {
    if (!employeeSummary) {
      return;
    }

    setEmployeeSummary({
      ...employeeSummary,
      currentAttendanceState: nextState,
      todayRecord: {
        ...employeeSummary.todayRecord,
        ...partial,
        updatedAt: new Date().toISOString()
      }
    });
  }

  async function refreshEmployeeAttendanceHistory() {
    setAttendanceHistoryError(null);

    try {
      const items = await fetchAttendanceHistoryByFilter(currentSession.token, historyFilter);
      const normalizedItems = normalizeAttendanceHistoryItems(items);
      setAttendance(normalizedItems);
      setAttendanceHistoryLoaded(true);
    } catch (error) {
      setAttendanceHistoryError(error instanceof Error ? error.message : "Riwayat absensi gagal dimuat.");
      setAttendanceHistoryLoaded(true);
    }
  }

  async function refreshEmployeeAttendanceSummary() {
    if (!isEmployee) {
      return;
    }

    setEmployeeSummaryError(null);

    try {
      const summary = await fetchEmployeeSummary(currentSession.token);
      setEmployeeSummary(summary);
      setEmployeeSummaryLoaded(true);
      setAttendanceState(summary.currentAttendanceState);
    } catch (error) {
      setEmployeeSummaryError(error instanceof Error ? error.message : "Status absensi pribadi gagal dimuat.");
      setEmployeeSummaryLoaded(true);
    }
  }

  async function handleVerifyAttendanceDevice() {
    if (!navigator.geolocation) {
      setAttendanceTrustSignal({
        serverTimeSkewMinutes: 0,
        mockLocationDetected: true
      });
      setActionMessage("Perangkat ini tidak mendukung verifikasi lokasi.", "err");
      return;
    }

    setBusyAction("verify-device");

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 9000
        });
      });

      const distance = isConnectedDemoUser
        ? 0
        : calculateDistanceMeters(
            {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            },
            {
              latitude: secureAttendancePolicy.officeLatitude,
              longitude: secureAttendancePolicy.officeLongitude
            }
          );

      setAttendanceTrustSignal({
        serverTimeSkewMinutes: 0,
        distanceFromOfficeMeters: distance,
        locationAccuracyMeters: position.coords.accuracy,
        mockLocationDetected: false
      });
      setAttendanceCapture((current) => ({
        ...current,
        locationLat: position.coords.latitude,
        locationLng: position.coords.longitude
      }));
      setActionMessage("Verifikasi perangkat selesai.");
    } catch {
      setAttendanceTrustSignal({
        serverTimeSkewMinutes: 0,
        mockLocationDetected: true
      });
      setActionMessage("Lokasi tidak bisa diverifikasi. Izinkan GPS lalu coba lagi.", "err");
    } finally {
      setBusyAction(null);
    }
  }

  function buildPendingCheckIn(method: "QR" | "Selfie", capturedSelfie?: CapturedSelfie): PendingCheckIn | null {
    if (!employeeSummary) {
      setActionMessage("Ringkasan shift belum siap. Muat ulang Presensi lalu coba lagi.", "err");
      return null;
    }

    if (!attendanceTrust.canClock) {
      return {
        method,
        capturedAt: new Date().toISOString(),
        locationName: employeeSummary.assignedShift.locationName,
        shiftName: employeeSummary.assignedShift.name,
        validationStatus: "blocked",
        validationReasons: [`${attendanceTrust.title}. Verifikasi perangkat atau izinkan lokasi sebelum submit.`],
        scannerToken: method === "QR" ? scannerToken : undefined,
        selfie: capturedSelfie
      };
    }

    return {
      method,
      capturedAt: new Date().toISOString(),
      locationName: employeeSummary.assignedShift.locationName,
      shiftName: employeeSummary.assignedShift.name,
      validationStatus: capturedSelfie || method === "QR" ? "verified" : "needs_review",
      validationReasons: capturedSelfie || method === "QR" ? ["Lokasi dan perangkat siap divalidasi."] : ["Foto wajah belum dilampirkan."],
      scannerToken: method === "QR" ? scannerToken : undefined,
      selfie: capturedSelfie
    };
  }

  function handleQrScan() {
    const pending = buildPendingCheckIn("QR");
    if (!pending) {
      return;
    }
    setPendingCheckIn(pending);
    setSubmittedCheckIn(null);
    setCheckInFlowState("qr_scanned");
    setActionMessage("QR terbaca. Cek ringkasan sebelum submit.");
  }

  function handleOpenFaceCamera() {
    const input = selfieInputRef.current;
    if (!input) {
      setActionMessage("Kamera belum siap. Muat ulang tab Presensi lalu coba lagi.", "err");
      return;
    }
    input.click();
  }

  function handleUseCapturedFace() {
    if (!pendingCheckIn) {
      setActionMessage("Ambil foto wajah terlebih dahulu.", "err");
      return;
    }
    setCheckInFlowState("confirmation");
  }

  function handleConfirmPendingCheckIn() {
    if (!pendingCheckIn) {
      setActionMessage("Belum ada hasil scan atau foto untuk dikonfirmasi.", "err");
      return;
    }
    setCheckInFlowState("confirmation");
  }

  function handleContinueToFaceVerification() {
    setCheckInMode("face");
    setCheckInFlowState("idle");
    setActionMessage("Lanjutkan dengan foto wajah.");
  }

  // CODEX: face check-in issues to investigate on backend side:
  // 1. POST /attendance/checkin with method:"Selfie" — verify selfie_url / selfie_data is saved to DB (not silently dropped)
  // 2. Confirm selfie_url column is nullable in attendance_records; if NOT NULL, selfie-less check-ins will silently fail
  // 3. After successful Selfie check-in, confirm attendanceState returns "checked_in" so frontend shows success and refreshes history
  // 4. Verify fetchAttendanceHistoryByFilter re-fetches from DB after check-in and includes today's record
  async function submitCheckIn(pending: PendingCheckIn) {
    if (checkInFlowState === "submitting") {
      return;
    }

    setCheckInFlowState("submitting");
    setBusyAction("checkin");
    const selfiePreviewUrl = pending.selfie?.previewUrl ?? attendanceCapture.selfieUrl;
    const selfieData = pending.selfie?.dataUrl ?? attendanceCapture.selfieData;

    try {
      const response = await checkIn(currentSession.token, {
        method: pending.method,
        locationLat: attendanceCapture.locationLat,
        locationLng: attendanceCapture.locationLng,
        selfieUrl: undefined,
        selfieData,
        selfieFileName: pending.selfie?.fileName ?? attendanceCapture.selfieFileName,
        selfieContentType: pending.selfie?.contentType ?? attendanceCapture.selfieContentType,
        deviceId: attendanceCapture.deviceId || undefined,
        requiredSelfie: pending.method === "Selfie" ? true : attendanceCapture.requiredSelfie,
        scannerToken: pending.scannerToken
      });
      const [record] = normalizeAttendanceHistoryItems([response.record]);
      setAttendanceState(response.attendanceState);
      setAttendance((current) => [record, ...current.filter((item) => item.day !== "Hari ini")]);
      updateEmployeeRecord(
        {
          checkInTime: new Date().toISOString(),
          status: response.record.status === "Terlambat" ? "Terlambat" : "Tepat waktu",
          validationStatus: response.validationStatus ?? "verified",
          validationReasons: response.validationReasons ?? []
        },
        response.attendanceState
      );
      const submitted: PendingCheckIn = {
        ...pending,
        capturedAt: new Date().toISOString(),
        validationStatus: response.validationStatus ?? pending.validationStatus,
        validationReasons: response.validationReasons?.length ? response.validationReasons : pending.validationReasons
      };
      setSubmittedCheckIn(submitted);
      setPendingCheckIn(null);
      setCheckInFlowState("success");
      if (selfiePreviewUrl) {
        setActionMessage(response.validationStatus === "needs_review" ? "Check-in berhasil. Bukti selfie menunggu review." : "Check-in berhasil.");
      } else {
        setActionMessage(response.validationStatus === "needs_review" ? "Check-in tersimpan dan menunggu review." : "Check-in berhasil tersimpan.");
      }
      await refreshEmployeeAttendanceSummary();
      await refreshEmployeeAttendanceHistory();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Check-in gagal.", "err");
      setCheckInFlowState("confirmation");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCheckIn() {
    if (!pendingCheckIn) {
      setActionMessage("Konfirmasi check-in belum lengkap.", "err");
      return;
    }
    await submitCheckIn(pendingCheckIn);
  }

  async function handleCheckOut() {
    setBusyAction("checkout");

    try {
      const response = await checkOut(currentSession.token, {
        method: "Manual",
        locationLat: attendanceCapture.locationLat,
        locationLng: attendanceCapture.locationLng,
        selfieUrl: attendanceCapture.selfieUrl || undefined,
        deviceId: attendanceCapture.deviceId || undefined
      });
      const [record] = normalizeAttendanceHistoryItems([response.record]);
      setAttendanceState(response.attendanceState);
      setAttendance((current) => [record, ...current.filter((item) => item.day !== "Hari ini")]);
      updateEmployeeRecord(
        {
          checkOutTime: new Date().toISOString(),
          status: "Selesai",
          validationStatus: response.validationStatus ?? "verified",
          validationReasons: response.validationReasons ?? []
        },
        response.attendanceState
      );
      setActionMessage(response.validationStatus === "needs_review" ? "Check-out tersimpan dan perlu review admin." : "Check-out berhasil tersimpan.");
      await refreshEmployeeAttendanceSummary();
      await refreshEmployeeAttendanceHistory();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Check-out gagal.", "err");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSelfieUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setCheckInFlowState("idle");
      setActionMessage("Selfie belum diambil. Coba check-in lagi lalu izinkan kamera.", "err");
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const previewUrl = URL.createObjectURL(file);
      const capturedSelfie = {
        previewUrl,
        dataUrl,
        fileName: file.name,
        contentType: file.type || "image/jpeg"
      };

      setAttendanceCapture((current) => ({
        ...current,
        selfieUrl: previewUrl,
        selfieData: dataUrl,
        selfieFileName: file.name,
        selfieContentType: file.type || "image/jpeg"
      }));
      const pending = buildPendingCheckIn("Selfie", capturedSelfie);
      if (!pending) {
        return;
      }
      setPendingCheckIn(pending);
      setSubmittedCheckIn(null);
      setCheckInFlowState("face_captured");
      setActionMessage("Foto wajah siap. Gunakan foto ini untuk lanjut.");
    } catch (error) {
      setCheckInFlowState("idle");
      setActionMessage(error instanceof Error ? error.message : "Selfie belum bisa diproses.", "err");
    }
  }

  async function handleCreateRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateRequestForm(requestForm);

    if (validationError) {
      setRequestFormError(validationError);
      setActionMessage(validationError, "err");
      return;
    }

    setRequestFormError(null);
    setBusyAction("create-request");

    try {
      const response = await createRequest(currentSession.token, requestForm as Record<string, unknown> & typeof requestForm);
      setRequests((current) => [response.request, ...current]);
      setRequestForm({ category: "Izin", startDate: "", endDate: "", title: "", detail: "", correctionDate: undefined, correctionType: undefined, correctionTime: undefined, forgetType: undefined, estimatedTime: undefined });
      setActionMessage("Pengajuan izin berhasil dikirim.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Pengajuan izin gagal.", "err");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleApproval(id: string, status: "Disetujui" | "Ditolak") {
    if (status === "Ditolak" && !(approvalNotes[id] ?? "").trim()) {
      setApprovalErrors((current) => ({ ...current, [id]: "Tambahkan catatan agar alasan penolakan jelas untuk karyawan." }));
      return;
    }

    setApprovalErrors((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setBusyAction(`${status}-${id}`);

    try {
      const response = await approveRequest(currentSession.token, id, status, approvalNotes[id]);
      setRequests((current) => current.map((item) => (item.id === id ? response.request : item)));
      setActionMessage(
        isManager && status === "Disetujui"
          ? "Pengajuan diteruskan ke HR untuk keputusan final."
          : status === "Disetujui"
            ? "Pengajuan disetujui."
            : "Pengajuan ditolak."
      );
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Approval gagal.", "err");
    } finally {
      setBusyAction(null);
    }
  }

  async function reloadRequests() {
    setBusyAction("reload-requests");

    try {
      const next = isManager
        ? await fetchManagerRequests(currentSession.token)
        : await fetchRequests(currentSession.token, canReviewRequests);
      setRequests(next);
      if (isManager) {
        setManagerRequestsLoaded(true);
        setManagerRequestsError(null);
      }
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Daftar pengajuan gagal dimuat.", "err");
    } finally {
      setBusyAction(null);
    }
  }

  async function openRequestDetail(id: string) {
    setBusyAction(`detail-${id}`);

    try {
      const detail = await fetchRequestDetail(currentSession.token, id);
      setRequestDetail(detail);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Detail pengajuan gagal dimuat.", "err");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCancelRequest(id: string) {
    setBusyAction(`cancel-${id}`);

    try {
      await cancelRequest(currentSession.token, id);
      setRequests((current) => current.filter((item) => item.id !== id));
      if (requestDetail?.id === id) {
        setRequestDetail(null);
      }
      setActionMessage("Pengajuan berhasil dibatalkan.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Pengajuan gagal dibatalkan.", "err");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRefreshScannerToken() {
    setBusyAction("refresh-scanner");

    try {
      const response = await refreshScannerToken(currentSession.token);
      setScannerToken(response.token);
      setScannerMeta({
        expiresInSeconds: response.expiresInSeconds,
        scansToday: response.scansToday,
        locationName: response.locationName
      });
      setScannerLoaded(true);
      setScannerError(null);
      setActionMessage("Token scanner berhasil diperbarui.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Token scanner gagal diperbarui.", "err");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleExceptionDecision(id: string, status: "Approved" | "Rejected" | "Request Correction") {
    if (status !== "Approved" && !(exceptionNotes[id] ?? "").trim()) {
      setExceptionErrors((current) => ({ ...current, [id]: "Tambahkan catatan agar keputusan review bisa ditindaklanjuti." }));
      return;
    }

    setExceptionErrors((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setBusyAction(`exception-${status}-${id}`);

    try {
      const response = await reviewException(currentSession.token, id, {
        status,
        adminNote: exceptionNotes[id] || "Ditinjau dari queue operasional."
      });
      setExceptionQueue((current) =>
        current.map((item) => (item.id === id && response.exception ? response.exception : item))
      );
      setActionMessage("Exception diperbarui.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Exception gagal diperbarui.", "err");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSubmitDivisiForm(e: React.FormEvent) {
    e.preventDefault();
    if (!divisiForm.name.trim()) {
      setDivisiFormError("Nama divisi wajib diisi.");
      return;
    }
    const key = editingDivisi ? `edit-divisi-${editingDivisi.id}` : "create-divisi";
    setBusyAction(key);
    setDivisiFormError(null);
    try {
      let savedDepartment: DepartmentItem;
      if (editingDivisi) {
        savedDepartment = await updateDepartment(currentSession.token, editingDivisi.id, {
          name: divisiForm.name.trim(),
          managerId: divisiForm.managerId || null
        });
        setDepartments((current) => current.map((department) => department.id === editingDivisi.id ? savedDepartment : department));
        setEmployeeList((current) => current.map((employee) =>
          employee.departmentId === editingDivisi.id
            ? { ...employee, departmentName: savedDepartment.name }
            : employee
        ));
      } else {
        savedDepartment = await createDepartment(currentSession.token, {
          name: divisiForm.name.trim(),
          managerId: divisiForm.managerId || null
        });
        setDepartments((current) => [...current.filter((department) => department.id !== savedDepartment.id), savedDepartment]);
      }
      fetchDepartments(currentSession.token)
        .then((refreshed) => setDepartments(refreshed))
        .catch((error) => {
          setDepartmentsError(error instanceof Error ? error.message : "Daftar divisi gagal dimuat ulang.");
        });
      setDivisiFormOpen(false);
      setEditingDivisi(null);
      setDivisiForm({ name: "", managerId: "" });
      setActionMessage(editingDivisi ? "Divisi berhasil diperbarui." : "Divisi baru berhasil ditambahkan.");
    } catch (error) {
      setDivisiFormError(error instanceof Error ? error.message : "Gagal menyimpan divisi.");
    } finally {
      setBusyAction(null);
    }
  }

  function openDepartmentForm(department: DepartmentItem) {
    setEditingDivisi(department);
    setDivisiForm({ name: department.name, managerId: department.managerId ?? "" });
    setDivisiFormError(null);
    setDepartmentActionError(null);
    closeDepartmentActionMenu();
    setDivisiFormOpen(true);
  }

  function handleViewDepartmentMembers(departmentId: string) {
    setEmployeeDepartmentFilter(departmentId);
    setDepartmentActionError(null);
    closeDepartmentActionMenu();
    setTab("team");
    navigate("/app/team");
  }

  async function handleDeactivateDepartment(department: DepartmentItem) {
    closeDepartmentActionMenu();

    if ((department.memberCount ?? 0) > 0) {
      setDepartmentActionError("Divisi ini masih memiliki anggota. Pindahkan anggota terlebih dahulu atau nonaktifkan divisi.");
      return;
    }

    setDepartmentActionError(null);
    setBusyAction(`deactivate-divisi-${department.id}`);

    try {
      const updated = await updateDepartment(currentSession.token, department.id, { isActive: false });
      setDepartments((current) => current.map((item) => item.id === department.id ? updated : item));
      fetchDepartments(currentSession.token)
        .then((refreshed) => setDepartments(refreshed))
        .catch((error) => {
          setDepartmentsError(error instanceof Error ? error.message : "Daftar divisi gagal dimuat ulang.");
        });
      setActionMessage("Divisi berhasil dinonaktifkan.");
    } catch (error) {
      setDepartmentActionError(error instanceof Error ? error.message : "Gagal menonaktifkan divisi.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleUbahPenempatan(e: React.FormEvent) {
    e.preventDefault();
    if (!ubahPenempatanEmployee) return;
    setBusyAction(`ubah-penempatan-${ubahPenempatanEmployee.id}`);
    setUbahPenempatanError(null);
    try {
      const updatedEmployee = await reassignEmployeeDepartment(currentSession.token, ubahPenempatanEmployee.id, {
        departmentId: ubahPenempatanDeptId || null
      });
      setEmployeeList((current) => current.map((employee) => employee.id === updatedEmployee.id ? updatedEmployee : employee));
      fetchEmployeeList(currentSession.token)
        .then((refreshed) => setEmployeeList(refreshed))
        .catch((error) => {
          setEmployeeListError(error instanceof Error ? error.message : "Daftar karyawan gagal dimuat ulang.");
        });
      setUbahPenempatanEmployee(null);
      setUbahPenempatanDeptId("");
      setActionMessage("Penempatan karyawan berhasil diperbarui.");
    } catch (error) {
      setUbahPenempatanError(error instanceof Error ? error.message : "Gagal mengubah penempatan karyawan.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleApplyReportFilters() {
    if (reportFilters.dateFrom && reportFilters.dateTo && reportFilters.dateFrom > reportFilters.dateTo) {
      const message = "Tanggal akhir harus sama atau setelah tanggal mulai.";
      setReportFilterError(message);
      setActionMessage(message, "err");
      return;
    }

    setReportFilterError(null);
    setBusyAction("report-filter");
    try {
      const rows = await fetchReportRows(currentSession.token, {
        dateFrom: reportFilters.dateFrom || undefined,
        dateTo: reportFilters.dateTo || undefined,
        employeeId: reportFilters.employeeId || undefined,
        departmentId: reportFilters.departmentId || undefined,
        status: reportFilters.status || undefined
      });
      setReportRows(rows);
      setReportLoaded(true);
      setReportError(null);
    } catch (error) {
      setReportError(error instanceof Error ? error.message : "Laporan gagal dimuat.");
      setActionMessage(error instanceof Error ? error.message : "Laporan gagal dimuat.", "err");
    } finally {
      setBusyAction(null);
    }
  }

  function handleExportCsv() {
    if (reportRows.length === 0) {
      setActionMessage("Tidak ada data untuk diekspor.", "err");
      return;
    }
    const today = new Date().toISOString().slice(0, 7);
    exportReportCsv(reportRows, `taptu-attendance-report-${today}.csv`);
    setActionMessage("CSV berhasil diekspor.");
  }

  async function handleSaveLocation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const latitude = Number(locationForm.latitude);
    const longitude = Number(locationForm.longitude);
    const radiusMeters = Number(locationForm.radiusMeters);

    if (!locationForm.name.trim()) {
      setLocationFormError("Nama lokasi wajib diisi.");
      return;
    }
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setLocationFormError("Latitude dan longitude harus berupa angka yang valid.");
      return;
    }
    if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) {
      setLocationFormError("Radius lokasi harus lebih dari 0 meter.");
      return;
    }

    setLocationFormError(null);
    setBusyAction("save-location");
    try {
      const payload = {
        name: locationForm.name,
        address: locationForm.address || undefined,
        latitude,
        longitude,
        radiusMeters
      };
      if (editingLocation) {
        const updated = await updateWorkLocation(currentSession.token, editingLocation.id, payload);
        setWorkLocations((current) => current.map((l) => l.id === editingLocation.id ? updated : l));
        setActionMessage("Lokasi berhasil diperbarui.");
      } else {
        const created = await createWorkLocation(currentSession.token, payload);
        setWorkLocations((current) => [...current, created]);
        setActionMessage("Lokasi baru berhasil ditambahkan.");
      }
      setLocationFormOpen(false);
      setEditingLocation(null);
      setLocationForm({ name: "", address: "", latitude: "", longitude: "", radiusMeters: "150" });
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Lokasi gagal disimpan.", "err");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSaveShift(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const gracePeriodMinutes = Number(shiftForm.gracePeriodMinutes);

    if (!shiftForm.name.trim() || !shiftForm.startTime || !shiftForm.endTime) {
      setShiftFormError("Nama shift, jam mulai, dan jam selesai wajib diisi.");
      return;
    }
    if (!Number.isFinite(gracePeriodMinutes) || gracePeriodMinutes < 0) {
      setShiftFormError("Toleransi terlambat harus 0 menit atau lebih.");
      return;
    }
    if (shiftForm.breakStartTime && shiftForm.breakEndTime && shiftForm.breakStartTime >= shiftForm.breakEndTime) {
      setShiftFormError("Jam istirahat selesai harus setelah jam istirahat mulai.");
      return;
    }

    setShiftFormError(null);
    setBusyAction("save-shift");
    try {
      const location = workLocations.find((l) => l.id === shiftForm.workLocationId);
      const payload = {
        name: shiftForm.name,
        startTime: shiftForm.startTime,
        endTime: shiftForm.endTime,
        gracePeriodMinutes,
        workLocationId: shiftForm.workLocationId || undefined,
        workLocationName: location?.name,
        breakStartTime: shiftForm.breakStartTime || undefined,
        breakEndTime: shiftForm.breakEndTime || undefined
      };
      if (editingShift) {
        const updated = await updateShift(currentSession.token, editingShift.id, payload);
        setShifts((current) => current.map((s) => s.id === editingShift.id ? updated : s));
        setActionMessage("Shift berhasil diperbarui.");
      } else {
        const created = await createShift(currentSession.token, payload);
        setShifts((current) => [...current, created]);
        setActionMessage("Shift baru berhasil ditambahkan.");
      }
      setShiftFormOpen(false);
      setEditingShift(null);
      setShiftForm({ name: "", startTime: "", endTime: "", gracePeriodMinutes: "10", workLocationId: "", breakStartTime: "", breakEndTime: "" });
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Shift gagal disimpan.", "err");
    } finally {
      setBusyAction(null);
    }
  }

  function renderAdminDashboard() {
    if (adminOverviewError) {
      return <ErrorState title="Ringkasan admin belum tersedia" description={`${adminOverviewError} Coba buka ulang workspace atau muat ulang halaman.`} />;
    }

    if (!adminOverview) {
      return <LoadingState label="Memuat ringkasan admin" />;
    }

    const quickActions = [
      { key: "team", label: "Kelola karyawan", icon: Users, description: "Tambah, ubah, dan pantau data karyawan." },
      { key: "requests", label: "Review approval", icon: TimerReset, description: "Tinjau izin dan pengajuan cuti tim." },
      { key: "scanner", label: "Scanner mode", icon: ScanFace, description: "Aktifkan mode kiosk untuk scan QR massal." },
      { key: "reports", label: "Buka laporan", icon: FileClock, description: "Unduh rekap kehadiran dan audit trail." },
      { key: "locations", label: "Atur lokasi", icon: MapPinned, description: "Kelola lokasi dan shift kerja karyawan." }
    ] as const;
    const approvalStages = countApprovalStages(requests);

    return (
      <>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <StatCard label="Hadir hari ini" value={String(adminOverview.checkedInToday)} detail={`${adminOverview.onTimeToday} tepat waktu`} />
          <StatCard label="Terlambat" value={String(adminOverview.lateToday)} detail="Perlu follow-up supervisor" />
          <StatCard label="Belum hadir" value={String(adminOverview.absentToday)} detail={`Dari ${adminOverview.totalEmployees} karyawan`} />
          <StatCard label="Menunggu Manager" value={String(approvalStages.waitingManager)} detail="Tahap persetujuan manager" />
          <StatCard label="Menunggu HR" value={String(approvalStages.waitingHr)} detail="Siap keputusan final HR" />
          <StatCard label="Perlu review" value={String(adminOverview.exceptionCount)} detail="Validasi lokasi atau perangkat" />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <Panel eyebrow="Ringkasan kehadiran hari ini" title="Tim langsung terlihat dari layar pertama">
            {adminOverview.recentActivity.length === 0 ? (
              <EmptyState title="Belum ada aktivitas hadir" description="Aktivitas check-in dan exception akan muncul di sini setelah tim mulai clock-in." />
            ) : (
              <DataTable
                caption="Aktivitas absensi terbaru"
                columns={[
                  { key: "employee", header: "Karyawan" },
                  { key: "event", header: "Kejadian" },
                  { key: "time", header: "Waktu" },
                  { key: "status", header: "Status" }
                ]}
                rows={adminOverview.recentActivity.map((item) => ({
                  id: item.id,
                  employee: (
                    <div>
                      <p className="font-semibold text-[#111827]">{item.employeeName}</p>
                      <p className="mt-1 text-xs font-semibold text-[#667085]">{item.detail}</p>
                    </div>
                  ),
                  event: item.event,
                  time: item.time,
                  status: <StatusBadge tone={item.event === "Butuh review" ? "warning" : "info"}>{item.status}</StatusBadge>
                }))}
              />
            )}
          </Panel>

          <Panel eyebrow="Aksi cepat" title="Operasional HR">
            <div className="grid gap-3">
              {quickActions.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    const next = appNavigation.find((entry) => entry.key === item.key);
                    if (next) {
                      setTab(next.key as AppTabKey);
                      navigate(next.path);
                    }
                  }}
                  className="flex min-w-0 items-center gap-3 rounded-[22px] border border-[#edf0f5] bg-[#f9fafc] px-4 py-3.5 text-left transition hover:border-[#d6def0] hover:bg-white"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-[#1769ff] shadow-sm">
                    <item.icon className="h-4.5 w-4.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#111827]">{item.label}</p>
                    <p className="mt-0.5 text-[12px] leading-5 text-[#7a8495]">{item.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </Panel>
        </section>
      </>
    );
  }

  function renderManagerHome() {
    if (adminOverviewError) {
      return <ErrorState title="Ringkasan tim belum tersedia" description={`${adminOverviewError} Coba buka ulang workspace atau muat ulang halaman.`} />;
    }

    if (!adminOverview) {
      return <LoadingState label="Memuat ringkasan tim" />;
    }

    function navigateTo(key: string) {
      const next = appNavigation.find((entry) => entry.key === key);
      if (next) {
        setTab(next.key as AppTabKey);
        navigate(next.path);
      }
    }

    return (
      <>
        <PageHeader
          eyebrow="Beranda Supervisor"
          title="Selamat datang kembali"
          description={`${now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · Pantau kehadiran dan pengajuan tim Anda hari ini.`}
        />

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Hadir hari ini" value={String(adminOverview.checkedInToday)} detail={`${adminOverview.onTimeToday} tepat waktu`} />
          <StatCard label="Terlambat" value={String(adminOverview.lateToday)} detail="Melewati toleransi shift" />
          <StatCard label="Belum hadir" value={String(adminOverview.absentToday)} detail={`Dari ${adminOverview.totalEmployees} anggota`} />
          <StatCard label="Menunggu approval" value={String(adminOverview.pendingRequests)} detail="Pengajuan menunggu keputusan" />
          <StatCard label="Perlu review" value={String(adminOverview.exceptionCount)} detail="Pengecualian validasi" />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
          <Panel eyebrow="Aktivitas tim hari ini" title="Check-in dan check-out terbaru">
            {adminOverview.recentActivity.length === 0 ? (
              <EmptyState
                title="Belum ada presensi tim"
                description="Aktivitas tim akan muncul setelah anggota tim melakukan check-in."
              />
            ) : (
              <DataTable
                caption="Aktivitas absensi tim hari ini"
                columns={[
                  { key: "employee", header: "Karyawan" },
                  { key: "event", header: "Kejadian" },
                  { key: "time", header: "Waktu" },
                  { key: "status", header: "Status" }
                ]}
                rows={adminOverview.recentActivity.map((item) => ({
                  id: item.id,
                  employee: (
                    <div>
                      <p className="font-semibold text-[#111827]">{item.employeeName}</p>
                      <p className="mt-1 text-xs text-[#667085]">{item.detail}</p>
                    </div>
                  ),
                  event: item.event,
                  time: <span className="tabular-nums">{item.time}</span>,
                  status: <StatusBadge tone={item.event === "Butuh review" ? "warning" : "success"}>{item.status}</StatusBadge>
                }))}
              />
            )}
          </Panel>

          <div className="grid gap-4">
            <Panel eyebrow="Pengajuan menunggu" title="Perlu keputusan Anda">
              {adminOverview.pendingRequests === 0 ? (
                <EmptyState
                  title="Belum ada pengajuan tim"
                  description="Pengajuan dari anggota tim akan muncul di sini."
                />
              ) : (
                <div className="grid gap-3">
                  <p className="text-[13px] leading-6 text-[#596172]">
                    Ada <span className="font-semibold text-[#111827]">{adminOverview.pendingRequests}</span> pengajuan yang menunggu keputusan Anda.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigateTo("requests")}
                    className="flex min-w-0 items-center gap-3 rounded-[20px] border border-[#edf0f5] bg-[#f9fafc] px-4 py-3 text-left transition hover:border-[#d6def0] hover:bg-white"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#1769ff] shadow-sm">
                      <TimerReset className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[#111827]">Buka Pengajuan</p>
                      <p className="mt-0.5 text-[12px] leading-5 text-[#7a8495]">Setujui atau tolak pengajuan tim</p>
                    </div>
                  </button>
                </div>
              )}
            </Panel>

            <Panel eyebrow="Pengecualian validasi" title="Perlu review">
              {adminOverview.exceptionCount === 0 ? (
                <EmptyState
                  title="Belum ada pengecualian"
                  description="Kasus validasi tim akan muncul jika membutuhkan review."
                />
              ) : (
                <div className="grid gap-3">
                  <p className="text-[13px] leading-6 text-[#596172]">
                    Ada <span className="font-semibold text-[#111827]">{adminOverview.exceptionCount}</span> kasus validasi yang menunggu keputusan.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigateTo("exceptions")}
                    className="flex min-w-0 items-center gap-3 rounded-[20px] border border-[#edf0f5] bg-[#f9fafc] px-4 py-3 text-left transition hover:border-[#d6def0] hover:bg-white"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#1769ff] shadow-sm">
                      <ShieldCheck className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[#111827]">Buka Pengecualian</p>
                      <p className="mt-0.5 text-[12px] leading-5 text-[#7a8495]">Tinjau kasus validasi absensi</p>
                    </div>
                  </button>
                </div>
              )}
            </Panel>
          </div>
        </section>
      </>
    );
  }

  function renderEmployeeHome() {
    if (employeeSummaryError) {
      return <ErrorState title="Ringkasan hari ini belum tersedia" description={`${employeeSummaryError} Coba buka ulang Beranda setelah koneksi stabil.`} />;
    }

    if (!employeeSummary) {
      return <LoadingState label="Memuat ringkasan hari ini" />;
    }

    const effectiveState = getEffectiveAttendanceState(employeeSummary, attendanceState);
    const shift = employeeSummary.assignedShift;
    const checkInLabel = formatAttendanceTime(employeeSummary.todayRecord.checkInTime);
    const checkOutLabel = formatAttendanceTime(employeeSummary.todayRecord.checkOutTime);
    const durationLabel = formatAttendanceDuration(employeeSummary.todayRecord.checkInTime, employeeSummary.todayRecord.checkOutTime);
    const statusCopy =
      effectiveState === "checked_out"
        ? {
            title: "Selesai hari ini",
            subtitle: `${checkInLabel}-${checkOutLabel} · Durasi ${durationLabel}`,
            cta: "Lihat riwayat"
          }
        : effectiveState === "checked_in"
          ? {
              title: "Sedang bekerja",
              subtitle: `Check-in ${checkInLabel} · ${shift.locationName}`,
              cta: "Check-out"
            }
          : {
              title: "Belum hadir",
              subtitle: `${shift.name} · ${shift.startTime}-${shift.endTime} · ${shift.locationName}`,
              cta: "Mulai Check-in"
            };

    return (
      <>
        <Panel eyebrow="Beranda" title="Status hari ini" className="border-[#d9e6ff] shadow-[0_18px_46px_rgba(23,105,255,0.08)]">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={effectiveState === "idle" ? "warning" : effectiveState === "checked_in" ? "info" : "success"}>
                  {effectiveState === "idle" ? "Perlu aksi" : effectiveState === "checked_in" ? "Aktif" : "Selesai"}
                </StatusBadge>
                <span className="text-[12px] font-medium text-[#8099c8]">{now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}</span>
              </div>
              <p className="mt-2 text-[16px] font-semibold leading-snug text-[#111827] sm:text-[17px]">{statusCopy.title}</p>
              <p className="mt-1 break-words text-[13px] leading-[1.45] text-[#596172]">{statusCopy.subtitle}</p>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
              <PrimaryButton
                onClick={() => {
                  if (effectiveState === "checked_out") {
                    navigate("/app/history");
                    return;
                  }
                  if (effectiveState === "checked_in") {
                    void handleCheckOut();
                    return;
                  }
                  navigate("/app/attendance");
                }}
                disabled={effectiveState === "checked_in" && busyAction === "checkout"}
                className="w-full"
              >
                {effectiveState === "checked_in" && busyAction === "checkout" ? "Menyimpan..." : statusCopy.cta}
              </PrimaryButton>
              <SecondaryButton onClick={() => navigate("/app/schedule")} className="w-full text-[#596172] shadow-none">
                Lihat jadwal
              </SecondaryButton>
            </div>
          </div>
        </Panel>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Status" value={effectiveState === "checked_out" ? "Selesai" : effectiveState === "checked_in" ? "Aktif" : "Perlu aksi"} detail={shift.name} />
          <StatCard label="Shift" value={`${shift.startTime}-${shift.endTime}`} detail={shift.locationName} />
          <StatCard label="Tepat waktu" value={String(employeeSummary.onTimeDays)} detail={`${employeeSummary.totalDays} hari hadir`} />
          <StatCard label="Pengajuan" value={String(employeeSummary.pendingRequests)} detail="Menunggu keputusan" />
        </section>
        <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <Panel eyebrow="Shift" title="Shift hari ini">
            <div className="rounded-[18px] border border-[#edf0f5] bg-[#f9fafc] p-3.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#7a8495]">{shift.name}</p>
              <p className="mt-1.5 tabular-nums text-[17px] font-semibold leading-tight text-[#111827]">{shift.startTime}–{shift.endTime}</p>
              <p className="mt-1 text-[13px] leading-5 text-[#596172]">{shift.locationName}</p>
            </div>
          </Panel>

          <Panel eyebrow="Validasi" title="Validasi singkat">
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone={attendanceTrust.canClock ? "success" : "warning"}>{attendanceTrust.canClock ? "Lokasi valid" : "Lokasi perlu cek"}</StatusBadge>
              <StatusBadge tone="info">Kamera siap</StatusBadge>
              <StatusBadge tone="info">Device verified</StatusBadge>
            </div>
          </Panel>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <Panel eyebrow="Riwayat" title="Riwayat terbaru">
            {attendance.length === 0 ? (
              <EmptyState title="Belum ada riwayat" description="Check-in dan check-out akan muncul setelah data tersimpan." />
            ) : (
              <div className="grid gap-2.5">
                {attendance.slice(0, 3).map((item) => (
                  <div key={item.id ?? `${item.day}-${item.time}`} className="rounded-[18px] border border-[#edf0f5] bg-[#f9fafc] p-3.5">
                    <p className="text-[13px] font-medium text-[#111827]">{item.day}</p>
                    <p className="mt-1 text-[12px] leading-5 text-[#596172]">Masuk {item.checkInTime ?? item.time}{item.checkOutTime ? ` · Keluar ${item.checkOutTime}` : ""}</p>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel eyebrow="Pengajuan" title="Pengajuan aktif">
            {requests.length === 0 ? (
              <EmptyState title="Belum ada pengajuan" description="Pengajuan izin, cuti, atau koreksi absensi akan tampil di sini." />
            ) : (
              <div className="grid gap-2.5">
                {requests.slice(0, 3).map((item) => (
                  <div key={item.id ?? item.title} className="rounded-[18px] border border-[#edf0f5] bg-[#f9fafc] p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[13px] font-semibold text-[#111827]">{item.title}</p>
                      <StatusBadge tone={item.status === "Menunggu" ? "warning" : item.status === "Ditolak" ? "danger" : "success"}>{item.status}</StatusBadge>
                    </div>
                    {item.category ? <p className="mt-1 text-[11px] font-medium text-[#596172]">{item.category}</p> : null}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </section>

        {schedule.length > 0 ? (
          <Panel eyebrow="Agenda" title="Agenda hari ini">
            <div className="grid gap-2.5">
              {schedule.map((item) => (
                <div key={`${item.time}-${item.title}`} className="rounded-[18px] border border-[#edf0f5] bg-[#f9fafc] p-3.5">
                  <p className="text-[11px] font-medium text-[#8099c8]">{item.time}</p>
                  <p className="mt-1.5 text-[13px] font-semibold text-[#111827]">{item.title}</p>
                  <p className="mt-1 text-[13px] leading-5 text-[#596172]">{item.detail}</p>
                </div>
              ))}
            </div>
          </Panel>
        ) : null}
      </>
    );
  }

  function renderEmployeeAttendance() {
    if (employeeSummaryError) {
      return <ErrorState title="Status absensi belum tersedia" description={`${employeeSummaryError} Coba buka ulang tab absensi setelah koneksi stabil.`} />;
    }

    if (!employeeSummary) {
      return <LoadingState label="Memuat status absensi hari ini" />;
    }

    const recordValidationTone =
      employeeSummary.todayRecord.validationStatus === "verified"
        ? "success"
        : employeeSummary.todayRecord.validationStatus === "needs_review"
          ? "warning"
          : "danger";
    const activeCheckIn = submittedCheckIn ?? pendingCheckIn;
    const activeValidationTone =
      activeCheckIn?.validationStatus === "verified"
        ? "success"
        : activeCheckIn?.validationStatus === "needs_review"
        ? "warning"
          : activeCheckIn?.validationStatus === "blocked" || activeCheckIn?.validationStatus === "rejected"
            ? "danger"
            : "info";
    const checkInTimeLabel = activeCheckIn
      ? new Date(activeCheckIn.capturedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
      : now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    const isSubmitBlocked = activeCheckIn?.validationStatus === "blocked" || busyAction === "checkin";
    const effectiveState = getEffectiveAttendanceState(employeeSummary, attendanceState);

    return (
      <>
        <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <Panel eyebrow="Presensi" title="Check-in karyawan">
            <div className="rounded-[20px] border border-[#edf0f5] bg-[#f9fafc] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-[#8099c8]">Halo, {currentSession.user.fullName}</p>
                  <p
                    data-testid="attendance-clock"
                    className="mt-1.5 tabular-nums text-[24px] font-semibold leading-none tracking-[-0.01em] text-[#111827] sm:text-[26px]"
                  >
                    {now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <p className="mt-1.5 text-[13px] leading-5 text-[#596172]">
                    {now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
                <div className="rounded-[16px] border border-[#dfe6f2] bg-white px-3.5 py-2.5">
                  <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#8099c8]">Shift hari ini</p>
                  <p className="mt-1 text-[13px] font-semibold text-[#111827]">{employeeSummary.assignedShift.name}</p>
                  <p className="mt-0.5 text-[12px] text-[#667085]">
                    {employeeSummary.assignedShift.startTime}–{employeeSummary.assignedShift.endTime} · {employeeSummary.assignedShift.locationName}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge tone={attendanceTrust.canClock ? "success" : "warning"}>{attendanceTrust.canClock ? "Lokasi valid" : "Lokasi perlu cek"}</StatusBadge>
                <StatusBadge tone="info">{checkInMode === "qr" ? "Scanner siap" : "Kamera siap"}</StatusBadge>
              </div>
            </div>

            <input
              ref={selfieInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={handleSelfieUpload}
              className="sr-only"
              aria-label="Ambil selfie check-in"
            />

            {effectiveState === "idle" && checkInFlowState !== "success" ? (
              <div className="mt-5">
                <div className="grid grid-cols-2 rounded-[18px] border border-[#dfe6f2] bg-[#eef4ff] p-1">
                  {[
                    { key: "qr" as const, label: "QR Check-in", icon: QrCode },
                    { key: "face" as const, label: "Face Verification", icon: ScanFace }
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      aria-pressed={checkInMode === item.key}
                      onClick={() => {
                        setCheckInMode(item.key);
                        setCheckInFlowState("idle");
                      }}
                      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] px-3 py-2 text-sm font-black transition ${
                        checkInMode === item.key ? "bg-white text-[#111827] shadow-sm" : "text-[#596172] hover:text-[#111827]"
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  ))}
                </div>

                {checkInMode === "qr" ? (
                  <div className="mt-4">
                    <p className="text-[15px] font-semibold text-[#111827]">Check-in dengan QR</p>
                    <p className="mt-1.5 text-[13px] leading-5 text-[#596172]">Gunakan QR aktif di kiosk untuk memulai check-in.</p>
                    <div className="mt-4 rounded-[28px] border border-[#cfd9ec] bg-[#111827] p-4 shadow-[0_18px_44px_rgba(20,24,31,0.16)]">
                      <div className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-[22px] border border-white/10 bg-[radial-gradient(circle_at_center,#1c2f54_0,#101827_58%,#090d16_100%)]">
                        <div className="absolute inset-5 rounded-[20px] border-2 border-dashed border-[#8bb8ff]/60" />
                        <div className="absolute left-8 top-8 h-10 w-10 rounded-tl-2xl border-l-4 border-t-4 border-[#8bb8ff]" />
                        <div className="absolute right-8 top-8 h-10 w-10 rounded-tr-2xl border-r-4 border-t-4 border-[#8bb8ff]" />
                        <div className="absolute bottom-8 left-8 h-10 w-10 rounded-bl-2xl border-b-4 border-l-4 border-[#8bb8ff]" />
                        <div className="absolute bottom-8 right-8 h-10 w-10 rounded-br-2xl border-b-4 border-r-4 border-[#8bb8ff]" />
                        <QrCode className="h-16 w-16 text-[#8bb8ff]" />
                        <span className="absolute bottom-5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white">Scanner siap</span>
                      </div>
                    </div>
                    {checkInFlowState === "qr_scanned" && pendingCheckIn ? (
                      <div className="mt-4 rounded-[24px] border border-[#d6def0] bg-white p-4">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#1769ff]" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#111827]">QR berhasil terbaca</p>
                            <p className="mt-1 text-sm leading-6 text-[#596172]">Cek ringkasan singkat, lalu lanjut ke konfirmasi atau verifikasi wajah.</p>
                          </div>
                        </div>
                        <div className="mt-4 grid gap-2 text-sm font-semibold text-[#596172] sm:grid-cols-3">
                          <p>Lokasi: {pendingCheckIn.locationName}</p>
                          <p>Shift: {pendingCheckIn.shiftName}</p>
                          <p>Waktu: {checkInTimeLabel}</p>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <SecondaryButton onClick={handleContinueToFaceVerification}>
                            <ScanFace className="mr-2 h-4 w-4" />
                            Lanjut verifikasi wajah
                          </SecondaryButton>
                          <PrimaryButton onClick={handleConfirmPendingCheckIn}>
                            Konfirmasi check-in
                          </PrimaryButton>
                        </div>
                      </div>
                    ) : (
                      <PrimaryButton className="mt-4 w-full" onClick={handleQrScan}>
                        <QrCode className="mr-2 h-4 w-4" />
                        Scan QR
                      </PrimaryButton>
                    )}
                  </div>
                ) : (
                  <div className="mt-4">
                    <p className="text-[15px] font-semibold text-[#111827]">Verifikasi wajah</p>
                    <p className="mt-1.5 text-[13px] leading-5 text-[#596172]">Pastikan wajah terlihat jelas di dalam frame.</p>
                    <div className="mt-4 rounded-[28px] border border-[#cfd9ec] bg-[#111827] p-4 shadow-[0_18px_44px_rgba(20,24,31,0.16)]">
                      <div className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-[22px] border border-white/10 bg-[radial-gradient(circle_at_center,#1c2f54_0,#101827_58%,#090d16_100%)]">
                        {pendingCheckIn?.selfie?.previewUrl || attendanceCapture.selfieUrl ? (
                          <img src={pendingCheckIn?.selfie?.previewUrl ?? attendanceCapture.selfieUrl} alt="Preview verifikasi wajah" className="absolute inset-0 h-full w-full object-cover" />
                        ) : null}
                        <div className="absolute h-[70%] w-[54%] rounded-[50%] border-2 border-dashed border-[#8bb8ff]/60 bg-white/5" />
                        <ScanFace className="relative h-16 w-16 text-[#8bb8ff]" />
                        <div className="absolute bottom-4 flex flex-wrap justify-center gap-2 px-4">
                          <StatusBadge tone="info">Kamera siap</StatusBadge>
                          {checkInFlowState === "face_captured" ? (
                            <StatusBadge tone="success">Selfie siap</StatusBadge>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold tracking-[0.04em] text-white/60">Belum diambil</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {checkInFlowState === "face_captured" && pendingCheckIn ? (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <SecondaryButton onClick={handleOpenFaceCamera}>
                          <Camera className="mr-2 h-4 w-4" />
                          Ambil ulang
                        </SecondaryButton>
                        <PrimaryButton onClick={handleUseCapturedFace}>
                          Gunakan foto ini
                        </PrimaryButton>
                      </div>
                    ) : (
                      <PrimaryButton className="mt-4 w-full" onClick={handleOpenFaceCamera}>
                        <Camera className="mr-2 h-4 w-4" />
                        Ambil foto wajah
                      </PrimaryButton>
                    )}
                  </div>
                )}

                {checkInFlowState === "confirmation" && pendingCheckIn ? (
                  <div className="mt-4 rounded-[22px] border border-[#d6def0] bg-white p-4" aria-live="polite">
                    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8099c8]">Konfirmasi check-in</p>
                        <p className="mt-1 text-[14px] font-semibold text-[#111827]">Review detail sebelum submit</p>
                      </div>
                      <StatusBadge tone={activeValidationTone}>
                        {pendingCheckIn.validationStatus === "verified" ? "Validasi siap" : pendingCheckIn.validationStatus === "blocked" || pendingCheckIn.validationStatus === "rejected" ? "Blocked" : "Need review"}
                      </StatusBadge>
                    </div>
                    <div className="mt-4 grid gap-3 rounded-[22px] bg-[#f9fafc] p-4 text-sm font-semibold text-[#596172] sm:grid-cols-2">
                      <p>Karyawan: <span className="font-semibold text-[#111827]">{currentSession.user.fullName}</span></p>
                      <p>Shift: <span className="font-semibold text-[#111827]">{pendingCheckIn.shiftName}</span></p>
                      <p>Lokasi: <span className="font-semibold text-[#111827]">{pendingCheckIn.locationName}</span></p>
                      <p>Waktu: <span className="font-semibold text-[#111827]">{checkInTimeLabel}</span></p>
                      <p>Metode: <span className="font-semibold text-[#111827]">{pendingCheckIn.method === "QR" ? "QR Check-in" : "Face Verification"}</span></p>
                      <p>Hasil: <span className="font-semibold text-[#111827]">{pendingCheckIn.validationReasons.join(" · ")}</span></p>
                    </div>
                    {pendingCheckIn.validationStatus === "blocked" ? (
                      <p role="alert" className="mt-4 rounded-2xl bg-[#fff7ed] px-4 py-3 text-sm font-semibold leading-6 text-[#9a3412]">
                        {pendingCheckIn.validationReasons.join(" ")}
                      </p>
                    ) : null}
                    <div className="mt-4 grid gap-3 sm:grid-cols-[0.7fr_1fr]">
                      <SecondaryButton onClick={() => setCheckInFlowState(pendingCheckIn.method === "QR" ? "qr_scanned" : "face_captured")}>
                        Kembali
                      </SecondaryButton>
                      <PrimaryButton disabled={isSubmitBlocked} onClick={handleCheckIn}>
                        {busyAction === "checkin" ? "Menyimpan..." : "Submit Check-in"}
                      </PrimaryButton>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : effectiveState === "checked_out" ? (
              <div className="mt-4 rounded-[22px] border border-[#d6def0] bg-[#f9fafc] p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#1769ff]" />
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[#111827]">Check-out berhasil</p>
                    <p className="mt-1 text-[13px] leading-[1.45] text-[#596172]">
                      Kehadiran hari ini sudah tercatat
                      {employeeSummary.todayRecord.checkOutTime
                        ? ` · Keluar ${new Date(employeeSummary.todayRecord.checkOutTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`
                        : ""}
                      .
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <SecondaryButton onClick={() => navigate("/app/history")}>Lihat riwayat</SecondaryButton>
                  <PrimaryButton onClick={() => navigate("/app/home")}>Kembali ke dashboard</PrimaryButton>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-[22px] border border-[#d6def0] bg-[#f9fafc] p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#1769ff]" />
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[#111827]">Check-in berhasil</p>
                    <p className="mt-1 tabular-nums text-[13px] leading-[1.45] text-[#596172]">
                      Masuk {employeeSummary.todayRecord.checkInTime ? new Date(employeeSummary.todayRecord.checkInTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : checkInTimeLabel} · {activeCheckIn?.locationName ?? employeeSummary.assignedShift.locationName}.
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <SecondaryButton onClick={() => navigate("/app/history")}>Lihat riwayat</SecondaryButton>
                  <PrimaryButton onClick={() => navigate("/app/home")}>Kembali ke dashboard</PrimaryButton>
                </div>
                <SecondaryButton className="mt-3 w-full" disabled={effectiveState !== "checked_in" || busyAction === "checkout" || !attendanceTrust.canClock} onClick={handleCheckOut}>
                  <Clock3 className="mr-2 h-4 w-4" />
                  {busyAction === "checkout" ? "Menyimpan..." : "Check-out sekarang"}
                </SecondaryButton>
              </div>
            )}
          </Panel>

          <Panel eyebrow="Validasi" title="Validasi singkat">
            <div className="space-y-3">
              <div className="rounded-[20px] border border-[#edf0f5] bg-[#f9fafc] p-3.5">
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#111827]">Status absensi hari ini</p>
                    <p className="mt-1 tabular-nums text-[12px] leading-5 text-[#667085]">
                      {employeeSummary.todayRecord.checkInTime
                        ? `Masuk ${new Date(employeeSummary.todayRecord.checkInTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`
                        : "Belum ada catatan check-in hari ini."}
                    </p>
                    {employeeSummary.todayRecord.validationReasons.length > 0 ? (
                      <p className="mt-1.5 text-[12px] font-medium text-[#8a5c00]">{employeeSummary.todayRecord.validationReasons.join(" · ")}</p>
                    ) : null}
                  </div>
                  <StatusBadge tone={recordValidationTone}>
                    {employeeSummary.todayRecord.validationStatus === "needs_review"
                      ? "Perlu review"
                      : employeeSummary.todayRecord.validationStatus === "blocked"
                        ? "Terblokir"
                        : "Terverifikasi"}
                  </StatusBadge>
                </div>
              </div>

              <div className="rounded-[20px] border border-[#edf0f5] bg-[#f9fafc] p-3.5">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#1769ff]" />
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#111827]">Lokasi · Kamera · Perangkat</p>
                    <p className="mt-1 text-[12px] leading-5 text-[#596172]">{attendanceTrust.detail}</p>
                    <details className="mt-2.5 rounded-xl border border-[#dfe6f2] bg-white px-3.5 py-2.5">
                      <summary className="cursor-pointer text-[13px] font-semibold text-[#1769ff]">Lihat detail validasi</summary>
                      <div className="mt-2.5 grid gap-1.5 tabular-nums text-[12px] text-[#667085]">
                        <p>Radius kantor: {secureAttendancePolicy.allowedRadiusMeters} m</p>
                        <p>Jarak saat ini: {attendanceTrustSignal.distanceFromOfficeMeters ?? "Belum dicek"} m</p>
                        <p>Device ID: {attendanceCapture.deviceId || "Belum dibuat"}</p>
                      </div>
                    </details>
                  </div>
                </div>
                <SecondaryButton className="mt-3 w-full" disabled={busyAction === "verify-device"} onClick={handleVerifyAttendanceDevice}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {busyAction === "verify-device" ? "Memverifikasi..." : "Verifikasi ulang perangkat"}
                </SecondaryButton>
              </div>

              {checkInFlowState === "submitting" ? (
                <div className="rounded-[24px] border border-[#d6def0] bg-white p-4" role="status">
                  <div className="flex items-start gap-3">
                    <RefreshCw className="mt-1 h-5 w-5 animate-spin text-[#1769ff]" />
                    <div>
                      <p className="text-sm font-semibold text-[#111827]">Mengirim check-in</p>
                      <p className="mt-1.5 text-[13px] leading-5 text-[#596172]">Menyimpan waktu, lokasi, dan hasil validasi absensi Anda.</p>
                    </div>
                  </div>
                </div>
              ) : !attendanceTrust.canClock ? (
                <div className="rounded-[24px] border border-[#fed7aa] bg-[#fff7ed] p-4" role="alert">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-1 h-5 w-5 text-[#9a3412]" />
                    <div>
                      <p className="text-sm font-black text-[#9a3412]">{attendanceTrust.title}</p>
                      <p className="mt-2 text-sm leading-6 text-[#9a3412]">Verifikasi perangkat atau izinkan lokasi sebelum submit check-in.</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </Panel>
        </section>
        {renderEmployeeHistoryWorkspace()}

      </>
    );
  }

  function renderEmployeeHistoryWorkspace() {
    const historyRows = attendance.map((item) => ({
      id: item.id ?? `${item.day}-${item.time}`,
      day: item.day,
      method: item.method,
      time: item.time,
      checkInTime: item.checkInTime ?? item.time,
      checkOutTime: item.checkOutTime,
      duration: item.duration ?? "Belum selesai",
      locationName: item.locationName ?? employeeSummary?.assignedShift.locationName ?? "Lokasi belum tercatat",
      status: item.status
    }));
    const filterLabels: Record<(typeof attendanceFilters)[number], string> = {
      all: "Semua",
      present: "Hadir",
      issue: "Masalah"
    };

    return (
      <Panel eyebrow="Riwayat" title="Riwayat absensi">
          <div className="mb-4 flex flex-wrap gap-2">
            {attendanceFilters.map((filter) => (
              <button
                key={filter}
                type="button"
                aria-pressed={historyFilter === filter}
                onClick={() => {
                  if (filter === historyFilter) return;
                  setAttendanceHistoryLoaded(false);
                  setHistoryFilter(filter);
                }}
                className={`min-h-9 rounded-full px-3.5 py-1.5 text-[12px] font-semibold tracking-[0.04em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1769ff] ${
                  historyFilter === filter ? "bg-[#111827] text-white" : "bg-[#f1f5ff] text-[#596172]"
                }`}
              >
                {filterLabels[filter]}
              </button>
            ))}
          </div>
          {!attendanceHistoryLoaded ? (
            <LoadingState label="Memuat riwayat absensi" />
          ) : attendanceHistoryError ? (
            <ErrorState title="Riwayat absensi belum tersedia" description={`${attendanceHistoryError} Coba ganti filter atau muat ulang tab ini.`} />
          ) : historyRows.length === 0 ? (
            <EmptyState title="Belum ada riwayat" description="Data absensi akan muncul setelah check-in pertama Anda tercatat." />
          ) : (
            <div className="grid gap-3">
              <div className="grid gap-3" aria-label="Riwayat absensi employee">
                {historyRows.map((item) => (
                  <details
                    key={item.id}
                    className="group rounded-[22px] border border-[#edf0f5] bg-white transition open:border-[#1769ff] open:bg-[#f1f5ff]"
                  >
                    <summary className="flex min-h-14 cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-4 py-3.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1769ff] [&::-webkit-details-marker]:hidden">
                      <span>
                        <span className="block text-[13px] font-medium text-[#111827]">{item.day}</span>
                        <span className="mt-0.5 block tabular-nums text-[12px] text-[#667085]">
                          {item.checkInTime ? `Masuk ${item.checkInTime}` : ""}{item.checkOutTime ? ` · Keluar ${item.checkOutTime}` : ""}
                        </span>
                        <span className="mt-0.5 block tabular-nums text-[12px] text-[#7a8495]">Durasi {item.duration} · {item.locationName}</span>
                      </span>
                      <StatusBadge tone={item.status === "Belum check-in" ? "neutral" : item.status === "Terlambat" ? "warning" : "success"}>{item.status}</StatusBadge>
                    </summary>
                    <div className="border-t border-[#dce7fb] px-4 py-3.5" role="status">
                      <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#8099c8]">Detail absensi</p>
                      <div className="mt-2.5 grid gap-1.5 tabular-nums text-[12px] text-[#596172] sm:grid-cols-2">
                        <p>Check-in: {item.checkInTime}</p>
                        <p>Check-out: {item.checkOutTime ?? "Belum check-out"}</p>
                        <p>Durasi: {item.duration}</p>
                        <p>Lokasi: {item.locationName}</p>
                        <p>Metode: {item.method}</p>
                        <p>Status: {item.status}</p>
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}
      </Panel>
    );
  }

  function renderEmployeeScheduleWorkspace() {
    if (employeeSummaryError) {
      return <ErrorState title="Jadwal belum tersedia" description={`${employeeSummaryError} Coba buka ulang tab Jadwal setelah koneksi stabil.`} />;
    }

    if (!employeeSummary) {
      return <LoadingState label="Memuat jadwal shift" />;
    }

    return (
      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel eyebrow="Jadwal / Shift" title="Shift aktif hari ini">
          <div className="rounded-[24px] border border-[#edf0f5] bg-[#f9fafc] p-5">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#7a8495]">{employeeSummary.assignedShift.name}</p>
                <p className="mt-1.5 tabular-nums text-[17px] font-semibold leading-tight text-[#111827]">{employeeSummary.assignedShift.startTime}–{employeeSummary.assignedShift.endTime}</p>
                <p className="mt-1 text-[13px] leading-5 text-[#596172]">{employeeSummary.assignedShift.locationName}</p>
              </div>
              <StatusBadge tone="info">Hari ini</StatusBadge>
            </div>
            <PrimaryButton className="mt-4 w-full" onClick={() => navigate("/app/attendance")}>
              Mulai Check-in
            </PrimaryButton>
          </div>
        </Panel>

        <Panel eyebrow="Upcoming" title="Jadwal berikutnya">
          {schedule.length === 0 ? (
            <EmptyState title="Belum ada jadwal" description="Hubungi HR jika shift belum ditetapkan." />
          ) : (
            <div className="grid gap-3">
              {schedule.map((item) => (
                <div key={`${item.time}-${item.title}`} className="rounded-[18px] border border-[#edf0f5] bg-[#f9fafc] p-3.5">
                  <p className="text-[11px] font-medium text-[#8099c8]">{item.time}</p>
                  <p className="mt-1.5 text-[13px] font-semibold text-[#111827]">{item.title}</p>
                  <p className="mt-1 text-[13px] leading-5 text-[#596172]">{item.detail}</p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </section>
    );
  }

  function renderEmployeePayslipWorkspace() {
    return (
      <Panel eyebrow="Slip Gaji" title="Payroll belum aktif">
        <EmptyState
          title="Modul payroll belum tersambung"
          description="Slip gaji akan tersedia setelah modul payroll disambungkan oleh HR."
        />
        <SecondaryButton className="mt-4 w-full sm:w-auto" onClick={() => navigate("/app/history")}>
          Lihat rekap absensi bulan ini
        </SecondaryButton>
      </Panel>
    );
  }

  function renderAttendanceWorkspace() {
    if (isEmployee) {
      return renderEmployeeAttendance();
    }

    if (isManager) {
      return renderManagerAttendanceWorkspace();
    }

    return (
      <Panel eyebrow="Presensi tim" title="Monitor kehadiran tanpa membuka laporan penuh">
        {!adminAttendanceLoaded ? (
          <LoadingState label="Memuat presensi organisasi" />
        ) : adminAttendanceError ? (
          <ErrorState title="Presensi organisasi belum tersedia" description={`${adminAttendanceError} Coba muat ulang tab Presensi.`} />
        ) : adminAttendanceRows.length === 0 ? (
          <EmptyState title="Belum ada data absensi" description="Clock-in tim akan muncul di sini saat data mulai masuk." />
        ) : (
          <DataTable
            caption="Daftar absensi"
            columns={[
              { key: "employee", header: "Karyawan" },
              { key: "date", header: "Tanggal" },
              { key: "checkin", header: "Check-in" },
              { key: "status", header: "Status" },
              { key: "validation", header: "Validasi" }
            ]}
            rows={adminAttendanceRows.map((row) => ({
              id: row.id,
              employee: (
                <div>
                  <p className="font-semibold text-[#111827]">{row.employeeName}</p>
                  <p className="mt-1 text-xs font-semibold text-[#667085]">{row.workLocationName}</p>
                </div>
              ),
              date: row.date,
              checkin: row.checkInTime ? row.checkInTime.slice(11, 16) : "--:--",
              status: <StatusBadge tone={row.status === "Terlambat" ? "warning" : row.status === "Belum check-in" ? "neutral" : row.status === "Izin" ? "info" : "success"}>{row.status}</StatusBadge>,
              validation: (
                <StatusBadge tone={row.validationStatus === "verified" ? "success" : row.validationStatus === "needs_review" ? "warning" : row.validationStatus === "blocked" || row.validationStatus === "rejected" ? "danger" : "neutral"}>
                  {row.validationStatus === "verified" ? "Terverifikasi" : row.validationStatus === "needs_review" ? "Perlu review" : row.validationStatus}
                </StatusBadge>
              )
            }))}
          />
        )}
      </Panel>
    );
  }

  function renderManagerAttendanceWorkspace() {
    const statusCountMap = {
      present: employeeList.filter((e) => e.todayStatus === "present").length,
      late: employeeList.filter((e) => e.todayStatus === "late").length,
      absent: employeeList.filter((e) => e.todayStatus === "absent").length,
      leave: employeeList.filter((e) => e.todayStatus === "leave").length
    };

    const attendanceStatusLabel = (status: EmployeeListItem["todayStatus"]) => {
      if (status === "present") return "Tepat waktu";
      if (status === "late") return "Terlambat";
      if (status === "leave") return "Izin";
      return "Belum hadir";
    };

    const attendanceStatusTone = (status: EmployeeListItem["todayStatus"]): "success" | "warning" | "info" | "neutral" => {
      if (status === "present") return "success";
      if (status === "late") return "warning";
      if (status === "leave") return "info";
      return "neutral";
    };

    return (
      <div className="grid gap-5">
        <PageHeader
          eyebrow="Presensi Tim"
          title="Status Kehadiran Hari Ini"
          description="Lihat status kehadiran anggota tim hari ini."
        />

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Hadir" value={String(statusCountMap.present)} detail="Tepat waktu atau masuk" />
          <StatCard label="Terlambat" value={String(statusCountMap.late)} detail="Melewati toleransi shift" />
          <StatCard label="Belum hadir" value={String(statusCountMap.absent)} detail="Belum check-in" />
          <StatCard label="Izin / cuti" value={String(statusCountMap.leave)} detail="Absensi terencana" />
        </section>

        <Panel eyebrow="Rekap hari ini" title="Data presensi anggota tim">
          {!employeeListLoaded ? (
            <LoadingState label="Memuat data presensi tim" />
          ) : employeeListError ? (
            <ErrorState title="Data presensi tim belum tersedia" description={`${employeeListError} Coba muat ulang halaman.`} />
          ) : employeeList.length === 0 ? (
            <EmptyState
              title="Belum ada presensi tim"
              description="Data akan muncul setelah anggota tim melakukan check-in."
            />
          ) : (
            <DataTable
              caption="Presensi tim hari ini"
              columns={[
                { key: "name", header: "Karyawan" },
                { key: "shift", header: "Shift" },
                { key: "checkin", header: "Check-in" },
                { key: "status", header: "Status" },
                { key: "validation", header: "Validasi" },
              ]}
              rows={employeeList.map((emp) => ({
                id: emp.id,
                name: (
                  <div>
                    <p className="font-semibold text-[#111827]">{emp.fullName}</p>
                    <p className="mt-1 text-xs text-[#667085]">{profileValue(emp.departmentName)}</p>
                  </div>
                ),
                shift: emp.shiftName ?? "-",
                checkin: <span className="tabular-nums">{emp.checkInTime ?? "--:--"}</span>,
                status: (
                  <StatusBadge tone={attendanceStatusTone(emp.todayStatus)}>
                    {attendanceStatusLabel(emp.todayStatus)}
                  </StatusBadge>
                ),
                validation: emp.validationStatus ? (
                  <StatusBadge tone={emp.validationStatus === "verified" ? "success" : emp.validationStatus === "needs_review" ? "warning" : "danger"}>
                    {emp.validationStatus === "verified" ? "Terverifikasi" : emp.validationStatus === "needs_review" ? "Perlu review" : emp.validationStatus}
                  </StatusBadge>
                ) : <span className="text-xs text-[#7a8495]">-</span>
              }))}
            />
          )}
        </Panel>
      </div>
    );
  }


  function renderManagerRequestsPage(
    categoryGroupDefs: Array<{ label: string; options: Array<{ id: string; label: string }> }>,
    selectedMeta: ReturnType<typeof getRequestCategoryMeta>,
    isKoreksi: boolean,
    isLupa: boolean
  ) {
    return (
      <div className="grid gap-5">
        <PageHeader
          eyebrow="Pengajuan Tim"
          title="Pengajuan"
          description="Tinjau pengajuan dari anggota tim. Persetujuan Anda akan diteruskan ke HR untuk keputusan final."
        />

        <Panel eyebrow="Antrean tim" title="Pengajuan menunggu keputusan Anda">
          <div className="mb-4 rounded-2xl border border-[#d9e6ff] bg-[#f0f5ff] px-3.5 py-3">
            <p className="text-[12px] font-semibold text-[#1769ff]">Alur persetujuan dua tahap</p>
            <p className="mt-1 text-[12px] leading-5 text-[#596172]">
              Persetujuan Anda adalah langkah pertama. Pengajuan belum selesai sampai HR memberikan keputusan final.
            </p>
          </div>
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-[13px] leading-6 text-[#596172]">Pengajuan dari anggota tim yang menunggu keputusan Anda.</p>
            <SecondaryButton onClick={reloadRequests} disabled={busyAction === "reload-requests"}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </SecondaryButton>
          </div>

          {!managerRequestsLoaded ? (
            <LoadingState label="Memuat pengajuan tim" />
          ) : managerRequestsError ? (
            <ErrorState title="Pengajuan tim belum tersedia" description={`${managerRequestsError} Coba refresh daftar pengajuan.`} />
          ) : requests.length === 0 ? (
            <EmptyState
              title="Belum ada pengajuan tim"
              description="Pengajuan dari anggota tim akan muncul di sini."
            />
          ) : (
            <div className="space-y-3">
              {requests.map((item) => {
                const ws = item.workflowStatus;
                const displayStatus = item.statusLabel ?? getWorkflowStatusLabel(ws) ?? item.status;
                const statusTone = ws === "rejected" || item.status === "Ditolak" ? "danger"
                  : ws === "approved" || item.status === "Disetujui" ? "success"
                  : ws === "approved_by_manager" ? "info"
                  : "warning";
                const canApproveRequest = Boolean(item.id) && canShowApprovalActionsForRequest(currentSession.user.role, ws);
                return (
                  <article key={item.id ?? item.title} className="rounded-[24px] border border-[#edf0f5] bg-white p-4 shadow-[0_2px_12px_rgba(20,24,31,0.05)]">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          {item.requester ? (
                            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8099c8]">{item.requester}</p>
                          ) : null}
                          <p className="mt-0.5 text-sm font-semibold text-[#111827]">{item.title}</p>
                        </div>
                        <StatusBadge tone={statusTone}>{displayStatus}</StatusBadge>
                      </div>
                      {item.category ? (
                        <p className="text-[12px] font-medium text-[#1769ff]">{item.category}</p>
                      ) : null}
                      {item.startDate ? (
                        <p className="text-[12px] font-semibold text-[#667085]">
                          {item.startDate}{item.endDate && item.endDate !== item.startDate ? ` – ${item.endDate}` : ""}
                        </p>
                      ) : null}
                      <p className="text-sm leading-6 text-[#596172]">{item.detail}</p>
                      {item.adminNote ? (
                        <div className="rounded-xl border border-[#edf0f5] bg-[#f9fafc] px-3 py-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8099c8]">Catatan reviewer</p>
                          <p className="mt-1 text-xs text-[#596172]">{item.adminNote}</p>
                        </div>
                      ) : null}
                    </div>
                    {canApproveRequest ? (
                      <div className="mt-4">
                        <FormInput
                          label="Catatan keputusan"
                          value={item.id ? approvalNotes[item.id] ?? "" : ""}
                          onChange={(event) => {
                            setApprovalNotes((current) => ({ ...current, [item.id!]: event.target.value }));
                            setApprovalErrors((current) => {
                              const next = { ...current };
                              delete next[item.id!];
                              return next;
                            });
                          }}
                          placeholder="Tambahkan alasan atau catatan untuk karyawan"
                          error={item.id ? approvalErrors[item.id] : undefined}
                          hint="Wajib diisi saat menolak agar karyawan mengetahui alasannya."
                        />
                      </div>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <SecondaryButton onClick={() => item.id && openRequestDetail(item.id)}>Detail</SecondaryButton>
                      {canApproveRequest ? (
                        <>
                          <PrimaryButton onClick={() => handleApproval(item.id!, "Disetujui")} disabled={busyAction === `Disetujui-${item.id}`}>
                            Setujui
                          </PrimaryButton>
                          <SecondaryButton onClick={() => handleApproval(item.id!, "Ditolak")} disabled={busyAction === `Ditolak-${item.id}`}>
                            Tolak
                          </SecondaryButton>
                        </>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel eyebrow="Pengajuan saya" title="Buat pengajuan pribadi">
          <p className="mb-4 text-[13px] leading-6 text-[#596172]">Untuk mengajukan izin atau cuti atas nama Anda sendiri.</p>
          <form className="grid gap-4" onSubmit={handleCreateRequest}>
            <CategorySelect
              label="Kategori"
              value={requestForm.category}
              onChange={(value) => {
                const category = value as RequestFormState["category"];
                setRequestForm({ category, startDate: "", endDate: "", title: "", detail: "", correctionDate: undefined, correctionType: undefined, correctionTime: undefined, forgetType: undefined, estimatedTime: undefined });
                setRequestFormError(null);
              }}
              groups={categoryGroupDefs}
            />
            {selectedMeta ? (
              <div className="rounded-2xl border border-[#d9e6ff] bg-[#f0f5ff] px-3.5 py-3">
                <p className="text-[12px] font-semibold text-[#1769ff]">{selectedMeta.label}</p>
                <p className="mt-1 text-[12px] leading-5 text-[#596172]">
                  {selectedMeta.defaultDays ? `Umumnya ${selectedMeta.defaultDays} hari. ` : selectedMeta.defaultDaysNote ? `Umumnya ${selectedMeta.defaultDaysNote}. ` : ""}
                  {selectedMeta.requiresDocument ? "Lampiran mungkin diperlukan. " : ""}
                  {selectedMeta.note}
                </p>
              </div>
            ) : null}
            {isKoreksi ? (
              <>
                <FormInput label="Tanggal absensi yang dikoreksi" type="date" value={requestForm.correctionDate ?? ""} onChange={(event) => setRequestForm((current) => ({ ...current, correctionDate: event.target.value }))} />
                <SelectInput label="Jenis koreksi" value={requestForm.correctionType ?? ""} onChange={(event) => setRequestForm((current) => ({ ...current, correctionType: event.target.value as RequestFormState["correctionType"] }))}>
                  <option value="">Pilih jenis koreksi</option>
                  <option value="Check-in">Check-in</option>
                  <option value="Check-out">Check-out</option>
                  <option value="Keduanya">Keduanya</option>
                </SelectInput>
                <FormInput label="Jam yang diajukan" type="time" value={requestForm.correctionTime ?? ""} onChange={(event) => setRequestForm((current) => ({ ...current, correctionTime: event.target.value }))} hint="Opsional jika koreksi keduanya." />
              </>
            ) : null}
            {isLupa ? (
              <>
                <SelectInput label="Jenis lupa" value={requestForm.forgetType ?? ""} onChange={(event) => setRequestForm((current) => ({ ...current, forgetType: event.target.value as RequestFormState["forgetType"] }))}>
                  <option value="">Pilih jenis lupa</option>
                  <option value="Check-in">Lupa Check-in</option>
                  <option value="Check-out">Lupa Check-out</option>
                </SelectInput>
                <FormInput label="Perkiraan jam" type="time" value={requestForm.estimatedTime ?? ""} onChange={(event) => setRequestForm((current) => ({ ...current, estimatedTime: event.target.value }))} hint="Opsional, membantu reviewer memverifikasi." />
              </>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormInput label="Tanggal mulai" type="date" value={requestForm.startDate} onChange={(event) => setRequestForm((current) => ({ ...current, startDate: event.target.value }))} />
              <FormInput label="Tanggal selesai" type="date" value={requestForm.endDate} onChange={(event) => setRequestForm((current) => ({ ...current, endDate: event.target.value }))} />
            </div>
            <FormInput label="Judul" value={requestForm.title} onChange={(event) => setRequestForm((current) => ({ ...current, title: event.target.value }))} placeholder="Ringkasan singkat pengajuan" />
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.05em] text-[#596172]">Detail alasan</span>
              <textarea
                value={requestForm.detail}
                onChange={(event) => setRequestForm((current) => ({ ...current, detail: event.target.value }))}
                placeholder="Jelaskan alasan pengajuan secara singkat dan jelas."
                className="min-h-[110px] w-full rounded-2xl border border-[#e2e7f0] bg-[#f9fafc] px-4 py-2.5 text-[13px] text-[#111827] outline-none transition focus:border-[#1769ff] focus:bg-white focus:ring-2 focus:ring-[#1769ff]/10"
              />
            </label>
            {requestFormError ? <ErrorState title="Form pengajuan belum lengkap" description={requestFormError} /> : null}
            <div className="pb-2">
              <PrimaryButton type="submit" disabled={busyAction === "create-request"} className="w-full">
                {busyAction === "create-request" ? "Mengirim..." : "Kirim Pengajuan"}
              </PrimaryButton>
            </div>
          </form>
        </Panel>
      </div>
    );
  }

  function renderManagerExceptionsPage() {
    const exceptionTypeLabel = (type: string): string => {
      const map: Record<string, string> = {
        "Outside radius": "Di luar radius",
        "Late check-in": "Terlambat check-in",
        "Missing checkout": "Lupa check-out",
        "Invalid QR": "QR tidak valid",
        "Expired QR": "QR kedaluwarsa",
        "Different device": "Perangkat berbeda",
        "Missing selfie": "Selfie tidak ada",
        "Selfie issue": "Masalah selfie"
      };
      return map[type] ?? type;
    };

    return (
      <div className="grid gap-5">
        <PageHeader
          eyebrow="Pengecualian"
          title="Pengecualian Tim"
          description="Tinjau validasi kehadiran anggota tim yang membutuhkan keputusan."
        />

        <Panel eyebrow="Antrean validasi" title="Kasus yang menunggu keputusan Anda">
          {!exceptionQueueLoaded ? (
            <LoadingState label="Memuat pengecualian tim" />
          ) : exceptionQueueError ? (
            <ErrorState title="Pengecualian tim belum tersedia" description={`${exceptionQueueError} Coba buka ulang halaman ini untuk melanjutkan review.`} />
          ) : exceptionQueue.length === 0 ? (
            <EmptyState
              title="Belum ada pengecualian"
              description="Kasus validasi tim akan muncul jika membutuhkan review."
            />
          ) : (
            <div className="space-y-3">
              {exceptionQueue.map((item) => (
                <article key={item.id} className="rounded-[24px] border border-[#edf0f5] bg-white p-4 shadow-[0_2px_12px_rgba(20,24,31,0.05)]">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#111827]">{item.employeeName}</p>
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.10em] text-[#1769ff]">{exceptionTypeLabel(item.exceptionType)}</p>
                      <p className="mt-2 break-words text-sm leading-6 text-[#596172]">{item.reason}</p>
                      <p className="mt-1 text-[11px] text-[#8099c8]">{new Date(item.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</p>
                    </div>
                    <StatusBadge tone={item.status === "Need Review" ? "warning" : item.status === "Rejected" ? "danger" : "success"}>
                      {item.status === "Need Review" ? "Perlu review" : item.status === "Approved" ? "Disetujui" : item.status === "Rejected" ? "Ditolak" : item.status}
                    </StatusBadge>
                  </div>
                  <div className="mt-4">
                    <FormInput
                      label="Catatan keputusan"
                      value={exceptionNotes[item.id] ?? ""}
                      onChange={(event) => {
                        setExceptionNotes((current) => ({ ...current, [item.id]: event.target.value }));
                        setExceptionErrors((current) => {
                          const next = { ...current };
                          delete next[item.id];
                          return next;
                        });
                      }}
                      placeholder="Tambahkan alasan keputusan"
                      error={exceptionErrors[item.id]}
                      hint="Wajib diisi saat menolak atau minta koreksi."
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <PrimaryButton onClick={() => handleExceptionDecision(item.id, "Approved")} disabled={busyAction === `exception-Approved-${item.id}`}>
                      Setujui
                    </PrimaryButton>
                    <SecondaryButton onClick={() => handleExceptionDecision(item.id, "Rejected")} disabled={busyAction === `exception-Rejected-${item.id}`}>
                      Tolak
                    </SecondaryButton>
                    <SecondaryButton onClick={() => handleExceptionDecision(item.id, "Request Correction")} disabled={busyAction === `exception-Request Correction-${item.id}`}>
                      Minta koreksi
                    </SecondaryButton>
                  </div>
                </article>
              ))}
            </div>
          )}
        </Panel>
      </div>
    );
  }

  function renderRequestsWorkspace() {
    const selectedMeta = getRequestCategoryMeta(requestForm.category);
    const isKoreksi = requestForm.category === "Koreksi Absensi";
    const isLupa = requestForm.category === "Lupa Check-in/out";
    const categoryGroupDefs = (["Utama", "Cuti Khusus", "Karyawati", "Opsional"] as const).map((group) => ({
      label: group,
      options: REQUEST_CATEGORY_META.filter((c) => c.group === group).map((c) => ({ id: c.id, label: c.label }))
    })).filter((g) => g.options.length > 0);

    if (isManager) {
      return renderManagerRequestsPage(categoryGroupDefs, selectedMeta, isKoreksi, isLupa);
    }

    return (
      <section className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <Panel eyebrow="Pengajuan" title="Buat pengajuan baru">
          <form className="grid gap-4" onSubmit={handleCreateRequest}>
            <CategorySelect
              label="Kategori"
              value={requestForm.category}
              onChange={(value) => {
                const category = value as RequestFormState["category"];
                setRequestForm({ category, startDate: "", endDate: "", title: "", detail: "", correctionDate: undefined, correctionType: undefined, correctionTime: undefined, forgetType: undefined, estimatedTime: undefined });
                setRequestFormError(null);
              }}
              groups={categoryGroupDefs}
            />

            {selectedMeta ? (
              <div className="rounded-2xl border border-[#d9e6ff] bg-[#f0f5ff] px-3.5 py-3">
                <p className="text-[12px] font-semibold text-[#1769ff]">{selectedMeta.label}</p>
                <p className="mt-1 text-[12px] leading-5 text-[#596172]">
                  {selectedMeta.defaultDays
                    ? `Umumnya ${selectedMeta.defaultDays} hari. `
                    : selectedMeta.defaultDaysNote
                      ? `Umumnya ${selectedMeta.defaultDaysNote}. `
                      : ""}
                  {selectedMeta.requiresDocument ? "Lampiran mungkin diperlukan. " : ""}
                  {selectedMeta.note}
                </p>
                <p className="mt-1 text-xs font-semibold text-[#667085]">Durasi mengikuti kebijakan perusahaan dan ketentuan yang berlaku.</p>
              </div>
            ) : null}

            {isKoreksi ? (
              <>
                <FormInput
                  label="Tanggal absensi yang dikoreksi"
                  type="date"
                  value={requestForm.correctionDate ?? ""}
                  onChange={(event) => setRequestForm((current) => ({ ...current, correctionDate: event.target.value }))}
                />
                <SelectInput
                  label="Jenis koreksi"
                  value={requestForm.correctionType ?? ""}
                  onChange={(event) => setRequestForm((current) => ({ ...current, correctionType: event.target.value as RequestFormState["correctionType"] }))}
                >
                  <option value="">Pilih jenis koreksi</option>
                  <option value="Check-in">Check-in</option>
                  <option value="Check-out">Check-out</option>
                  <option value="Keduanya">Keduanya</option>
                </SelectInput>
                <FormInput
                  label="Jam yang diajukan"
                  type="time"
                  value={requestForm.correctionTime ?? ""}
                  onChange={(event) => setRequestForm((current) => ({ ...current, correctionTime: event.target.value }))}
                  hint="Opsional jika koreksi keduanya."
                />
              </>
            ) : null}

            {isLupa ? (
              <>
                <SelectInput
                  label="Jenis lupa"
                  value={requestForm.forgetType ?? ""}
                  onChange={(event) => setRequestForm((current) => ({ ...current, forgetType: event.target.value as RequestFormState["forgetType"] }))}
                >
                  <option value="">Pilih jenis lupa</option>
                  <option value="Check-in">Lupa Check-in</option>
                  <option value="Check-out">Lupa Check-out</option>
                </SelectInput>
                <FormInput
                  label="Perkiraan jam"
                  type="time"
                  value={requestForm.estimatedTime ?? ""}
                  onChange={(event) => setRequestForm((current) => ({ ...current, estimatedTime: event.target.value }))}
                  hint="Opsional, membantu reviewer memverifikasi."
                />
              </>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <FormInput
                label="Tanggal mulai"
                type="date"
                value={requestForm.startDate}
                onChange={(event) => setRequestForm((current) => ({ ...current, startDate: event.target.value }))}
              />
              <FormInput
                label="Tanggal selesai"
                type="date"
                value={requestForm.endDate}
                onChange={(event) => setRequestForm((current) => ({ ...current, endDate: event.target.value }))}
              />
            </div>

            <FormInput
              label="Judul"
              value={requestForm.title}
              onChange={(event) => setRequestForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Ringkasan singkat pengajuan"
            />

            <label className="block">
              <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.05em] text-[#596172]">Detail alasan</span>
              <textarea
                value={requestForm.detail}
                onChange={(event) => setRequestForm((current) => ({ ...current, detail: event.target.value }))}
                placeholder="Jelaskan alasan pengajuan secara singkat dan jelas."
                className="min-h-[110px] w-full rounded-2xl border border-[#e2e7f0] bg-[#f9fafc] px-4 py-2.5 text-[13px] text-[#111827] outline-none transition focus:border-[#1769ff] focus:bg-white focus:ring-2 focus:ring-[#1769ff]/10"
              />
            </label>

            {requestFormError ? <ErrorState title="Form pengajuan belum lengkap" description={requestFormError} /> : null}

            <div className="pb-2">
              <PrimaryButton type="submit" disabled={busyAction === "create-request"} className="w-full">
                {busyAction === "create-request" ? "Mengirim..." : "Kirim Pengajuan"}
              </PrimaryButton>
            </div>
          </form>
        </Panel>

        <Panel eyebrow="Riwayat pengajuan" title="Pengajuan aktif dan selesai">
          {isManager && (
            <div className="mb-4 rounded-2xl border border-[#d9e6ff] bg-[#f0f5ff] px-3.5 py-3">
              <p className="text-[12px] font-semibold text-[#1769ff]">Alur approval dua tahap</p>
              <p className="mt-1 text-[12px] leading-5 text-[#596172]">
                Approval Anda akan diteruskan ke HR untuk keputusan final. Pengajuan belum selesai sampai HR menyetujui.
              </p>
            </div>
          )}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-[#596172]">
              {isManager ? "Manager melihat antrean pengajuan tim." : canReviewRequests ? "HR melihat seluruh antrean organisasi." : "Hanya pengajuan milik Anda yang ditampilkan."}
            </p>
            <SecondaryButton onClick={reloadRequests} disabled={busyAction === "reload-requests"}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </SecondaryButton>
          </div>
          {isManager && !managerRequestsLoaded ? (
            <LoadingState label="Memuat pengajuan tim" />
          ) : isManager && managerRequestsError ? (
            <ErrorState title="Pengajuan tim belum tersedia" description={`${managerRequestsError} Coba refresh daftar pengajuan.`} />
          ) : requests.length === 0 ? (
            <EmptyState
              title={isManager ? "Belum ada pengajuan tim" : "Belum ada pengajuan"}
              description={isManager ? "Pengajuan dari anggota tim akan muncul di sini." : "Pengajuan baru akan muncul di sini setelah dikirim."}
            />
          ) : (
            <div className="space-y-3">
              {requests.map((item) => {
                const ws = item.workflowStatus;
                const displayStatus = item.statusLabel ?? getWorkflowStatusLabel(ws) ?? item.status;
                const statusTone = ws === "rejected" || item.status === "Ditolak" ? "danger"
                  : ws === "approved" || item.status === "Disetujui" ? "success"
                  : "warning";
                const requestId = item.id;
                const canApproveRequest = Boolean(requestId) && canShowApprovalActionsForRequest(currentSession.user.role, ws);
                return (
                  <article key={item.id ?? item.title} className="rounded-[24px] border border-[#edf0f5] bg-white p-4 shadow-[0_2px_12px_rgba(20,24,31,0.05)]">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-[#111827]">{item.title}</p>
                        <StatusBadge tone={statusTone}>{displayStatus}</StatusBadge>
                      </div>
                      {item.category ? (
                        <p className="text-[11px] font-medium text-[#596172]">{item.category}</p>
                      ) : null}
                      {item.startDate ? (
                        <p className="text-xs font-semibold text-[#667085]">
                          {item.startDate}{item.endDate && item.endDate !== item.startDate ? ` – ${item.endDate}` : ""}
                        </p>
                      ) : null}
                      <p className="text-sm leading-6 text-[#596172]">{item.detail}</p>
                      {item.adminNote ? (
                        <p className="text-xs font-semibold text-[#667085]">Catatan reviewer: {item.adminNote}</p>
                      ) : null}
                    </div>
                    {canApproveRequest ? (
                      <div className="mt-4">
                        <FormInput
                          label="Catatan approval"
                          value={approvalNotes[requestId!] ?? ""}
                          onChange={(event) => {
                            setApprovalNotes((current) => ({ ...current, [requestId!]: event.target.value }));
                            setApprovalErrors((current) => {
                              const next = { ...current };
                              delete next[requestId!];
                              return next;
                            });
                          }}
                          placeholder="Tambahkan alasan atau catatan reviewer"
                          error={approvalErrors[requestId!]}
                          hint="Catatan wajib saat menolak agar alasan keputusan jelas."
                        />
                      </div>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <SecondaryButton onClick={() => item.id && openRequestDetail(item.id)}>Detail</SecondaryButton>
                      {canApproveRequest ? (
                        <>
                          <PrimaryButton onClick={() => handleApproval(item.id!, "Disetujui")} disabled={busyAction === `Disetujui-${item.id}`}>
                            Setujui
                          </PrimaryButton>
                          <SecondaryButton onClick={() => handleApproval(item.id!, "Ditolak")} disabled={busyAction === `Ditolak-${item.id}`}>
                            Tolak
                          </SecondaryButton>
                        </>
                      ) : null}
                      {!isAdmin && !isManager && item.status === "Menunggu" && item.id ? (
                        <SecondaryButton onClick={() => handleCancelRequest(item.id!)} disabled={busyAction === `cancel-${item.id}`}>
                          Batalkan
                        </SecondaryButton>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </Panel>
      </section>
    );
  }

  function renderProfileWorkspace() {
    const user = currentSession.user;

    if (isAdmin) {
      return (
        <section className="grid gap-5 lg:grid-cols-2">
          <Panel eyebrow="Profil" title="Profil akun HR">
            <dl className="grid gap-4">
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#8099c8]">Nama</dt>
                <dd className="mt-1 break-words text-[13px] font-medium text-[#111827]">{profileValue(user.fullName)}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#8099c8]">Email</dt>
                <dd className="mt-1 break-words text-[13px] font-medium text-[#111827]">{profileValue(user.email)}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#8099c8]">Role</dt>
                <dd className="mt-1 text-[13px] font-medium text-[#111827]">Admin HR</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#8099c8]">Organization</dt>
                <dd className="mt-1 break-words text-[13px] font-medium text-[#111827]">{profileValue(user.organizationName)}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#8099c8]">Access scope</dt>
                <dd className="mt-1 text-[13px] font-medium text-[#111827]">Semua divisi / organisasi</dd>
              </div>
            </dl>
          </Panel>

          <Panel eyebrow="Hak akses" title="Ringkasan izin HR">
            <div className="grid gap-3">
              {[
                "Melihat semua karyawan",
                "Meninjau presensi organisasi",
                "Final approval pengajuan",
                "Meninjau pengecualian",
                "Mengelola lokasi dan shift",
                "Export laporan"
              ].map((label) => (
                <div key={label} className="flex items-center justify-between gap-3 rounded-[16px] border border-[#edf0f5] bg-[#f9fafc] px-3.5 py-2.5">
                  <p className="min-w-0 break-words text-[13px] font-medium text-[#111827]">{label}</p>
                  <StatusBadge tone="success">Aktif</StatusBadge>
                </div>
              ))}
            </div>
          </Panel>

          <Panel eyebrow="Keamanan akun" title="Status akses">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#8099c8]">Metode login</dt>
                <dd className="mt-1 text-[13px] text-[#111827]">Email dan password</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#8099c8]">Last login</dt>
                <dd className="mt-1 text-[13px] text-[#111827]">Belum tersedia</dd>
              </div>
            </dl>
            <SecondaryButton className="mt-4 w-full sm:w-auto" onClick={() => setChangePasswordOpen(true)}>
              Ganti password
            </SecondaryButton>
          </Panel>
        </section>
      );
    }

    if (isManager) {
      return (
        <section className="grid gap-5 lg:grid-cols-2">
          <Panel eyebrow="Identitas" title="Data supervisor">
            <dl className="grid gap-4">
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#8099c8]">Nama lengkap</dt>
                <dd className="mt-1 text-[13px] font-medium text-[#111827]">{user.fullName}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#8099c8]">Email</dt>
                <dd className="mt-1 text-[13px] font-medium text-[#111827]">{user.email}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#8099c8]">Organisasi</dt>
                <dd className="mt-1 text-[13px] font-medium text-[#111827]">{user.organizationName}</dd>
              </div>
              {user.departmentName ? (
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#8099c8]">Departemen</dt>
                  <dd className="mt-1 text-[13px] font-medium text-[#111827]">{user.departmentName}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#8099c8]">Role</dt>
                <dd className="mt-1 text-[13px] font-medium text-[#111827]">Manager / Supervisor</dd>
              </div>
            </dl>
          </Panel>
          <Panel eyebrow="Hak akses" title="Izin supervisor">
            <div className="grid gap-3">
              {[
                { label: "Melihat anggota tim", active: true },
                { label: "Memantau presensi tim", active: true },
                { label: "Meninjau pengajuan tim", active: true },
                { label: "Meninjau pengecualian tim", active: true },
                { label: "Ekspor laporan global", active: false },
                { label: "Kelola lokasi kerja", active: false },
                { label: "Kelola shift global", active: false }
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3 rounded-[16px] border border-[#edf0f5] bg-[#f9fafc] px-3.5 py-2.5">
                  <p className={`text-[13px] font-medium ${item.active ? "text-[#111827]" : "text-[#9aa3b2]"}`}>{item.label}</p>
                  <StatusBadge tone={item.active ? "success" : "neutral"}>{item.active ? "Aktif" : "Tidak tersedia"}</StatusBadge>
                </div>
              ))}
            </div>
          </Panel>
        </section>
      );
    }

    const shift = employeeSummary?.assignedShift;
    const profile = employeeSummary?.profile ?? user;

    return (
      <section className="grid gap-5 lg:grid-cols-2">
        <Panel eyebrow="Identitas" title="Data karyawan">
          <dl className="grid gap-4">
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#8099c8]">Nama lengkap</dt>
              <dd className="mt-1 text-[13px] font-medium text-[#111827]">{user.fullName}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#8099c8]">Email</dt>
              <dd className="mt-1 text-[13px] font-medium text-[#111827]">{user.email}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#8099c8]">Organisasi</dt>
              <dd className="mt-1 text-[13px] font-medium text-[#111827]">{user.organizationName}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#8099c8]">Role</dt>
              <dd className="mt-1 text-[13px] font-medium capitalize text-[#111827]">{user.role}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#8099c8]">Departemen</dt>
              <dd className="mt-1 text-[13px] text-[#111827]">{profileValue(profile.departmentName)}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#8099c8]">Posisi</dt>
              <dd className="mt-1 text-[13px] text-[#111827]">{profileValue(profile.position)}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#8099c8]">Manager</dt>
              <dd className="mt-1 text-[13px] text-[#111827]">{profileValue(profile.managerName)}</dd>
            </div>
          </dl>
        </Panel>

        <Panel eyebrow="Absensi" title="Pengaturan kehadiran">
          {shift ? (
            <dl className="grid gap-4">
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#8099c8]">Shift aktif</dt>
                <dd className="mt-1 text-[13px] font-medium text-[#111827]">{shift.name}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#8099c8]">Jam kerja</dt>
                <dd className="mt-1 text-[13px] font-medium text-[#111827]">{shift.startTime} – {shift.endTime}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#8099c8]">Lokasi kerja</dt>
                <dd className="mt-1 text-[13px] font-medium text-[#111827]">{shift.locationName}</dd>
              </div>
              {/* TODO(backend): tampilkan metode validasi dan status perangkat terdaftar dari device registry API */}
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#8099c8]">Metode validasi</dt>
                <dd className="mt-1 text-[13px] text-[#b0b8c8]">Belum tersedia</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#8099c8]">Perangkat terdaftar</dt>
                <dd className="mt-1 text-[13px] text-[#b0b8c8]">Belum tersedia</dd>
              </div>
            </dl>
          ) : (
            <EmptyState title="Data shift belum tersedia" description="Reload halaman untuk memuat data shift aktif." />
          )}
          {employeeSummary ? (
            <div className="mt-5 grid grid-cols-2 gap-2.5 border-t border-[#edf0f5] pt-4 sm:grid-cols-4">
              <div className="rounded-xl border border-[#edf0f5] bg-[#f9fafc] p-3 text-center">
                <p className="text-[18px] font-semibold text-[#111827]">{employeeSummary.totalDays}</p>
                <p className="mt-0.5 text-[11px] font-medium text-[#7a8495]">Hari hadir</p>
              </div>
              <div className="rounded-xl border border-[#edf0f5] bg-[#f9fafc] p-3 text-center">
                <p className="text-[18px] font-semibold text-[#111827]">{employeeSummary.onTimeDays}</p>
                <p className="mt-0.5 text-[11px] font-medium text-[#7a8495]">Tepat waktu</p>
              </div>
              <div className="rounded-xl border border-[#edf0f5] bg-[#f9fafc] p-3 text-center">
                <p className="text-[18px] font-semibold text-[#111827]">{employeeSummary.lateDays}</p>
                <p className="mt-0.5 text-[11px] font-medium text-[#7a8495]">Terlambat</p>
              </div>
              <div className="rounded-xl border border-[#edf0f5] bg-[#f9fafc] p-3 text-center">
                <p className="text-[18px] font-semibold text-[#111827]">{employeeSummary.pendingRequests}</p>
                <p className="mt-0.5 text-[11px] font-medium text-[#7a8495]">Pending</p>
              </div>
            </div>
          ) : null}
        </Panel>

        <Panel eyebrow="Keamanan" title="Keamanan akun">
          {changePasswordOpen ? (
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (!changePasswordForm.next || !changePasswordForm.current) {
                  setChangePasswordError("Semua kolom wajib diisi.");
                  return;
                }
                if (changePasswordForm.next !== changePasswordForm.confirm) {
                  setChangePasswordError("Password baru dan konfirmasi tidak cocok.");
                  return;
                }
                if (changePasswordForm.next.length < 8) {
                  setChangePasswordError("Password baru minimal 8 karakter.");
                  return;
                }
                setChangePasswordError(null);
                // TODO(backend): sambungkan ke auth API PATCH /auth/password setelah production auth aktif
                setChangePasswordOpen(false);
                setChangePasswordForm({ current: "", next: "", confirm: "" });
                setActionMessage("Ganti password berhasil. Silakan login ulang.");
              }}
            >
              <FormInput
                label="Password saat ini"
                type="password"
                value={changePasswordForm.current}
                onChange={(event) => setChangePasswordForm((prev) => ({ ...prev, current: event.target.value }))}
                autoComplete="current-password"
              />
              <FormInput
                label="Password baru"
                type="password"
                value={changePasswordForm.next}
                onChange={(event) => setChangePasswordForm((prev) => ({ ...prev, next: event.target.value }))}
                autoComplete="new-password"
                hint="Minimal 8 karakter."
              />
              <FormInput
                label="Konfirmasi password baru"
                type="password"
                value={changePasswordForm.confirm}
                onChange={(event) => setChangePasswordForm((prev) => ({ ...prev, confirm: event.target.value }))}
                autoComplete="new-password"
              />
              {changePasswordError ? <ErrorState title="Tidak bisa menyimpan password" description={changePasswordError} /> : null}
              <div className="rounded-xl border border-[#ffe4b0] bg-[#fffbf0] px-3.5 py-2.5 text-[12px] font-medium text-[#92580b]">
                Ganti password akan aktif setelah auth production disambungkan.
              </div>
              <div className="flex gap-3">
                <PrimaryButton type="submit">Simpan password</PrimaryButton>
                <SecondaryButton
                  type="button"
                  onClick={() => {
                    setChangePasswordOpen(false);
                    setChangePasswordForm({ current: "", next: "", confirm: "" });
                    setChangePasswordError(null);
                  }}
                >
                  Batal
                </SecondaryButton>
              </div>
            </form>
          ) : (
            <div className="grid gap-4">
              <dl className="grid gap-4">
                {/* TODO(backend): tampilkan last login dari session API */}
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#8099c8]">Login terakhir</dt>
                  <dd className="mt-1 text-[13px] text-[#b0b8c8]">Belum tersedia</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#8099c8]">Perangkat aktif</dt>
                  <dd className="mt-1 text-[13px] text-[#b0b8c8]">Belum tersedia</dd>
                </div>
              </dl>
              <SecondaryButton onClick={() => setChangePasswordOpen(true)}>Ganti password</SecondaryButton>
              <SecondaryButton
                onClick={() => {
                  clearSession();
                  location.assign("/login");
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Keluar dari akun
              </SecondaryButton>
            </div>
          )}
        </Panel>

        <Panel eyebrow="Kontak" title="Informasi kontak">
          <div className="grid gap-4">
            <div className="rounded-xl border border-[#ffe4b0] bg-[#fffbf0] px-3.5 py-2.5 text-[12px] font-medium text-[#92580b]">
              Data kontak dapat diedit setelah employee profile API aktif.
            </div>
            {/* TODO(backend): sambungkan ke employee profile API untuk nomor HP dan kontak darurat */}
            <dl className="grid gap-4">
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#8099c8]">Nomor HP</dt>
                <dd className="mt-1 text-[13px] text-[#b0b8c8]">Belum tersedia</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#8099c8]">Kontak darurat</dt>
                <dd className="mt-1 text-[13px] text-[#b0b8c8]">Belum tersedia</dd>
              </div>
            </dl>
          </div>
        </Panel>
      </section>
    );
  }

  function renderNotificationsWorkspace() {
    const unreadCount = notifications.filter((item) => !item.readAt).length;
    return (
      <section className="grid gap-5">
        <Panel eyebrow="Inbox" title={`Notifikasi${unreadCount > 0 ? ` · ${unreadCount} belum dibaca` : ""}`}>
          {!notificationsLoaded ? (
            <LoadingState label="Memuat notifikasi" />
          ) : notificationsError ? (
            <ErrorState title="Notifikasi belum tersedia" description={notificationsError} />
          ) : notifications.length === 0 ? (
            <EmptyState title="Belum ada notifikasi" description="Update pengajuan dan validasi akan muncul di sini." />
          ) : (
            <div className="grid gap-2">
              {notifications.map((item) => {
                const isUnread = !item.readAt;
                return (
                  <article
                    key={item.id}
                    data-read-state={isUnread ? "unread" : "read"}
                    className={`relative overflow-hidden rounded-[18px] border p-4 transition-colors ${
                      isUnread
                        ? "border-[#dbe7ff] bg-[#f4f8ff]"
                        : "border-[#edf0f5] bg-white"
                    }`}
                  >
                    {isUnread ? (
                      <span className="absolute left-0 top-0 h-full w-[3px] rounded-l-full bg-[#1769ff]" aria-hidden="true" />
                    ) : null}
                    <div className="flex items-start justify-between gap-3 pl-1">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {isUnread ? <span className="h-2 w-2 shrink-0 rounded-full bg-[#1769ff]" aria-hidden="true" /> : null}
                          <p className={`break-words text-sm leading-5 ${isUnread ? "font-semibold text-[#111827]" : "font-medium text-[#374151]"}`}>
                            {item.title}
                          </p>
                        </div>
                        <p className="mt-1 break-words text-[13px] leading-5 text-[#596172]">{item.message}</p>
                        <p className="mt-2 text-[11px] font-medium text-[#9aa3b2]">
                          {new Date(item.createdAt).toLocaleString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </p>
                      </div>
                      {isUnread ? (
                        <button
                          type="button"
                          aria-label="Tandai dibaca"
                          onClick={async () => {
                            if (!session) return;
                            const read = await markNotificationRead(session.token, item.id);
                            setNotifications((current) => current.map((entry) => entry.id === read.id ? read : entry));
                          }}
                          className="shrink-0 rounded-xl border border-[#dbe7ff] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#1769ff] transition hover:bg-[#f0f6ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1769ff]"
                        >
                          Tandai dibaca
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </Panel>
      </section>
    );
  }

  function renderTeamWorkspace() {

    const managerColumns = [
      { key: "name", header: "Karyawan" },
      { key: "department", header: "Departemen" },
      { key: "shift", header: "Shift" },
      { key: "checkin", header: "Check-in" },
      { key: "status", header: "Status hari ini" },
      { key: "validation", header: "Validasi" }
    ];

    const adminColumns = [
      { key: "name", header: "Karyawan" },
      { key: "role", header: "Role" },
      { key: "department", header: "Departemen" },
      { key: "manager", header: "Manager" },
      { key: "shift", header: "Shift" },
      { key: "checkin", header: "Check-in" },
      { key: "status", header: "Status" },
      { key: "validation", header: "Validasi" },
      { key: "actions", header: "Aksi" }
    ];

    return (
      <div className="grid gap-5">
        {isManager ? (
          <PageHeader
            eyebrow="Tim Saya"
            title="Anggota Tim"
            description="Pantau anggota tim yang berada di bawah supervisi Anda."
          />
        ) : null}
        <Panel eyebrow={isManager ? "Supervisi" : "Daftar karyawan"} title={isManager ? "Anggota tim Anda" : "Daftar karyawan aktif"}>
          <div data-testid="team-filter-strip" className="mb-4 rounded-[18px] border border-[#edf0f5] bg-[#f6f8fb] p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a8495]" />
                <input
                  type="text"
                  aria-label={isManager ? "Cari anggota tim berdasarkan nama atau email" : "Cari karyawan"}
                  placeholder={isManager ? "Cari nama, email, atau departemen..." : "Cari nama, email, atau kode karyawan..."}
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="w-full rounded-2xl border border-[#e2e7f0] bg-white py-2.5 pl-9 pr-3 text-sm text-[#111827] outline-none transition focus:border-[#1769ff] focus:ring-2 focus:ring-[#1769ff]/10"
                />
              </div>
              {!isManager ? (
                <>
                  <div className="sm:w-48">
                    <FilterSelect
                      ariaLabel="Divisi / Departemen"
                      value={employeeDepartmentFilter}
                      onChange={setEmployeeDepartmentFilter}
                      options={[
                        { value: "", label: "Semua divisi" },
                        ...departmentOptions.map((d) => ({ value: d.id, label: d.name }))
                      ]}
                    />
                  </div>
                  <div className="sm:w-40">
                    <FilterSelect
                      ariaLabel="Status hari ini"
                      value={employeeStatusFilter}
                      onChange={setEmployeeStatusFilter}
                      options={employeeStatusFilters.map((o) => ({ value: o.value, label: o.label }))}
                    />
                  </div>
                </>
              ) : null}
            </div>
            <div className="mt-2 flex min-w-0 flex-wrap gap-1.5">
              {(["present", "late", "absent", "leave"] as const).map((filter) => {
                const countMap = {
                  present: employeeList.filter((e) => e.todayStatus === "present").length,
                  late: employeeList.filter((e) => e.todayStatus === "late").length,
                  absent: employeeList.filter((e) => e.todayStatus === "absent").length,
                  leave: employeeList.filter((e) => e.todayStatus === "leave").length
                };
                const labelMap = { present: "Hadir", late: "Terlambat", absent: "Belum hadir", leave: "Izin" };
                return (
                  <span key={filter} className="rounded-full border border-[#edf0f5] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#596172]">
                    {labelMap[filter]}: {countMap[filter]}
                  </span>
                );
              })}
            </div>
          </div>
          {!employeeListLoaded ? (
            <LoadingState label={isManager ? "Memuat daftar anggota tim" : "Memuat daftar karyawan"} />
          ) : employeeListError ? (
            <ErrorState title={isManager ? "Data tim belum tersedia" : "Daftar karyawan belum tersedia"} description={`${employeeListError} Coba refresh roster untuk memuat ulang data tim.`} />
          ) : employeeList.length === 0 ? (
            <EmptyState
              title={isManager ? "Belum ada anggota tim" : "Belum ada karyawan terdaftar"}
              description={isManager ? "Karyawan akan muncul setelah HR menetapkan Anda sebagai manager." : "Admin HR perlu menambahkan anggota tim atau menyinkronkan data pegawai sebelum roster bisa dipakai."}
            />
          ) : filteredEmployees.length === 0 ? (
            <EmptyState title="Tidak ada yang cocok" description="Coba kata kunci berbeda atau hapus filter pencarian." />
          ) : (
            <DataTable
              caption={isManager ? "Daftar anggota tim" : "Daftar karyawan aktif"}
              columns={isManager ? managerColumns : adminColumns}
              rows={filteredEmployees.map((emp) => ({
                id: emp.id,
                name: (
                  <div>
                    <p className="font-semibold text-[#111827]">{emp.fullName}</p>
                    <p className="mt-1 text-xs text-[#667085]">{emp.employeeCode ? `${emp.employeeCode} · ` : ""}{emp.email}</p>
                  </div>
                ),
                role: <StatusBadge tone="info">{roleLabels[emp.role]}</StatusBadge>,
                department: profileValue(emp.departmentName),
                manager: profileValue(emp.managerName),
                shift: emp.shiftName ?? "-",
                checkin: <span className="tabular-nums">{emp.checkInTime ?? "--:--"}</span>,
                status: (
                  <StatusBadge tone={emp.todayStatus === "present" ? "success" : emp.todayStatus === "late" ? "warning" : emp.todayStatus === "leave" ? "info" : "neutral"}>
                    {emp.todayStatus === "present" ? "Hadir" : emp.todayStatus === "late" ? "Terlambat" : emp.todayStatus === "leave" ? "Izin" : "Belum hadir"}
                  </StatusBadge>
                ),
                validation: emp.validationStatus ? (
                  <StatusBadge tone={emp.validationStatus === "verified" ? "success" : emp.validationStatus === "needs_review" ? "warning" : "danger"}>
                    {emp.validationStatus === "verified" ? "Terverifikasi" : emp.validationStatus === "needs_review" ? "Perlu review" : emp.validationStatus}
                  </StatusBadge>
                ) : <span className="text-xs text-[#7a8495]">-</span>,
                actions: (
                  <button
                    type="button"
                    disabled={Boolean(departmentUnavailableReason)}
                    title={departmentUnavailableReason}
                    onClick={() => {
                      setUbahPenempatanEmployee(emp);
                      setUbahPenempatanDeptId(emp.departmentId ?? "");
                      setUbahPenempatanError(null);
                    }}
                    className="rounded-lg border border-[#e2e7f0] px-2.5 py-1 text-xs font-semibold text-[#596172] transition hover:border-[#1769ff] hover:text-[#1769ff] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Ubah divisi
                  </button>
                )
              }))}
            />
          )}
        </Panel>

        {isManager ? null : (
        <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <Panel eyebrow="Antrian pengecualian" title="Attendance exceptions yang perlu keputusan">
            {!exceptionQueueLoaded ? (
              <LoadingState label="Memuat exception queue" />
            ) : exceptionQueueError ? (
              <ErrorState title="Exception queue belum tersedia" description={`${exceptionQueueError} Coba buka ulang tab tim untuk melanjutkan review.`} />
            ) : exceptionQueue.length === 0 ? (
              <EmptyState
                title={isManager ? "Belum ada pengecualian" : "Semua record attendance sedang clear"}
                description={isManager ? "Kasus validasi tim akan muncul jika membutuhkan review." : "Belum ada kasus radius, token, selfie, atau device mismatch yang menunggu keputusan operasional."}
              />
            ) : (
              <div className="space-y-3">
                {exceptionQueue.map((item) => (
                  <article key={item.id} className="rounded-[24px] border border-[#edf0f5] bg-[#f9fafc] p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#111827]">{item.employeeName}</p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#1769ff]">{item.exceptionType}</p>
                        <p className="mt-2 break-words text-sm leading-6 text-[#596172]">{item.reason}</p>
                      </div>
                      <StatusBadge tone={item.status === "Need Review" ? "warning" : item.status === "Rejected" ? "danger" : "success"}>{item.status}</StatusBadge>
                    </div>
                    {(isAdmin || isManager) ? (
                      <div className="mt-4">
                        <FormInput
                          label="Catatan review"
                          value={exceptionNotes[item.id] ?? ""}
                          onChange={(event) => {
                            setExceptionNotes((current) => ({ ...current, [item.id]: event.target.value }));
                            setExceptionErrors((current) => {
                              const next = { ...current };
                              delete next[item.id];
                              return next;
                            });
                          }}
                          placeholder="Tambahkan alasan keputusan"
                          error={exceptionErrors[item.id]}
                          hint="Catatan wajib saat reject atau request correction."
                        />
                      </div>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <PrimaryButton onClick={() => handleExceptionDecision(item.id, "Approved")} disabled={busyAction === `exception-Approved-${item.id}`}>Setujui</PrimaryButton>
                      <SecondaryButton onClick={() => handleExceptionDecision(item.id, "Rejected")} disabled={busyAction === `exception-Rejected-${item.id}`}>Tolak</SecondaryButton>
                      <SecondaryButton onClick={() => handleExceptionDecision(item.id, "Request Correction")} disabled={busyAction === `exception-Request Correction-${item.id}`}>Minta koreksi</SecondaryButton>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </Panel>

          <Panel eyebrow="Jenis pengecualian" title="Apa yang sedang divalidasi">
            <div className="grid gap-3">
              {["Di luar radius", "Terlambat check-in", "QR tidak valid", "QR kedaluwarsa", "Perangkat berbeda", "Selfie tidak ada"].map((item) => (
                <div key={item} className="rounded-[20px] border border-[#edf0f5] bg-white p-4">
                  <p className="text-sm font-semibold text-[#111827]">{item}</p>
                  <p className="mt-2 text-sm leading-6 text-[#667085]">Kasus ini tidak dibuang. Taptu menyimpannya sebagai exception agar HR tetap bisa memutuskan dengan jejak audit.</p>
                </div>
              ))}
            </div>
          </Panel>
        </section>
        )}
      </div>
    );
  }

  function renderStructureWorkspace() {
    return (
      <div className="grid gap-5">
        <PageHeader
          eyebrow="STRUKTUR TIM"
          title="Divisi & Penempatan"
          description="Kelola divisi, tetapkan manager, dan atur penempatan karyawan."
        />

        <div data-testid="divisi-penempatan-section">
          <Panel title="Divisi & Penempatan" className="flex flex-col gap-4">
            <div className="flex items-center justify-end">
              <button
                type="button"
                disabled={Boolean(departmentUnavailableReason)}
                title={departmentUnavailableReason}
                onClick={() => {
                  setEditingDivisi(null);
                  setDivisiForm({ name: "", managerId: "" });
                  setDivisiFormError(null);
                  setDepartmentActionError(null);
                  setDivisiFormOpen(true);
                }}
                className="shrink-0 rounded-2xl bg-[#1769ff] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1255d4] disabled:cursor-not-allowed disabled:opacity-50"
              >
                + Tambah divisi
              </button>
            </div>
            {departmentActionError ? <ErrorState title="Aksi divisi belum bisa dilanjutkan" description={departmentActionError} /> : null}
            {!departmentsLoaded ? (
              <LoadingState label="Memuat daftar divisi" />
            ) : departmentsError ? (
              <ErrorState title="Daftar divisi belum tersedia" description={`${departmentsError} Coba buka ulang halaman Struktur.`} />
            ) : departments.length === 0 ? (
              <EmptyState
                title="Belum ada divisi"
                description="Tambahkan divisi agar HR dapat mengelompokkan karyawan dan menetapkan manager."
              />
            ) : (
              <div data-testid="divisi-table-clip" className="overflow-hidden rounded-[20px] border border-[#edf0f5] sm:rounded-[24px]">
                <div className="overflow-x-auto">
                  <table className="min-w-[600px] divide-y divide-[#edf0f5] bg-white sm:min-w-full">
                    <caption className="sr-only">Daftar divisi organisasi</caption>
                    <thead className="bg-[#f9fafc]">
                      <tr>
                        {(["Divisi", "Manager", "Jumlah anggota", "Status", "Aksi"] as const).map((header) => (
                          <th key={header} scope="col" className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#667085]">{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#edf0f5]">
                      {departments.map((div) => {
                        const menuOpen = openDepartmentActionId === div.id;
                        return (
                          <tr key={div.id} data-testid={`divisi-row-${div.id}`}>
                            <td className="max-w-[200px] break-words px-4 py-3.5 text-sm font-semibold text-[#111827]">{div.name}</td>
                            <td className="px-4 py-3.5 text-sm text-[#596172]">
                              {div.managerName ?? <span className="text-[#9aa3b2]">Belum ditetapkan</span>}
                            </td>
                            <td className="px-4 py-3.5 text-sm text-[#111827]">{div.memberCount ?? 0} anggota</td>
                            <td className="px-4 py-3.5 text-sm">
                              <StatusBadge tone={div.isActive ? "success" : "neutral"}>{div.isActive ? "Aktif" : "Nonaktif"}</StatusBadge>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="relative inline-block text-left">
                                <button
                                  ref={(node) => {
                                    departmentActionButtonRefs.current[div.id] = node;
                                  }}
                                  type="button"
                                  aria-haspopup="menu"
                                  aria-expanded={menuOpen}
                                  onClick={(event) => toggleDepartmentActionMenu(div.id, event)}
                                  className="rounded-lg border border-[#d8dde7] bg-white px-2.5 py-1 text-xs font-semibold text-[#111827] transition hover:border-[#1769ff] hover:text-[#1769ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1769ff]"
                                >
                                  Aksi {div.name}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Panel>
        </div>
      </div>
    );
  }

  function renderDepartmentActionMenu() {
    if (!openDepartmentActionId || !departmentActionMenuPosition) return null;

    const department = departments.find((item) => item.id === openDepartmentActionId);
    if (!department) return null;

    const isDeactivating = busyAction === `deactivate-divisi-${department.id}`;
    const style: CSSProperties = {
      position: "fixed",
      left: `${departmentActionMenuPosition.left}px`,
      width: `${departmentActionMenuPosition.width}px`,
      maxHeight: `${DEPARTMENT_ACTION_MENU_MAX_HEIGHT}px`,
      overflowY: "auto",
      zIndex: 9999
    };

    if (typeof departmentActionMenuPosition.top === "number") {
      style.top = `${departmentActionMenuPosition.top}px`;
    } else if (typeof departmentActionMenuPosition.bottom === "number") {
      style.bottom = `${departmentActionMenuPosition.bottom}px`;
    }

    return createPortal(
      <div
        ref={departmentActionMenuRef}
        role="menu"
        aria-label={`Aksi ${department.name}`}
        style={style}
        className="rounded-2xl border border-[#e2e7f0] bg-white p-1 shadow-[0_12px_32px_rgba(20,24,31,0.14)]"
      >
        <button type="button" role="menuitem" onMouseDown={() => handleViewDepartmentMembers(department.id)} className="block w-full rounded-xl px-3 py-2 text-left text-xs font-semibold text-[#111827] hover:bg-[#f4f7ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1769ff]">
          Lihat anggota
        </button>
        <button type="button" role="menuitem" onMouseDown={() => openDepartmentForm(department)} className="block w-full rounded-xl px-3 py-2 text-left text-xs font-semibold text-[#111827] hover:bg-[#f4f7ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1769ff]">
          Edit divisi
        </button>
        <button type="button" role="menuitem" onMouseDown={() => openDepartmentForm(department)} className="block w-full rounded-xl px-3 py-2 text-left text-xs font-semibold text-[#111827] hover:bg-[#f4f7ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1769ff]">
          Atur manager
        </button>
        <button
          type="button"
          role="menuitem"
          disabled={isDeactivating || !department.isActive}
          onMouseDown={() => handleDeactivateDepartment(department)}
          className="block w-full rounded-xl px-3 py-2 text-left text-xs font-semibold text-[#a54c2f] hover:bg-[#fff5f5] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1769ff]"
        >
          {isDeactivating ? "Menonaktifkan..." : "Nonaktifkan divisi"}
        </button>
      </div>,
      document.body
    );
  }

  function renderScannerWorkspace() {
    if (!scannerLoaded) {
      return <LoadingState label="Memuat status scanner" />;
    }

    if (scannerError) {
      return <ErrorState title="Scanner mode belum siap" description={`${scannerError} Refresh token setelah koneksi scanner kembali stabil.`} />;
    }

    return (
      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel eyebrow="Scanner mode" title="Gate kiosk aktif">
          <div className="rounded-[24px] border border-[#111827] bg-[#111827] p-4 text-white sm:rounded-[26px] sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#8bb8ff]">Token aktif</p>
                <p className="mt-3 break-all text-2xl font-black tracking-[-0.02em] sm:text-4xl sm:tracking-[-0.04em]">{scannerToken ?? "HDR-000-000"}</p>
                <p className="mt-3 text-sm leading-7 text-[#cbd5e1]">
                  Token dinamis ini dipakai scanner gate. Attempt invalid atau expired akan masuk audit dan exception flow.
                </p>
              </div>
              <ScanFace className="h-8 w-8 text-[#8bb8ff]" />
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8bb8ff]">Countdown</p>
                <p className="mt-2 text-2xl font-black tracking-[-0.02em] sm:text-3xl sm:tracking-[-0.04em]" aria-live="polite">{scannerMeta?.expiresInSeconds ?? 30}s</p>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8bb8ff]">Status</p>
                <p className="mt-2 text-xl font-black">{scannerMeta?.expiresInSeconds === 0 ? "Expired" : "Active"}</p>
                <p className="mt-2 text-xs font-semibold text-[#cbd5e1]">
                  {scannerMeta?.expiresInSeconds === 0 ? "Scan baru akan ditolak sampai token diperbarui." : "Scanner siap menerima scan terbaru."}
                </p>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8bb8ff]">Lokasi</p>
                <p className="mt-2 text-xl font-black">{scannerMeta?.locationName ?? "Gerbang Utama"}</p>
              </div>
            </div>
            <PrimaryButton className="mt-6" onClick={handleRefreshScannerToken} disabled={busyAction === "refresh-scanner"}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {busyAction === "refresh-scanner" ? "Memperbarui..." : "Refresh token"}
            </PrimaryButton>
          </div>
        </Panel>

        <Panel eyebrow="Recent scans" title="Status scan terakhir">
          {scannerScans.length === 0 ? (
            <EmptyState title="Belum ada scan terbaru" description="Riwayat scan akan muncul setelah ada percobaan sukses, invalid, atau token kedaluwarsa di kiosk ini." />
          ) : (
            <div className="grid gap-3">
              {scannerScans.map((item) => (
                <div key={item.id} className="rounded-[22px] border border-[#edf0f5] bg-[#f9fafc] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#111827]">{item.employeeName}</p>
                      <p className="mt-2 text-sm leading-6 text-[#667085]">{item.detail}</p>
                    </div>
                    <StatusBadge tone={item.status === "success" ? "success" : item.status === "expired" ? "warning" : "danger"}>{item.status}</StatusBadge>
                  </div>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#667085]">{item.time}</p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </section>
    );
  }

  function renderLocationsWorkspace() {
    return (
      <div className="grid gap-5">
        <section className="grid gap-5 xl:grid-cols-2">
          <Panel eyebrow="Work locations" title="Geofence dan radius validasi">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-[#596172]">Lokasi kerja dipakai sebagai titik validasi GPS saat karyawan absen.</p>
              {isAdmin && (
                <PrimaryButton onClick={() => { setEditingLocation(null); setLocationForm({ name: "", address: "", latitude: "", longitude: "", radiusMeters: "150" }); setLocationFormOpen(true); }}>
                  <Building2 className="mr-2 h-4 w-4" />
                  Tambah lokasi
                </PrimaryButton>
              )}
            </div>
            {!workLocationsLoaded ? (
              <LoadingState label="Memuat lokasi kerja" />
            ) : workLocationsError ? (
              <ErrorState title="Lokasi kerja belum tersedia" description={`${workLocationsError} Coba muat ulang workspace lokasi untuk melanjutkan pengaturan geofence.`} />
            ) : workLocations.length === 0 ? (
              <EmptyState title="Belum ada work location" description="Admin HR perlu membuat titik kerja dan radius geofence sebelum validasi GPS dipakai." />
            ) : (
              <div className="space-y-3">
                {workLocations.map((loc) => (
                  <div key={loc.id} className="rounded-[22px] border border-[#edf0f5] bg-[#f9fafc] p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-semibold text-[#111827]">{loc.name}</p>
                        {loc.address && <p className="mt-1 text-xs font-semibold text-[#667085]">{loc.address}</p>}
                        <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-[#7a8495]">
                          <span>Radius: {loc.radiusMeters} m</span>
                          <span>Lat: {loc.latitude.toFixed(4)}</span>
                          <span>Lng: {loc.longitude.toFixed(4)}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-row flex-wrap gap-2 sm:flex-col sm:items-end">
                        <StatusBadge tone={loc.status === "active" ? "success" : "neutral"}>{loc.status === "active" ? "Aktif" : "Nonaktif"}</StatusBadge>
                        {isAdmin && (
                          <SecondaryButton
                            onClick={() => {
                              setEditingLocation(loc);
                              setLocationForm({ name: loc.name, address: loc.address ?? "", latitude: String(loc.latitude), longitude: String(loc.longitude), radiusMeters: String(loc.radiusMeters) });
                              setLocationFormOpen(true);
                            }}
                          >
                            Edit
                          </SecondaryButton>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {locationFormOpen && isAdmin && (
              <div className="mt-5 rounded-[24px] border border-[#d6def0] bg-white p-5">
                <p className="mb-4 text-sm font-semibold text-[#111827]">{editingLocation ? "Edit lokasi" : "Tambah lokasi baru"}</p>
                <form className="grid gap-4" onSubmit={handleSaveLocation}>
                  <FormInput label="Nama lokasi" value={locationForm.name} onChange={(e) => setLocationForm((c) => ({ ...c, name: e.target.value }))} placeholder="Kantor Pusat" required />
                  <FormInput label="Alamat (opsional)" value={locationForm.address} onChange={(e) => setLocationForm((c) => ({ ...c, address: e.target.value }))} placeholder="Jl. Sudirman No. 1" />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormInput label="Latitude" type="number" step="any" value={locationForm.latitude} onChange={(e) => setLocationForm((c) => ({ ...c, latitude: e.target.value }))} placeholder="-6.2088" required />
                    <FormInput label="Longitude" type="number" step="any" value={locationForm.longitude} onChange={(e) => setLocationForm((c) => ({ ...c, longitude: e.target.value }))} placeholder="106.8456" required />
                  </div>
                  <FormInput label="Radius (meter)" type="number" value={locationForm.radiusMeters} onChange={(e) => setLocationForm((c) => ({ ...c, radiusMeters: e.target.value }))} placeholder="150" required />
                  {locationFormError ? <ErrorState title="Form lokasi belum valid" description={locationFormError} /> : null}
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <PrimaryButton type="submit" disabled={busyAction === "save-location"}>{busyAction === "save-location" ? "Menyimpan..." : "Simpan lokasi"}</PrimaryButton>
                    <SecondaryButton type="button" onClick={() => { setLocationFormOpen(false); setEditingLocation(null); }}>Batal</SecondaryButton>
                  </div>
                </form>
              </div>
            )}
          </Panel>

          <Panel eyebrow="Shift management" title="Konfigurasi waktu dan lokasi kerja">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-[#596172]">Shift menentukan jam masuk, toleransi keterlambatan, dan lokasi validasi.</p>
              {isAdmin && (
                <PrimaryButton onClick={() => { setEditingShift(null); setShiftForm({ name: "", startTime: "", endTime: "", gracePeriodMinutes: "10", workLocationId: "", breakStartTime: "", breakEndTime: "" }); setShiftFormOpen(true); }}>
                  <Calendar className="mr-2 h-4 w-4" />
                  Tambah shift
                </PrimaryButton>
              )}
            </div>
            {!shiftsLoaded ? (
              <LoadingState label="Memuat shift" />
            ) : shiftsError ? (
              <ErrorState title="Daftar shift belum tersedia" description={`${shiftsError} Coba buka ulang workspace ini sebelum mengubah jadwal kerja.`} />
            ) : shifts.length === 0 ? (
              <EmptyState title="Belum ada shift aktif" description="Buat shift terlebih dahulu agar jam kerja dan toleransi keterlambatan bisa dipakai saat absensi." />
            ) : (
              <div className="space-y-3">
                {shifts.map((shift) => (
                  <div key={shift.id} className="rounded-[22px] border border-[#edf0f5] bg-[#f9fafc] p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-semibold text-[#111827]">{shift.name}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-[#7a8495]">
                          <span>{shift.startTime} - {shift.endTime}</span>
                          <span>Toleransi: {shift.gracePeriodMinutes} mnt</span>
                          {shift.workLocationName && <span>{shift.workLocationName}</span>}
                          {shift.breakStartTime && <span>Istirahat: {shift.breakStartTime} - {shift.breakEndTime}</span>}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-row flex-wrap gap-2 sm:flex-col sm:items-end">
                        <StatusBadge tone={shift.status === "active" ? "success" : "neutral"}>{shift.status === "active" ? "Aktif" : "Arsip"}</StatusBadge>
                        {isAdmin && (
                          <SecondaryButton
                            onClick={() => {
                              setEditingShift(shift);
                              setShiftForm({ name: shift.name, startTime: shift.startTime, endTime: shift.endTime, gracePeriodMinutes: String(shift.gracePeriodMinutes), workLocationId: shift.workLocationId ?? "", breakStartTime: shift.breakStartTime ?? "", breakEndTime: shift.breakEndTime ?? "" });
                              setShiftFormOpen(true);
                            }}
                          >
                            Edit
                          </SecondaryButton>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {shiftFormOpen && isAdmin && (
              <div className="mt-5 rounded-[24px] border border-[#d6def0] bg-white p-5">
                <p className="mb-4 text-sm font-semibold text-[#111827]">{editingShift ? "Edit shift" : "Tambah shift baru"}</p>
                <form className="grid gap-4" onSubmit={handleSaveShift}>
                  <FormInput label="Nama shift" value={shiftForm.name} onChange={(e) => setShiftForm((c) => ({ ...c, name: e.target.value }))} placeholder="Shift Pagi" required />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormInput label="Jam mulai" type="time" value={shiftForm.startTime} onChange={(e) => setShiftForm((c) => ({ ...c, startTime: e.target.value }))} required />
                    <FormInput label="Jam selesai" type="time" value={shiftForm.endTime} onChange={(e) => setShiftForm((c) => ({ ...c, endTime: e.target.value }))} required />
                  </div>
                  <FormInput label="Toleransi terlambat (menit)" type="number" value={shiftForm.gracePeriodMinutes} onChange={(e) => setShiftForm((c) => ({ ...c, gracePeriodMinutes: e.target.value }))} />
                  <div className="grid gap-1">
                    <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#8099c8]">Lokasi kerja</span>
                    <FilterSelect
                      ariaLabel="Lokasi kerja"
                      value={shiftForm.workLocationId}
                      onChange={(value) => setShiftForm((c) => ({ ...c, workLocationId: value }))}
                      options={[
                        { value: "", label: "Pilih lokasi..." },
                        ...workLocations.filter((l) => l.status === "active").map((l) => ({ value: l.id, label: l.name }))
                      ]}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormInput label="Istirahat mulai (opsional)" type="time" value={shiftForm.breakStartTime} onChange={(e) => setShiftForm((c) => ({ ...c, breakStartTime: e.target.value }))} />
                    <FormInput label="Istirahat selesai (opsional)" type="time" value={shiftForm.breakEndTime} onChange={(e) => setShiftForm((c) => ({ ...c, breakEndTime: e.target.value }))} />
                  </div>
                  {shiftFormError ? <ErrorState title="Form shift belum valid" description={shiftFormError} /> : null}
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <PrimaryButton type="submit" disabled={busyAction === "save-shift"}>{busyAction === "save-shift" ? "Menyimpan..." : "Simpan shift"}</PrimaryButton>
                    <SecondaryButton type="button" onClick={() => { setShiftFormOpen(false); setEditingShift(null); }}>Batal</SecondaryButton>
                  </div>
                </form>
              </div>
            )}
          </Panel>
        </section>

        <Panel eyebrow="Validation logic" title="Bagaimana lokasi dan shift dipakai">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Work locations aktif" value={String(workLocations.filter((l) => l.status === "active").length)} detail="Dipakai untuk validasi GPS karyawan" />
            <StatCard label="Shifts aktif" value={String(shifts.filter((s) => s.status === "active").length)} detail="Menentukan jam masuk dan toleransi" />
            <StatCard label="Validation mode" value="Persist then review" detail="Di luar radius membuat exception, bukan langsung tolak" />
          </div>
        </Panel>
      </div>
    );
  }

  function renderReportsWorkspace() {
    const validationTone = (status: string): "success" | "warning" | "danger" | "neutral" => {
      if (status === "verified") return "success";
      if (status === "needs_review") return "warning";
      if (status === "blocked" || status === "rejected") return "danger";
      return "neutral";
    };

    return (
      <div className="grid gap-5">
        <Panel eyebrow="Filter laporan" title="Filter laporan kehadiran">
          <div data-testid="report-filter-strip" className="flex flex-wrap items-end gap-3">
            <div className="min-w-[130px] flex-1">
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-[0.06em] text-[#8099c8]">Dari</span>
              <input
                type="date"
                aria-label="Dari tanggal"
                value={reportFilters.dateFrom}
                onChange={(e) => setReportFilters((c) => ({ ...c, dateFrom: e.target.value }))}
                className="w-full rounded-2xl border border-[#e2e7f0] bg-[#f9fafc] px-3 py-2.5 text-sm text-[#111827] outline-none transition focus:border-[#1769ff] focus:bg-white focus:ring-2 focus:ring-[#1769ff]/10"
              />
            </div>
            <div className="min-w-[130px] flex-1">
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-[0.06em] text-[#8099c8]">Sampai</span>
              <input
                type="date"
                aria-label="Sampai tanggal"
                value={reportFilters.dateTo}
                onChange={(e) => setReportFilters((c) => ({ ...c, dateTo: e.target.value }))}
                className="w-full rounded-2xl border border-[#e2e7f0] bg-[#f9fafc] px-3 py-2.5 text-sm text-[#111827] outline-none transition focus:border-[#1769ff] focus:bg-white focus:ring-2 focus:ring-[#1769ff]/10"
              />
            </div>
            <div className="min-w-[150px] flex-1">
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-[0.06em] text-[#8099c8]">Divisi</span>
              <FilterSelect
                ariaLabel="Divisi / Departemen"
                value={reportFilters.departmentId}
                onChange={(value) => setReportFilters((c) => ({ ...c, departmentId: value }))}
                options={[
                  { value: "", label: "Semua divisi" },
                  ...departmentOptions.map((department) => ({ value: department.id, label: department.name }))
                ]}
              />
            </div>
            <div className="min-w-[150px] flex-1">
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-[0.06em] text-[#8099c8]">Status</span>
              <FilterSelect
                ariaLabel="Status absensi"
                value={reportFilters.status}
                onChange={(value) => setReportFilters((c) => ({ ...c, status: value }))}
                options={reportStatusFilters.map((option) => ({ value: option.value, label: option.label }))}
              />
            </div>
            <div className="flex-shrink-0 self-end">
              <PrimaryButton onClick={handleApplyReportFilters} disabled={busyAction === "report-filter"}>
                {busyAction === "report-filter" ? "Memfilter..." : "Terapkan filter"}
              </PrimaryButton>
            </div>
          </div>
          {reportFilterError ? <div className="mt-4"><ErrorState title="Filter laporan belum valid" description={reportFilterError} /></div> : null}
        </Panel>

        <Panel eyebrow="Laporan kehadiran" title="Rekap kehadiran validasi">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm leading-6 text-[#596172]">
              {reportRows.length} baris data{reportFilters.status || reportFilters.dateFrom || reportFilters.departmentId ? " (filter aktif)" : ""}.
              Laporan mencakup status validasi, lokasi, perangkat, dan selfie proof.
            </p>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <SecondaryButton onClick={() => setShowAuditTrail(!showAuditTrail)}>
                {showAuditTrail ? "Sembunyikan audit" : "Lihat audit trail"}
              </SecondaryButton>
              <PrimaryButton onClick={handleExportCsv} data-testid="export-csv-button" disabled={!reportLoaded || reportRows.length === 0 || busyAction === "report-filter"}>
                <Download className="mr-2 h-4 w-4" />
                {!reportLoaded ? "Menyiapkan data..." : reportRows.length === 0 ? "Export CSV belum tersedia" : "Export CSV"}
              </PrimaryButton>
            </div>
          </div>
          {!reportLoaded ? (
            <LoadingState label="Memuat laporan" />
          ) : reportError ? (
            <ErrorState title="Laporan belum tersedia" description={`${reportError} Periksa filter lalu coba muat ulang laporan.`} />
          ) : reportRows.length === 0 ? (
            <EmptyState title="Tidak ada data laporan" description="Tidak ada attendance record yang cocok dengan filter saat ini. Ubah rentang tanggal atau status untuk melihat hasil lain." />
          ) : (
            <DataTable
              caption="Laporan kehadiran"
              columns={[
                { key: "employee", header: "Karyawan" },
                { key: "date", header: "Tanggal" },
                { key: "shift", header: "Shift" },
                { key: "checkin", header: "Check-in" },
                { key: "checkout", header: "Check-out" },
                { key: "status", header: "Status" },
                { key: "validation", header: "Validasi" },
                { key: "flags", header: "Flags" }
              ]}
              rows={reportRows.map((row) => ({
                id: row.id,
                employee: (
                  <div>
                    <p className="font-semibold text-[#111827]">{row.employeeName}</p>
                    <p className="mt-1 text-xs font-semibold text-[#667085]">{row.workLocationName}</p>
                  </div>
                ),
                date: row.date,
                shift: row.shiftName,
                checkin: row.checkInTime ? row.checkInTime.slice(11, 16) : "--:--",
                checkout: row.checkOutTime ? row.checkOutTime.slice(11, 16) : "--:--",
                status: (
                  <StatusBadge tone={row.status === "Belum check-in" ? "neutral" : row.status === "Terlambat" ? "warning" : row.status === "Izin" ? "info" : "success"}>
                    {row.status}
                  </StatusBadge>
                ),
                validation: (
                  <StatusBadge tone={validationTone(row.validationStatus)}>
                    {row.validationStatus === "verified" ? "Terverifikasi" : row.validationStatus === "needs_review" ? "Perlu review" : row.validationStatus}
                  </StatusBadge>
                ),
                flags: (
                  <div className="flex flex-wrap gap-1">
                    {row.isLate && <span className="rounded-full bg-[#fff8ed] px-2 py-1 text-xs font-bold text-[#8a5c00]">Terlambat</span>}
                    {row.hasException && <span className="rounded-full bg-[#fff5f5] px-2 py-1 text-xs font-bold text-[#8a2f2f]">Pengecualian</span>}
                    {row.selfieProof && <span className="rounded-full bg-[#f1f5ff] px-2 py-1 text-xs font-bold text-[#1769ff]">Selfie</span>}
                    {row.deviceValidated && <span className="rounded-full bg-[#f1f5ff] px-2 py-1 text-xs font-bold text-[#1769ff]">Perangkat</span>}
                  </div>
                )
              }))}
            />
          )}
        </Panel>

        {showAuditTrail && (
          <Panel eyebrow="Jejak audit" title="Jejak keputusan operasional">
            {auditLogs.length === 0 ? (
              <EmptyState title="Belum ada audit log" description="Setujui/tolak pengecualian, approval request, dan percobaan scan tidak valid akan tampil di sini." />
            ) : (
              <DataTable
                caption="Audit logs"
                columns={[
                  { key: "action", header: "Aksi" },
                  { key: "actor", header: "Pelaku" },
                  { key: "detail", header: "Detail" },
                  { key: "time", header: "Waktu" }
                ]}
                rows={auditLogs.map((item) => ({
                  id: item.id,
                  action: item.action,
                  actor: `${item.actorName} · ${item.actorRole}`,
                  detail: item.detail,
                  time: new Date(item.createdAt).toLocaleString("id-ID")
                }))}
              />
            )}
          </Panel>
        )}
      </div>
    );
  }

  function renderPlaceholder(title: string, description: string) {
    return (
      <Panel eyebrow="In progress" title={title}>
        <EmptyState title={title} description={description} />
      </Panel>
    );
  }

  function renderTabContent() {
    if (pageError) {
      return <ErrorState title="Workspace gagal dimuat" description={pageError} />;
    }

    if (!dashboardLoaded) {
      return <LoadingState label="Memuat workspace" />;
    }

    if (tab === "home") {
      if (isEmployee) {
        return renderEmployeeHome();
      }
      if (isAdmin) {
        return renderAdminDashboard();
      }
      if (isManager) {
        return renderManagerHome();
      }
    }

    if (tab === "attendance") {
      return renderAttendanceWorkspace();
    }

    if (tab === "history" && isEmployee) {
      return renderEmployeeHistoryWorkspace();
    }

    if (tab === "requests") {
      return renderRequestsWorkspace();
    }

    if (tab === "notifications") {
      return renderNotificationsWorkspace();
    }

    if (tab === "schedule" && isEmployee) {
      return renderEmployeeScheduleWorkspace();
    }

    if (tab === "payslip" && isEmployee) {
      return renderEmployeePayslipWorkspace();
    }

    if (tab === "profile") {
      return renderProfileWorkspace();
    }

    if (tab === "scanner") {
      return renderScannerWorkspace();
    }

    if (tab === "team") {
      return renderTeamWorkspace();
    }

    if (tab === "structure" && isAdmin) {
      return renderStructureWorkspace();
    }

    if (tab === "exceptions" && isManager) {
      return renderManagerExceptionsPage();
    }

    if (tab === "locations") {
      return renderLocationsWorkspace();
    }

    if (tab === "reports") {
      return renderReportsWorkspace();
    }

    return renderPlaceholder("Workspace", "Halaman ini belum memiliki modul khusus untuk role aktif.");
  }

  return (
    <AppShell
      user={{
        fullName: currentSession.user.fullName,
        organizationName: currentSession.user.organizationName,
        roleLabel: roleLabels[currentSession.user.role]
      }}
      navigation={appNavigation}
      activeKey={tab}
      onNavigate={(item) => {
        setTab(item.key as AppTabKey);
        navigate(item.path);
      }}
      actions={
        <SecondaryButton
          onClick={() => {
            clearSession();
            location.assign("/login");
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Keluar
        </SecondaryButton>
      }
    >
      <PageHeader
        eyebrow={`${roleLabels[currentSession.user.role]} workspace`}
        title={greeting || `Halo, ${currentSession.user.fullName}`}
        description={`${currentSession.user.organizationName} · Attendance desk dengan guard waktu, lokasi, dan integritas perangkat.`}
      />

      {feedback ? (
        <div
          role={feedback.tone === "err" ? "alert" : "status"}
          aria-live="polite"
          className={`rounded-[22px] border px-4 py-3 text-sm shadow-[0_12px_32px_rgba(20,24,31,0.06)] ${
            feedback.tone === "err"
              ? "border-[#f2caca] bg-[#fff5f5] text-[#8a2f2f]"
              : "border-[#d7e5ff] bg-white text-[#174ea6]"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      {renderTabContent()}

      {renderDepartmentActionMenu()}

      <Dialog title={requestDetail?.title ?? "Detail pengajuan"} open={Boolean(requestDetail)} onClose={() => setRequestDetail(null)}>
        {requestDetail ? (
          <div className="space-y-4">
            <StatusBadge tone={requestDetail.status === "Menunggu" ? "warning" : requestDetail.status === "Ditolak" ? "danger" : "success"}>{requestDetail.status}</StatusBadge>
            {requestDetail.category ? <p className="text-xs font-black uppercase tracking-[0.14em] text-[#1769ff]">{requestDetail.category}</p> : null}
            <p className="text-sm leading-7 text-[#596172]">{requestDetail.detail}</p>
            {requestDetail.startDate ? (
              <p className="text-sm font-semibold text-[#111827]">
                {requestDetail.startDate} {requestDetail.endDate ? `- ${requestDetail.endDate}` : ""}
              </p>
            ) : null}
            {requestDetail.adminNote ? <p className="text-sm font-semibold text-[#667085]">Catatan reviewer: {requestDetail.adminNote}</p> : null}
          </div>
        ) : null}
      </Dialog>

      <Dialog
        title={editingDivisi ? "Edit divisi" : "Tambah divisi baru"}
        open={divisiFormOpen}
        closeDisabled={busyAction === (editingDivisi ? `edit-divisi-${editingDivisi.id}` : "create-divisi")}
        closeDisabledReason="Tunggu sampai penyimpanan selesai."
        onClose={() => {
          setDivisiFormOpen(false);
          setEditingDivisi(null);
          setDivisiForm({ name: "", managerId: "" });
          setDivisiFormError(null);
        }}
      >
        <form onSubmit={handleSubmitDivisiForm} className="space-y-4">
          <FormInput
            label="Nama divisi"
            value={divisiForm.name}
            onChange={(e) => setDivisiForm((c) => ({ ...c, name: e.target.value }))}
            placeholder="Contoh: Operations, F&B Service, Front Office"
            error={divisiFormError ?? undefined}
          />
          <div className="grid gap-1">
            <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#8099c8]">Manager divisi</span>
            <FilterSelect
              ariaLabel="Manager divisi"
              value={divisiForm.managerId}
              onChange={(value) => setDivisiForm((c) => ({ ...c, managerId: value }))}
              options={[
                { value: "", label: "Belum ditetapkan" },
                ...managerOptions
              ]}
            />
            {managerOptions.length === 0 ? (
              <div className="rounded-2xl border border-[#edf0f5] bg-[#f9fafc] px-3 py-2 text-xs leading-5 text-[#596172]">
                <p className="font-semibold text-[#111827]">Belum ada manager tersedia</p>
                <p>Tambahkan akun manager terlebih dahulu.</p>
              </div>
            ) : null}
          </div>
          {divisiFormError ? <p className="text-xs text-[#c0392b]">{divisiFormError}</p> : null}
          {busyAction === (editingDivisi ? `edit-divisi-${editingDivisi.id}` : "create-divisi") ? (
            <p className="rounded-2xl border border-[#d7e5ff] bg-[#f7faff] px-3 py-2 text-xs font-semibold text-[#174ea6]" role="status" aria-live="polite">
              Divisi sedang disimpan. Dialog akan tertutup setelah data berhasil diperbarui.
            </p>
          ) : null}
          <div className="flex gap-2 pt-1">
            <PrimaryButton type="submit" disabled={busyAction === (editingDivisi ? `edit-divisi-${editingDivisi.id}` : "create-divisi") || Boolean(departmentsError)}>
              {busyAction === (editingDivisi ? `edit-divisi-${editingDivisi.id}` : "create-divisi") ? "Menyimpan divisi..." : "Simpan divisi"}
            </PrimaryButton>
            <SecondaryButton
              type="button"
              disabled={busyAction === (editingDivisi ? `edit-divisi-${editingDivisi.id}` : "create-divisi")}
              title={busyAction === (editingDivisi ? `edit-divisi-${editingDivisi.id}` : "create-divisi") ? "Tunggu sampai penyimpanan selesai." : undefined}
              onClick={() => {
                setDivisiFormOpen(false);
                setEditingDivisi(null);
                setDivisiForm({ name: "", managerId: "" });
                setDivisiFormError(null);
              }}
            >
              Batal
            </SecondaryButton>
          </div>
        </form>
      </Dialog>

      <Dialog
        title={ubahPenempatanEmployee ? `Ubah penempatan — ${ubahPenempatanEmployee.fullName}` : "Ubah penempatan"}
        open={Boolean(ubahPenempatanEmployee)}
        closeDisabled={Boolean(busyAction?.startsWith("ubah-penempatan-"))}
        closeDisabledReason="Tunggu sampai penyimpanan selesai."
        onClose={() => {
          setUbahPenempatanEmployee(null);
          setUbahPenempatanDeptId("");
          setUbahPenempatanError(null);
        }}
      >
        <form onSubmit={handleUbahPenempatan} className="space-y-4">
          <div className="grid gap-1">
            <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#8099c8]">Divisi baru</span>
            <FilterSelect
              ariaLabel="Divisi baru"
              value={ubahPenempatanDeptId}
              onChange={setUbahPenempatanDeptId}
              options={[
                { value: "", label: "Tanpa divisi" },
                ...departmentOptions.map((dept) => ({ value: dept.id, label: dept.name }))
              ]}
            />
            {departmentsError ? (
              <p className="text-xs font-semibold text-[#c0392b]">Backend divisi belum tersedia: {departmentsError}</p>
            ) : null}
          </div>
          {ubahPenempatanError ? <p className="text-xs text-[#c0392b]">{ubahPenempatanError}</p> : null}
          {busyAction?.startsWith("ubah-penempatan-") ? (
            <p className="rounded-2xl border border-[#d7e5ff] bg-[#f7faff] px-3 py-2 text-xs font-semibold text-[#174ea6]" role="status" aria-live="polite">
              Penempatan sedang diperbarui. Dialog akan tertutup setelah data berhasil disimpan.
            </p>
          ) : null}
          <div className="flex gap-2 pt-1">
            <PrimaryButton type="submit" disabled={Boolean(busyAction?.startsWith("ubah-penempatan-")) || Boolean(departmentsError)}>
              {busyAction?.startsWith("ubah-penempatan-") ? "Menyimpan penempatan..." : "Simpan penempatan"}
            </PrimaryButton>
            <SecondaryButton
              type="button"
              disabled={Boolean(busyAction?.startsWith("ubah-penempatan-"))}
              title={busyAction?.startsWith("ubah-penempatan-") ? "Tunggu sampai penyimpanan selesai." : undefined}
              onClick={() => {
                setUbahPenempatanEmployee(null);
                setUbahPenempatanDeptId("");
                setUbahPenempatanError(null);
              }}
            >
              Batal
            </SecondaryButton>
          </div>
        </form>
      </Dialog>
    </AppShell>
  );
}
