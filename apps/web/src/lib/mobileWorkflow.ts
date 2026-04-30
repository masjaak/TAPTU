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

export function validateRequestForm(form: RequestFormState) {
  if (!form.startDate || !form.endDate) {
    return "Tanggal pengajuan harus lengkap.";
  }

  if (form.endDate < form.startDate) {
    return "Tanggal selesai tidak boleh lebih awal dari tanggal mulai.";
  }

  if (form.title.trim().length < 3) {
    return "Judul pengajuan terlalu pendek.";
  }

  if (form.detail.trim().length < 8) {
    return "Detail pengajuan masih terlalu singkat.";
  }

  return null;
}
