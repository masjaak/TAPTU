import { describe, expect, it } from "vitest";

import {
  formatAttendanceGroupLabel,
  getRequestCategoryMeta,
  groupAttendanceHistory,
  nextScannerCountdown,
  REQUEST_CATEGORY_META,
  validateRequestForm
} from "../lib/mobileWorkflow";

describe("mobile workflow helpers", () => {
  it("groups attendance items by day label", () => {
    const groups = groupAttendanceHistory([
      { day: "Hari ini", status: "Tepat waktu", time: "08:03", method: "QR" },
      { day: "Hari ini", status: "Tepat waktu", time: "17:05", method: "GPS" },
      { day: "Kemarin", status: "Izin", time: "08:00", method: "Manual" }
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0].items).toHaveLength(2);
    expect(groups[1].day).toBe("Kemarin");
  });

  it("rejects invalid request date range", () => {
    const error = validateRequestForm({
      category: "Izin",
      startDate: "2026-05-10",
      endDate: "2026-05-09",
      title: "Izin",
      detail: "Perlu izin besok."
    });

    expect(error).toBe("Tanggal selesai tidak boleh lebih awal dari tanggal mulai.");
  });

  it("formats attendance group label", () => {
    expect(formatAttendanceGroupLabel("Hari ini", 2)).toBe("Hari ini · 2 catatan");
  });

  it("loops scanner countdown back to 30", () => {
    expect(nextScannerCountdown(1)).toBe(30);
    expect(nextScannerCountdown(30)).toBe(29);
  });

  it("requires stronger detail for sick leave", () => {
    const error = validateRequestForm({
      category: "Cuti Sakit",
      startDate: "2026-05-10",
      endDate: "2026-05-10",
      title: "Sakit",
      detail: "Demam"
    });

    expect(error).toBe("Pengajuan sakit butuh detail yang lebih jelas.");
  });
});

describe("request category meta", () => {
  it("contains all required categories", () => {
    const ids = REQUEST_CATEGORY_META.map((c) => c.id);
    expect(ids).toContain("izin");
    expect(ids).toContain("cuti_tahunan");
    expect(ids).toContain("cuti_sakit");
    expect(ids).toContain("koreksi_absensi");
    expect(ids).toContain("lupa_checkin_out");
    expect(ids).toContain("cuti_menikah");
    expect(ids).toContain("cuti_melahirkan");
    expect(ids).toContain("cuti_haid");
  });

  it("marks female-specific categories correctly", () => {
    const femaleOnly = REQUEST_CATEGORY_META.filter((c) => c.genderRestriction === "female");
    const femaleIds = femaleOnly.map((c) => c.id);
    expect(femaleIds).toContain("cuti_melahirkan");
    expect(femaleIds).toContain("cuti_keguguran");
    expect(femaleIds).toContain("cuti_haid");
  });

  it("each category has id, label, group, and boolean flags", () => {
    for (const cat of REQUEST_CATEGORY_META) {
      expect(typeof cat.id).toBe("string");
      expect(typeof cat.label).toBe("string");
      expect(typeof cat.group).toBe("string");
      expect(typeof cat.requiresDocument).toBe("boolean");
      expect(typeof cat.requiresDateRange).toBe("boolean");
      expect(typeof cat.requiresReason).toBe("boolean");
    }
  });

  it("getRequestCategoryMeta finds by label", () => {
    const meta = getRequestCategoryMeta("Cuti Menikah");
    expect(meta).toBeDefined();
    expect(meta?.defaultDays).toBe(3);
    expect(meta?.requiresDocument).toBe(true);
  });

  it("getRequestCategoryMeta returns undefined for unknown label", () => {
    expect(getRequestCategoryMeta("Tidak Ada")).toBeUndefined();
  });
});

describe("validateRequestForm with new categories", () => {
  it("accepts valid Cuti Tahunan", () => {
    const error = validateRequestForm({
      category: "Cuti Tahunan",
      startDate: "2026-05-12",
      endDate: "2026-05-14",
      title: "Cuti tahunan",
      detail: "Keperluan keluarga."
    });
    expect(error).toBeNull();
  });

  it("rejects Koreksi Absensi without correctionDate", () => {
    const error = validateRequestForm({
      category: "Koreksi Absensi",
      startDate: "2026-05-10",
      endDate: "2026-05-10",
      title: "Koreksi absensi",
      detail: "Lupa absen masuk.",
      correctionType: "Check-in"
    });
    expect(error).toBe("Tanggal absensi yang dikoreksi wajib diisi.");
  });

  it("rejects Koreksi Absensi without correctionType", () => {
    const error = validateRequestForm({
      category: "Koreksi Absensi",
      startDate: "2026-05-10",
      endDate: "2026-05-10",
      title: "Koreksi absensi",
      detail: "Lupa absen masuk.",
      correctionDate: "2026-05-10"
    });
    expect(error).toBe("Jenis koreksi wajib dipilih.");
  });

  it("accepts valid Koreksi Absensi", () => {
    const error = validateRequestForm({
      category: "Koreksi Absensi",
      startDate: "2026-05-10",
      endDate: "2026-05-10",
      title: "Koreksi absensi",
      detail: "Lupa absen masuk.",
      correctionDate: "2026-05-10",
      correctionType: "Check-in",
      correctionTime: "08:00"
    });
    expect(error).toBeNull();
  });

  it("rejects Lupa Check-in/out without forgetType", () => {
    const error = validateRequestForm({
      category: "Lupa Check-in/out",
      startDate: "2026-05-10",
      endDate: "2026-05-10",
      title: "Lupa absen",
      detail: "Lupa check-in pagi."
    });
    expect(error).toBe("Jenis lupa wajib dipilih.");
  });

  it("accepts valid Lupa Check-in/out", () => {
    const error = validateRequestForm({
      category: "Lupa Check-in/out",
      startDate: "2026-05-10",
      endDate: "2026-05-10",
      title: "Lupa absen",
      detail: "Lupa check-in pagi.",
      forgetType: "Check-in",
      estimatedTime: "08:00"
    });
    expect(error).toBeNull();
  });
});
