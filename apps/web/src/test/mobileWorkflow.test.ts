import { describe, expect, it } from "vitest";

import { formatAttendanceGroupLabel, groupAttendanceHistory, nextScannerCountdown, validateRequestForm } from "../lib/mobileWorkflow";

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
      category: "Sakit",
      startDate: "2026-05-10",
      endDate: "2026-05-10",
      title: "Sakit",
      detail: "Demam"
    });

    expect(error).toBe("Pengajuan sakit butuh detail yang lebih jelas.");
  });
});
