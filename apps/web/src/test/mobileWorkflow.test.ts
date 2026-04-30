import { describe, expect, it } from "vitest";

import { groupAttendanceHistory, validateRequestForm } from "../lib/mobileWorkflow";

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
});
