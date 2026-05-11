import type { ApprovalRequestType, AttendanceTimelineItem } from "@taptu/shared";

export interface RequestCategoryMeta {
  id: string;
  label: ApprovalRequestType;
  group: "Utama" | "Cuti Khusus" | "Karyawati" | "Opsional";
  defaultDays?: number;
  defaultDaysNote?: string;
  requiresDocument: boolean;
  requiresDateRange: boolean;
  requiresReason: boolean;
  genderRestriction?: "female";
  note?: string;
}

export const REQUEST_CATEGORY_META: RequestCategoryMeta[] = [
  {
    id: "izin",
    label: "Izin",
    group: "Utama",
    requiresDocument: false,
    requiresDateRange: true,
    requiresReason: true,
    note: "Durasi mengikuti kebijakan perusahaan dan ketentuan yang berlaku."
  },
  {
    id: "cuti_tahunan",
    label: "Cuti Tahunan",
    group: "Utama",
    requiresDocument: false,
    requiresDateRange: true,
    requiresReason: true,
    note: "Durasi mengikuti kebijakan perusahaan dan ketentuan yang berlaku."
  },
  {
    id: "cuti_sakit",
    label: "Cuti Sakit",
    group: "Utama",
    requiresDocument: true,
    requiresDateRange: true,
    requiresReason: true,
    note: "Durasi berdasarkan surat keterangan dokter dan kebijakan perusahaan."
  },
  {
    id: "koreksi_absensi",
    label: "Koreksi Absensi",
    group: "Utama",
    requiresDocument: false,
    requiresDateRange: false,
    requiresReason: true,
    note: "Isi tanggal, jenis koreksi, dan jam yang diajukan."
  },
  {
    id: "lupa_checkin_out",
    label: "Lupa Check-in/out",
    group: "Utama",
    requiresDocument: false,
    requiresDateRange: false,
    requiresReason: true,
    note: "Isi jenis lupa dan perkiraan jam agar reviewer dapat memverifikasi."
  },
  {
    id: "cuti_menikah",
    label: "Cuti Menikah",
    group: "Cuti Khusus",
    defaultDays: 3,
    requiresDocument: true,
    requiresDateRange: true,
    requiresReason: false,
    note: "Umumnya 3 hari. Lampiran dapat diminta sesuai kebijakan perusahaan."
  },
  {
    id: "cuti_menikahkan_anak",
    label: "Cuti Menikahkan Anak",
    group: "Cuti Khusus",
    defaultDays: 2,
    requiresDocument: true,
    requiresDateRange: true,
    requiresReason: false,
    note: "Umumnya 2 hari. Durasi mengikuti kebijakan perusahaan dan ketentuan yang berlaku."
  },
  {
    id: "cuti_khitan_anak",
    label: "Cuti Khitan Anak",
    group: "Cuti Khusus",
    defaultDays: 2,
    requiresDocument: false,
    requiresDateRange: true,
    requiresReason: false,
    note: "Umumnya 2 hari. Durasi mengikuti kebijakan perusahaan dan ketentuan yang berlaku."
  },
  {
    id: "cuti_baptis_anak",
    label: "Cuti Baptis Anak",
    group: "Cuti Khusus",
    defaultDays: 2,
    requiresDocument: true,
    requiresDateRange: true,
    requiresReason: false,
    note: "Umumnya 2 hari. Lampiran dapat diminta sesuai kebijakan perusahaan."
  },
  {
    id: "istri_melahirkan",
    label: "Istri Melahirkan / Keguguran",
    group: "Cuti Khusus",
    defaultDays: 2,
    requiresDocument: true,
    requiresDateRange: true,
    requiresReason: false,
    note: "Umumnya 2 hari. Durasi mengikuti kebijakan perusahaan dan ketentuan yang berlaku."
  },
  {
    id: "keluarga_inti_meninggal",
    label: "Keluarga Inti Meninggal",
    group: "Cuti Khusus",
    defaultDays: 2,
    requiresDocument: false,
    requiresDateRange: true,
    requiresReason: false,
    note: "Umumnya 2 hari. Durasi mengikuti kebijakan perusahaan dan ketentuan yang berlaku."
  },
  {
    id: "anggota_serumah_meninggal",
    label: "Anggota Keluarga Serumah Meninggal",
    group: "Cuti Khusus",
    defaultDays: 1,
    requiresDocument: false,
    requiresDateRange: true,
    requiresReason: false,
    note: "Umumnya 1 hari. Durasi mengikuti kebijakan perusahaan dan ketentuan yang berlaku."
  },
  {
    id: "cuti_melahirkan",
    label: "Cuti Melahirkan",
    group: "Karyawati",
    defaultDaysNote: "±3 bulan",
    requiresDocument: true,
    requiresDateRange: true,
    requiresReason: false,
    genderRestriction: "female",
    note: "Durasi mengikuti ketentuan perusahaan dan surat keterangan dokter jika diperlukan."
  },
  {
    id: "cuti_keguguran",
    label: "Cuti Keguguran",
    group: "Karyawati",
    defaultDaysNote: "±45 hari",
    requiresDocument: true,
    requiresDateRange: true,
    requiresReason: false,
    genderRestriction: "female",
    note: "Durasi mengikuti kebijakan perusahaan dan ketentuan yang berlaku."
  },
  {
    id: "cuti_haid",
    label: "Cuti Haid / Menstruasi",
    group: "Karyawati",
    defaultDays: 2,
    requiresDocument: false,
    requiresDateRange: true,
    requiresReason: false,
    genderRestriction: "female",
    note: "Hingga 2 hari. Durasi mengikuti kebijakan perusahaan dan ketentuan yang berlaku."
  },
  {
    id: "cuti_tidak_dibayar",
    label: "Cuti Tidak Dibayar",
    group: "Opsional",
    requiresDocument: false,
    requiresDateRange: true,
    requiresReason: true,
    note: "Durasi mengikuti kebijakan perusahaan dan ketentuan yang berlaku."
  },
  {
    id: "cuti_khusus_perusahaan",
    label: "Cuti Khusus Perusahaan",
    group: "Opsional",
    requiresDocument: false,
    requiresDateRange: true,
    requiresReason: true,
    note: "Durasi mengikuti kebijakan perusahaan dan ketentuan yang berlaku."
  },
  {
    id: "dinas_tugas_luar",
    label: "Dinas / Tugas Luar",
    group: "Opsional",
    requiresDocument: false,
    requiresDateRange: true,
    requiresReason: true,
    note: "Durasi mengikuti kebijakan perusahaan dan ketentuan yang berlaku."
  }
];

export function getRequestCategoryMeta(label: string): RequestCategoryMeta | undefined {
  return REQUEST_CATEGORY_META.find((c) => c.label === label);
}

export interface RequestFormState {
  category: ApprovalRequestType;
  startDate: string;
  endDate: string;
  title: string;
  detail: string;
  correctionDate?: string;
  correctionType?: "Check-in" | "Check-out" | "Keduanya";
  correctionTime?: string;
  forgetType?: "Check-in" | "Check-out";
  estimatedTime?: string;
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

export function validateRequestForm(form: RequestFormState): string | null {
  if (!form.startDate || !form.endDate) {
    return "Tanggal pengajuan harus lengkap.";
  }

  if (form.endDate < form.startDate) {
    return "Tanggal selesai tidak boleh lebih awal dari tanggal mulai.";
  }

  if (!form.title.trim() || form.title.trim().length < 3) {
    return "Judul pengajuan wajib diisi dan minimal 3 karakter.";
  }

  if (form.category === "Koreksi Absensi") {
    if (!form.correctionDate) {
      return "Tanggal absensi yang dikoreksi wajib diisi.";
    }
    if (!form.correctionType) {
      return "Jenis koreksi wajib dipilih.";
    }
  }

  if (form.category === "Lupa Check-in/out") {
    if (!form.forgetType) {
      return "Jenis lupa wajib dipilih.";
    }
  }

  if (form.category === "Cuti Sakit" && form.detail.trim().length < 12) {
    return "Pengajuan sakit butuh detail yang lebih jelas.";
  }

  if (!form.detail.trim() || form.detail.trim().length < 8) {
    return "Detail pengajuan masih terlalu singkat.";
  }

  return null;
}
