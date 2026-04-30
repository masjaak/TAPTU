import type { AttendanceTimelineItem } from "@taptu/shared";

export interface RequestFormState {
  category: "Izin" | "Cuti" | "Sakit";
  startDate: string;
  endDate: string;
  title: string;
  detail: string;
}

export function groupAttendanceHistory(items: AttendanceTimelineItem[]) {
  return items.reduce<Array<{ day: string; items: AttendanceTimelineItem[] }>>((groups, item) => {
    const last = groups.at(-1);

    if (last && last.day === item.day) {
      last.items.push(item);
      return groups;
    }

    groups.push({
      day: item.day,
      items: [item]
    });

    return groups;
  }, []);
}

export function formatAttendanceGroupLabel(day: string, count: number) {
  return `${day} · ${count} catatan`;
}

export function nextScannerCountdown(secondsLeft: number) {
  if (secondsLeft <= 1) {
    return 30;
  }

  return secondsLeft - 1;
}

export function validateRequestForm(form: RequestFormState) {
  if (!form.startDate || !form.endDate) {
    return "Tanggal pengajuan harus lengkap.";
  }

  if (!form.title.trim() || !form.detail.trim()) {
    return "Judul dan detail pengajuan wajib diisi.";
  }

  if (!form.startDate || !form.endDate) {
    return "Tanggal pengajuan harus lengkap.";
  }

  if (form.endDate < form.startDate) {
    return "Tanggal selesai tidak boleh lebih awal dari tanggal mulai.";
  }

  if (form.title.trim().length < 3) {
    return "Judul pengajuan terlalu pendek.";
  }

  if (form.category === "Sakit" && form.detail.trim().length < 12) {
    return "Pengajuan sakit butuh detail yang lebih jelas.";
  }

  if (form.detail.trim().length < 8) {
    return "Detail pengajuan masih terlalu singkat.";
  }

  return null;
}
