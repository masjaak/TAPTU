# TAPTU Handoff

## Repo dan Lokasi

- Local path: `/Users/masjak/Documents/TAPTU`
- Remote target: `https://github.com/masjaak/TAPTU.git`
- Branch lokal aktif: `main`

## Acuan yang dipakai

- Dokumen produk dan sistem di folder TAPTU, terutama:
  - `hadiri_system_design.md`
  - PDF dan DOCX fase 1 dan fase 2 sebagai referensi tambahan
- UI direction:
  - `https://www.ui-skills.com/skills/`
  - skill lokal `premium-web-outreach-ultimate`
- Review gate:
  - `/Users/masjak/Downloads/KUMPULAN SKILLS/agent_rule.txt`

## Status saat ini

Taptu sudah punya baseline full-stack lokal:

- `apps/web`
  - landing page responsif dengan visual direction ChronoTask-inspired
  - Motion animation pada hero, floating cards, CTA, section reveal, dan validation progress bars
  - login page
  - mobile-first app shell
  - tab `Beranda`, `Absensi`, `Izin`, `Scanner`, `Profil`
  - PWA manifest
  - app icon, favicon, splash SVG
- `apps/api`
  - login demo
  - dashboard demo
  - endpoint check-in
  - endpoint check-out
  - endpoint request create
  - endpoint admin approve/reject
  - endpoint scanner token refresh
  - endpoint attendance history
  - local file-backed demo persistence
- `packages/shared`
  - shared types frontend/backend

## Akun demo

- Admin: `admin@taptu.app / Taptu123!`
- Employee: `employee@taptu.app / Taptu123!`
- Scanner: `scanner@taptu.app / Taptu123!`

## Commit lokal penting

- `132ce96` `Refine TAPTU visual system and review gates`
- `82b6e6f` `Build core attendance and request flows`
- `b58f614` `Add local persistence and scanner workflow`

## Review gate yang harus dipertahankan

Sebelum menutup batch baru:

1. `npm run test --workspace @taptu/api`
2. `npm run test --workspace @taptu/web`
3. `npm run typecheck`
4. `npm run build`
5. scan cepat untuk larangan visual/copy:
   - tidak pakai nama lama `Hadiri` di surface web/API aktif
   - tidak pakai em dash
   - motion harus menghormati `MotionConfig reducedMotion="user"`

## Kondisi build terakhir

Terakhir diverifikasi hijau:

- API tests pass `44/44`
- Web tests pass `14/14`
- `npm run typecheck --workspace @taptu/web` pass
- `npm run build:web` pass

## Struktur state penting

### Attendance

- State:
  - `idle`
  - `checked_in`
  - `checked_out`
- Guard:
  - tidak bisa checkout sebelum checkin
  - tidak bisa checkin ulang saat sudah checked_in / checked_out

### Request

- State:
  - `Menunggu`
  - `Disetujui`
  - `Ditolak`
- Guard:
  - hanya `admin` atau `superadmin` yang bisa approve/reject
  - approval hanya berlaku untuk request `Menunggu`

### Scanner

- Token refresh menghasilkan token baru
- TTL direset ke `30` detik

## File penting

- Frontend shell:
  - `apps/web/src/pages/AppPage.tsx`
- Frontend API client:
  - `apps/web/src/lib/api.ts`
- App shell tabs/state:
  - `apps/web/src/lib/appShellState.ts`
- Backend routes:
  - `apps/api/src/index.ts`
- Backend state machine:
  - `apps/api/src/domain.ts`
- Backend persistence:
  - `apps/api/src/store.ts`
- Tests:
  - `apps/api/src/domain.test.ts`
  - `apps/api/src/store.test.ts`
  - `apps/web/src/test/appShellState.test.ts`
  - `apps/web/src/test/landingPage.test.tsx`

## Local persistence

Demo store disimpan di:

- `apps/api/data/demo-store.json`

Catatan:

- File ini akan dibuat otomatis saat API jalan dan store belum ada.
- Demo data sekarang tidak hilang saat restart server.

## Blocker yang belum selesai

### Push ke GitHub

Push ke `masjaak/TAPTU` masih gagal dari environment ini karena credential aktif tidak punya izin push ke repo target.

Error terakhir:

- `Permission to masjaak/TAPTU.git denied to rejakpalepi-dotcom`
- HTTP `403`

### iOS / Simulator

Wrapper iOS belum lanjut karena `CocoaPods` belum tersedia.

Status penting:

- simulator iPhone 15 Pro Max iOS 17.5 sempat berhasil terdeteksi
- tapi project iOS native belum digenerate karena `npx cap add ios` masih tertahan dependency environment

## Next pass yang paling masuk akal

1. ~~Jadikan tab `Scanner` benar-benar fullscreen operational screen~~ selesai
2. ~~Tambahkan filter attendance history~~ selesai
3. ~~Tambahkan request detail dan cancel untuk request pending milik employee~~ selesai
4. ~~Admin overview + employee summary dari real store data~~ selesai
5. Admin karyawan list - tabel karyawan yang hadir/belum hadir hari ini (dari `/api/admin/overview`)
6. Attendance reset harian - reset state `attendance` store ke `idle` setiap hari baru
7. Notifikasi in-app - badge di tab Izin saat ada request pending untuk admin
8. Mulai storage DB layer produksi (SQLite atau Postgres adapter)

## Update batch terbaru (2026-04-30)

Batch ini menambahkan:

- shared types: `AdminOverview` + `EmployeeSummary`
- domain: `computeAdminOverview` + `computeEmployeeSummary` (8 test baru, TDD Red-Green)
- api: `GET /api/admin/overview` - real stats dari store (checkedInToday, onTimeToday, lateToday, pendingRequests)
- api: `GET /api/employee/summary` - ringkasan kehadiran per user dari store
- web: admin home tab sekarang menampilkan 4 stat live + progress bar check-in rate + breakdown on-time/terlambat/belum hadir
- web: profile tab employee sekarang menampilkan total hadir, tepat waktu, terlambat, izin pending, status hari ini — semua dari store
- web: feedback toast sekarang punya dua tone: ok (hijau) dan err (merah)
- visual: tidak ada gradient, tidak ada em-dash

Commit: `2def225`

## Update terbaru setelah handoff awal

Batch terbaru sudah menambahkan:

- filter attendance history:
  - `all`
  - `present`
  - `issue`
- request detail panel di tab `Izin`
- cancel request untuk request `Menunggu`
- scanner screen yang lebih fullscreen-like dan lebih cocok untuk perangkat operasional
- request form yang lebih dekat ke kebutuhan nyata:
  - tipe `Izin / Cuti / Sakit`
  - tanggal mulai
  - tanggal selesai
- helper mobile workflow yang sudah punya test:
  - grouping attendance history
  - validasi request form
- scanner countdown helper
- config-aware storage adapter stub:
  - `local-demo`
  - `production-adapter`

## Update landing page dan Motion (2026-05-01)

Batch terbaru mengubah landing page menjadi visual direction yang terinspirasi dari Dribbble ChronoTask, tanpa copy/pixel clone:

- hero berada di canvas putih besar dengan outer background abu-abu
- headline centered: `Kelola absensi tim dalam satu alur kerja`
- floating cards:
  - catatan shift
  - reminder approval izin
  - validasi hari ini
  - integrasi operasional
- CTA utama biru: `Coba demo Taptu`
- section lanjutan:
  - `Attendance desk yang siap dipakai`
  - `Dari scan sampai laporan`
  - `Dibuat untuk tiga mode kerja`
  - `Sinyal yang membuat admin percaya`
  - FAQ

Motion implementation:

- import dari `motion/react`
- wrapper `MotionConfig reducedMotion="user"`
- `fadeUp` + `stagger` variants untuk hero dan section reveal
- floating hero cards memakai loop motion ringan
- `Catatan shift` memakai sticky-note motion:
  - enter dari `opacity: 0`, `y: 30`, `rotate: -11`
  - loop sway pada `y` dan `rotate`
  - hover lift + rotate correction
- `Reminder` bell memakai bell-ring motion:
  - rotate keyframes `[0, -13, 11, -8, 5, 0]`
  - scale keyframes untuk efek notif
  - `repeatDelay` supaya tidak terasa terlalu ramai
- `Integrasi operasional` memakai staggered icon motion:
  - parent card float ringan
  - tiga icon bounce + rotate dengan delay per index
  - hover icon lift
- validation bars sekarang data-driven dan animated:
  - `QR Gate Timur` target `82`
  - `GPS Kantor Pusat` target `64`
- validation progress bars punya accessible label dan `role="progressbar"`
- test regression menandai motion state progress bar:
  - `data-motion-state="visible"`
  - `data-motion-target`
- test regression juga menandai hero motion style:
  - `data-motion-style="sticky-note"`
  - `data-motion-style="bell-ring"`
  - `data-motion-style="staggered-icons"`

Agent rule review:

- TDD dilakukan: test landing motion state dan hero motion style dibuat merah dulu, lalu production code dibuat hijau
- state-machine thinking diterapkan pada UI motion state:
  - initial progress `0%`
  - visible target sesuai nilai validasi
  - reduced-motion dikontrol via `MotionConfig`
- tests deterministic dengan `IntersectionObserver` mock di `apps/web/src/test/setup.ts`

File utama batch ini:

- `apps/web/src/pages/LandingPage.tsx`
- `apps/web/src/test/landingPage.test.tsx`
- `apps/web/src/test/setup.ts`

## Update UI/UX review + landing page polish (2026-05-01)

Batch ini menerapkan review 7 prinsip UI/UX dan memperbaiki layout floating-card landing page.

### Perubahan trust signal section

- Layout lama: dua kolom `[0.8fr_1.2fr]` — heading kecil vs empat stat card (lopsided)
- Layout baru: centered header + full-width 4-col stat grid di bawah (konsisten dengan pola Roles section)
- Tambah paragraf deskripsi di bawah h2 (`data-testid="trust-signals-copy"`)
- Stat cards sekarang punya `border border-[#edf0f5]` + `shadow` — kontras terhadap background `#f9fafc`
- Divider tipis (`h-px w-8`) antara nilai dan label untuk menjembatani ukuran font
- Tracking stat value diperbaiki: `-0.06em` → `-0.03em`
- Setiap card punya `aria-label` untuk screen reader: `"30s — QR token refresh"` dst
- `whileHover={{ y: -4 }}` ditambahkan pada setiap stat card

### Perubahan CTA section

- `PrimaryLink` (blue button) di dalam section `bg-[#1769ff]` = kontras 1:1, button tidak terlihat
- Diganti dengan komponen baru `CTAWhiteLink`: `bg-white text-[#1769ff]`, `data-testid="cta-demo-action"`
- Section CTA kini punya visible action yang kontras terhadap latar biru

### Perubahan Desk section copy

- Copy lama: meta-commentary tentang proses desain ("Desain baru mengikuti pola hero…")
- Copy baru: deskripsi produk yang nyata tentang fungsi attendance desk

### Perubahan floating-card layout gap (Option A)

Masalah: outer background `#d9d9d9` terlalu gelap dan kontras, gap `mt-8` (32px) terlalu besar sehingga section terasa terputus-putus, bukan modul yang stacked.

- Outer background: `#d9d9d9` → `#e9eaec` (lebih terang, kurang obstruktif)
- Outer padding: `py-6` → `py-4` (lebih rapat secara vertikal)
- Semua 6 section gaps: `mt-8` → `mt-4 sm:mt-6` (16px mobile, 24px sm+)
- Outer div kini punya `data-testid="landing-stage"` dan `data-variant="card-tight"`

### Hero text fix (batch ini juga)

- Icon di atas hero: grid 2×2 dot → Taptu logomark (`bg-[#111827]` dengan "T")
- Headline uppercase: `tracking` diperlonggar dari `-0.065em` → `-0.03em`, `leading` dari `1.02` → `1.08`
- Gap ikon ke headline: `mt-9` → `mt-12`
- Gap headline ke paragraf: `mt-6` → `mt-8`
- Roles section SectionLabel: duplikat teks h2 → diganti `"Roles"`

### Agent rule review

- TDD dilakukan: satu test RED per perubahan structural, lalu production code GREEN
- Tests baru yang ditambahkan:
  - `trust signals section has a supporting description paragraph`
  - `trust signals cards are individually labeled for screen readers`
  - `CTA section uses a visually distinct action link`
  - `landing stage uses the tight floating-card layout variant`
- Semua 19 tests hijau pasca implementasi
- Typecheck dan build clean

### Kondisi build setelah batch ini

- Web tests pass `19/19`
- `npm run typecheck --workspace @taptu/web` pass
- `npm run build:web` pass

## Update CTA + footer redesign (2026-05-01)

### CTA section

- Padding: `py-12` → `py-16 lg:py-24` — memberi ruang napas sebagai conversion moment terakhir
- Sub-copy ditambahkan di bawah h2 (`data-testid="cta-sub-copy"`):
  - "Masuk sebagai admin, karyawan, atau scanner. Tidak perlu install, tidak perlu setup."
- `max-w-3xl` dihapus dari h2 — diganti `max-w-2xl` pada parent div agar heading tidak terpotong di lg
- Mobile layout: `flex-col items-start` — button tidak lagi stretch full-width
- Button dibungkus `<div class="shrink-0">` agar tidak menyusut di lg flex-row

### Footer

- Padding: `px-2` → `px-5 md:px-8` — konsisten dengan semua elemen lain
- Separator: `border-t border-[#c8cacd]` dengan `pt-8` sebagai visual grounding antara CTA dan footer
- Struktur tiga kolom:
  - Kiri: Taptu logomark (hitam) + nama + "Attendance OS" tagline
  - Tengah: `nav aria-label="Footer navigation"` dengan link Platform, Workflow, Roles, FAQ
  - Kanan: copyright `© 2026 Taptu. All rights reserved.`
- `pb-10` untuk bottom padding — halaman tidak berakhir terlalu terpotong

### Agent rule review

- TDD: 3 test merah ditulis sebelum kode produksi:
  - `CTA section has supporting sub-copy to reduce hesitation`
  - `footer has nav links matching the primary navigation`
  - `footer shows copyright year`
- 23 tests hijau pasca implementasi
- Typecheck dan build clean

### Kondisi build setelah batch ini

- Web tests pass `23/23`
- `npm run typecheck --workspace @taptu/web` pass
- `npm run build:web` pass

## Update hero text 2-line fix (2026-05-01)

### Masalah

Di lg breakpoint, hero headline "KELOLA ABSENSI TIM" sendiri butuh ~990px untuk render satu baris, sedangkan container `max-w-4xl` hanya 896px. Akibatnya phrase pertama wrap ke 2 baris, lalu "DALAM SATU ALUR KERJA" tambah 1 baris lagi — total 3 baris.

### Fix

- `motion.div` container: `max-w-4xl` → `max-w-5xl` (896px → 1024px)
- `h1` max-w: `max-w-4xl` → `max-w-5xl`
- Font size dikalibrasi:
  - `md:text-7xl` (72px) → `md:text-5xl` (48px) — aman untuk 704px container di md breakpoint
  - `lg:text-[82px]` → `lg:text-[72px]` — "DALAM SATU ALUR KERJA" pada 72px ≈ 831px, muat di 984px container
- Kedua phrase dibuat explicit `block` span dengan `data-line="1"` dan `data-line="2"` — menjamin break selalu terjadi di antara dua phrase, tidak di tengah
- `h1` kini punya `data-lines="2"` sebagai dokumentasi intent

### Agent rule review

- TDD dilakukan: test `data-lines="2"` dan `span[data-line]` length ditulis merah dulu
- 20 tests hijau pasca implementasi
- Typecheck dan build clean

## Catatan deploy Vercel

Error deploy sebelumnya:

- `Cannot find module '@taptu/shared'`

Perbaikan yang sudah diterapkan:

- `packages/shared/package.json` sekarang punya `exports`
- `apps/api` dan `apps/web` build script sekarang build `@taptu/shared` dulu bila dibuild terpisah
- `tsconfig.base.json` sekarang punya path alias untuk `@taptu/shared`
- root sudah punya `vercel.json` untuk deploy frontend web-only:
  - build command: `npm run build --workspace @taptu/web`
  - output directory: `apps/web/dist`

Catatan penting:

- konfigurasi ini memperbaiki build path untuk deploy frontend di Vercel
- backend Express belum otomatis ikut ter-deploy sebagai server runtime Vercel
- untuk login dan flow API di production, frontend tetap butuh `VITE_API_BASE_URL` yang mengarah ke backend yang benar

Review terakhir tetap hijau:

- Web tests pass `15/15`
- `npm run typecheck --workspace @taptu/web` pass
- `npm run build:web` pass

## Menjalankan project

```bash
npm install
npm run dev:api
npm run dev:web
```

- Web: `http://localhost:5173`
- API: `http://localhost:3001`
