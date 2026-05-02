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
  - post-login app shell dengan desktop sidebar dan mobile drawer
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
   - tidak ada trace theme dashboard lama di active web source:
     - `moss`, `mist`, `sand`, `cloud`, `steel`
     - `shadow-panel`
     - `green`, `emerald`, `teal`, `lime` kecuali semantic state yang memang disengaja
     - hex lama `#2d5246`, `#10211c`, `#12261f`, `#173229`, `#97d7be`, `#11703d`, `#e9f7ef`

## Kondisi build terakhir

Terakhir diverifikasi hijau setelah Phase 1.5:

- `npm run test --workspace @taptu/api` pass: `47/47`
- `npm run test --workspace @taptu/web` pass: `55/55`
- `npm run test --workspace @taptu/web -- designSystem` pass
- `npm run typecheck` pass
- `npm run build` pass
- `npx cap sync ios` pass
- Xcode build iPhone 15 Pro Max iOS 17.5 pass
- Simulator install dan launch `com.taptu.attendance` pass

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
- Post-login design system / app shell:
  - `apps/web/src/components/app.tsx`
  - `apps/web/src/components/StatusPill.tsx`
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
  - `apps/web/src/test/designSystem.test.tsx`
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

Status terbaru: tidak lagi menjadi blocker untuk Phase 1.5.

- `npx cap sync ios` berhasil
- `xcodebuild -workspace ios/App/App.xcworkspace -scheme App -configuration Debug -destination 'platform=iOS Simulator,id=78A68F51-2700-457D-8D2F-A448FB40969D' build` berhasil
- app berhasil di-install ke simulator iPhone 15 Pro Max iOS 17.5
- bundle `com.taptu.attendance` berhasil launch di simulator

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

## Fix: login demo account + auth page text spacing (2026-05-01)

### Root causes ditemukan

1. **API tidak berjalan** — web memanggil `http://localhost:3001/api` secara langsung tanpa proxy. Ketika API offline, `fetch()` melempar `TypeError: Failed to fetch` — user melihat error generik, bukan petunjuk yang membantu.
2. **Tidak ada Vite proxy** — cross-origin request dari port 5173 ke 3001 rawan CORS di beberapa konfigurasi browser/network.
3. **Error message tidak deskriptif** — catch block hanya meneruskan error mentah dari fetch.
4. **Text spacing terlalu rapat** — heading di LoginPage dan RegisterPage memakai `tracking-[-0.045em]` dan `leading-tight`, tidak konsisten dengan ritme landing page.

### Fix 1 — Vite proxy

`apps/web/vite.config.ts` sekarang punya:
```ts
proxy: {
  "/api": {
    target: "http://localhost:3001",
    changeOrigin: true
  }
}
```

Web app memanggil `/api/...` secara relatif → Vite meneruskan ke port 3001 tanpa cross-origin. Tidak ada CORS issue di local dev.

### Fix 2 — API base URL

`apps/web/src/lib/api.ts`:
```ts
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";
```

- Local dev: gunakan `/api` relatif → lewat Vite proxy
- Production: set `VITE_API_BASE_URL` ke URL backend production

### Fix 3 — Descriptive error message

`requestJson` sekarang wrap `fetch()` dalam try/catch:
```ts
try {
  response = await fetch(...);
} catch {
  throw new Error("Tidak dapat terhubung ke server. Jalankan npm run dev:api terlebih dahulu.");
}
```

User sekarang mendapat pesan yang jelas ketika API tidak berjalan, bukan raw "Failed to fetch".

### Fix 4 — Text spacing LoginPage + RegisterPage

| Element | Sebelum | Sesudah |
|---------|---------|---------|
| h1/h2 tracking | `tracking-[-0.045em]` | `tracking-[-0.03em]` |
| h1/h2 leading | `leading-tight` (1.25) | `leading-snug` (1.375) |
| Section label → h1/h2 gap | `mt-4` | `mt-5` |
| h1/h2 → paragraph gap | `mt-4` / `mt-5` | `mt-5` / `mt-6` |
| Dark panel top margin | `mt-14` | `mt-12` |
| Register form top margin | `mt-8` | `mt-10` |
| Register form field spacing | `space-y-5` | `space-y-6` |

### Cara menjalankan

```bash
# Terminal 1
npm run dev:api

# Terminal 2
npm run dev:web
```

Web: `http://localhost:5173` → `/api` di-proxy ke `http://localhost:3001`

### Agent rule review

- TDD: 2 test merah ditulis sebelum kode produksi:
  - `throws a descriptive error when the server is unreachable` → RED sebelum fix, GREEN setelah
  - `throws the API error message when the server responds with an error` → sudah GREEN (existing behavior dipertahankan)
- 36 tests hijau pasca implementasi
- Typecheck web + api clean, build clean

## Update auth revamp + superadmin register (2026-05-01)

### DB recommendation: Supabase

Dipilih Supabase (PostgreSQL) dibanding Firebase (Firestore) karena:
- Data Taptu bersifat relasional: users → attendance → requests → organizations
- Row Level Security (RLS) cocok untuk role-based access (superadmin/admin/employee/scanner)
- Auto-generate TypeScript types dari schema, menggantikan manual types di `@taptu/shared`
- Real-time WebSocket subscription untuk scanner token refresh
- Open source, bisa self-host di kemudian hari

### LoginPage — full revamp

Desain lama memakai token warna berbeda (`bg-ink`, `bg-sand`, `text-moss`, `font-display`) yang tidak konsisten dengan landing page.

Desain baru sepenuhnya konsisten dengan design system landing page:
- Outer: `bg-[#e9eaec]` — sama dengan landing page
- Layout: dua kolom `lg:grid-cols-2` dengan `min-h-[calc(100vh-32px)]`
- Panel kiri (`bg-[#111827]`): logo Taptu putih, heading "Satu login untuk semua peran.", deskripsi, demo accounts panel
- Panel kanan (`bg-white`): form login — email, password, submit button
- Demo accounts panel (`data-testid="demo-accounts-panel"`): 4 akun demo dengan role badge berwarna, **dapat diklik** untuk mengisi form otomatis
- Role badge colors:
  - superadmin: amber warm
  - admin: blue
  - employee: green
  - scanner: orange
- Input style: `rounded-2xl border border-[#e2e7f0] bg-[#f9fafc]` dengan `focus:border-[#1769ff]`
- Submit button: `bg-[#1769ff]` konsisten dengan landing page primary CTA
- Link ke `/register` untuk daftarkan akun superadmin
- Link "Kembali ke beranda" → `/`
- Tidak memakai `<Shell>` — layout berdiri sendiri

### RegisterPage — new page (`/register`)

Page baru untuk registrasi akun superadmin:
- Outer: sama `bg-[#e9eaec]`
- Layout: single column `max-w-lg` centered
- Taptu logomark di header
- Card putih `rounded-[32px]`
- Role badge `data-testid="role-badge-superadmin"` — amber warm, read-only (role selalu superadmin)
- Fields:
  - `id="organizationName"` — Nama organisasi
  - `id="fullName"` — Nama lengkap
  - `id="email"` — Email
  - `id="password"` — Password (min 8 karakter)
  - `id="confirmPassword"` — Konfirmasi password
- Client-side validation: password match + min length sebelum hit API
- Error state: rounded pill merah `bg-[#fff2ee]`
- Submit: `POST /api/auth/register` → langsung navigate ke `/app` dengan session tersimpan
- Link kembali ke login dan ke beranda

### API — endpoint baru

`POST /api/auth/register`:
- Validasi via `registerSchema` (zod): fullName min 2, email valid, password min 8, organizationName min 2
- Reject 409 jika email sudah dipakai
- Role selalu `"superadmin"` — tidak bisa didelegasi dari client
- Menambah user ke runtime `users` array
- Return `{ token, user }` sama seperti login — session langsung aktif

Demo user `superadmin@taptu.app / Taptu123!` ditambahkan ke hardcoded users list.

### Shared types

`RegisterRequest` ditambahkan ke `packages/shared/src/index.ts`:
```ts
export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  organizationName: string;
}
```

### Router

`/register` → `RegisterPage` ditambahkan ke `apps/web/src/pages/router.tsx`.

### Web API client

`register(payload: RegisterRequest): Promise<LoginResponse>` ditambahkan ke `apps/web/src/lib/api.ts`.

### Agent rule review

TDD — 11 test merah ditulis sebelum kode produksi:
- 6 test login page (brand, inputs, demo panel, register link, back link, submit button)
- 5 test register page (role badge, 5 fields, submit button, login link, back link)

Seluruh test suite:
- Web tests: `34/34` hijau
- API tests: `44/44` hijau
- Typecheck: web + api clean
- Build: `npm run build:web` clean

### Akun demo sekarang

| Role | Email | Password |
|------|-------|----------|
| superadmin | superadmin@taptu.app | Taptu123! |
| admin | admin@taptu.app | Taptu123! |
| employee | employee@taptu.app | Taptu123! |
| scanner | scanner@taptu.app | Taptu123! |

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
npm run dev        # menjalankan API + web sekaligus
```

Atau terpisah:

```bash
npm run dev:api    # Terminal 1 — API di localhost:3001
npm run dev:web    # Terminal 2 — Web di localhost:5173
```

- Web: `http://localhost:5173`
- API: `http://localhost:3001`

## Update: fix login demo + 404 on refresh + remove demo panel (2026-05-01)

### Task 1 — Fix login demo (client-side demo mode)

Root cause sebelumnya: login demo hanya bisa berjalan saat API aktif. Kalau API mati, semua demo account gagal.

Fix: implementasi client-side demo mode di `apps/web/src/lib/demo.ts`.

- `tryDemoLogin(email, password)` — intercept login sebelum hit API. Jika cocok dengan kredensial demo, langsung return `LoginResponse` lokal dengan token `demo:<role>`
- `isDemoToken(token)` — deteksi token demo
- Semua fungsi API (`getDashboard`, `fetchAttendanceHistoryByFilter`, `fetchAdminOverview`, `fetchEmployeeSummary`, `fetchRequests`, `refreshScannerToken`, `checkIn`, `checkOut`, `createRequest`, `approveRequest`, `cancelRequest`, `fetchRequestDetail`) sekarang intercept token demo dan return data mock langsung tanpa hit server
- Demo data konsisten dengan data yang ada di API (STATS, ATTENDANCE, REQUESTS, SCHEDULE)
- Demo login tidak memerlukan API berjalan sama sekali

Akun demo (semua bisa login tanpa API running):

| Role | Email | Password |
|------|-------|----------|
| superadmin | superadmin@taptu.app | Taptu123! |
| admin | admin@taptu.app | Taptu123! |
| karyawan | employee@taptu.app | Taptu123! |
| scanner | scanner@taptu.app | Taptu123! |

### Task 2 — Fix 404 on refresh

Root cause: `vercel.json` tidak punya rewrites rule. SPA di Vercel/production selalu 404 saat halaman di-refresh karena server tidak tahu route `/login`, `/register`, `/app`.

Fix: tambahkan ke `vercel.json`:
```json
"rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
```

Sekarang semua route SPA (/, /login, /register, /app) fallback ke `index.html` dan React Router yang menangani routing.

### Task 3 — Remove demo panel "klik untuk pakai"

Panel interaktif `data-testid="demo-accounts-panel"` dihapus dari LoginPage.

Gantinya: info panel statis di kolom kiri menampilkan 4 akun demo + password dalam format teks yang clean. User mengetik sendiri — tidak ada magic fill lagi.

Juga:
- State pre-fill default (`admin@taptu.app / Taptu123!`) dihapus — form sekarang kosong saat load
- `fillDemo()` function dan `demoAccounts` array dihapus
- `DemoRole` type dihapus

### Task 1 lanjutan — Multi-role registration

RegisterPage sekarang punya role dropdown:
- Superadmin (default)
- Admin HR
- Karyawan

Badge di pojok kiri atas berubah warna sesuai role yang dipilih:
- superadmin: amber `bg-[#fff3dc] text-[#92600a]`
- admin: blue `bg-[#f1f5ff] text-[#1769ff]`
- employee: green `bg-[#f0fdf4] text-[#16a34a]`

`data-testid` badge sekarang dinamis: `role-badge-${role}` (default `role-badge-superadmin`).

API endpoint `POST /api/auth/register` sekarang menerima field `role` (opsional, default `"superadmin"`). Zod schema memvalidasi `["superadmin", "admin", "employee"]`.

`RegisterRequest` di `packages/shared/src/index.ts` sekarang:
```ts
export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  organizationName: string;
  role?: UserRole;
}
```

### `dev` script sekarang jalankan keduanya sekaligus

Root `package.json`:
```json
"dev": "npm run dev:all",
"dev:all": "npm run dev:api & npm run dev:web",
```

User cukup `npm run dev` — API dan web jalan bersamaan.

### Agent rule review

TDD dilakukan:
- 7 test merah ditulis sebelum kode produksi:
  - 3 test demo login bypass (superadmin, admin, employee)
  - 2 test demo dashboard bypass (admin, employee)
  - 1 test role dropdown register page
  - 1 test "does not show demo accounts panel" di login page
- Semua 43 web tests hijau pasca implementasi
- Typecheck full clean (shared + api + web)

### Kondisi build setelah batch ini

- Web tests: 43/43 hijau
- `npm run typecheck` pass (shared + api + web)
- Build clean

## Update Phase 1.5: post-login UI cleanup dan responsive audit (2026-05-02)

Phase ini hanya membersihkan design system, AppShell, responsive behavior, trace theme lama, dan layout dashboard. Tidak ada fitur produk Phase 2 yang ditambahkan.

### Masalah yang ditemukan

- Mobile post-login masih terasa seperti desktop sidebar yang dipaksa masuk ke layar phone.
- Konten dashboard mobile terdorong terlalu jauh ke bawah karena navigasi dan wrapper terlalu besar.
- Logout/profile terasa awkward di mobile karena bukan bagian dari struktur drawer/profile yang compact.
- Active navigation state terlalu berat untuk mobile.
- Source post-login masih menyimpan trace theme lama dari dashboard awal.

### Theme trace yang dihapus

Trace lama yang dibersihkan dari active web source:

- token Tailwind lama: `moss`, `mist`, `sand`, `cloud`, `steel`
- utility lama: `shadow-panel`, `text-ink`, `bg-ink`, `focus:border-moss`
- warna hijau lama: `#2d5246`, `#10211c`, `#12261f`, `#173229`, `#97d7be`, `#11703d`, `#e9f7ef`
- class warna lama: `green`, `emerald`, `teal`, `lime` di active post-login source
- success state dipindahkan ke tone biru lembut: `#edf4ff` + `#174ea6`

Scan terakhir:

```bash
rg -n "moss|mist|sand|cloud|steel|shadow-panel|green|emerald|teal|lime|#2d5246|#10211c|#12261f|#173229|#97d7be|#11703d|#e9f7ef|#dae5db|#dfe6de|#e4ebe4|#fbfcf8|#fbfcfa|text-ink|bg-ink|focus:border-moss" apps/web/src apps/web/tailwind.config.js
```

Result: clean, tidak ada output.

### AppShell dan responsive strategy

Mobile sekarang memakai:

- compact top header dengan Taptu logomark, current page title, dan menu button
- slide-out drawer untuk role-aware navigation
- drawer profile section untuk workspace/user/logout
- desktop sidebar disembunyikan di mobile dengan `lg:flex`
- dashboard content dimulai dekat bagian atas layar dengan padding lebih kecil

Desktop tetap memakai sidebar:

- sidebar hanya muncul di `lg`
- profile/logout ada di bagian bawah sidebar
- layout dashboard tetap balanced setelah mobile refactor

### Komponen yang diubah

- `AppShell`
- desktop sidebar
- mobile header
- mobile drawer navigation
- profile/logout area
- `StatusPill`
- post-login dashboard style tokens di `AppPage`
- Tailwind config custom token lama dihapus

### File yang berubah

- `apps/web/src/components/app.tsx`
- `apps/web/src/components/StatusPill.tsx`
- `apps/web/src/pages/AppPage.tsx`
- `apps/web/src/test/designSystem.test.tsx`
- `apps/web/tailwind.config.js`

### Agent rule review

Mengikuti `/Users/masjak/Downloads/KUMPULAN SKILLS/agent_rule.txt`:

- TDD dilakukan sebelum implementasi:
  - test mobile AppShell memastikan mobile header ada, desktop sidebar hidden, drawer baru muncul setelah menu dibuka
  - test old-theme scan memastikan active post-login source tidak menyimpan token/warna lama
- State-machine thinking diterapkan pada mobile drawer:
  - state awal: drawer closed, main content visible
  - event: click `Buka navigasi`
  - state berikutnya: drawer open, navigation/profile terlihat
  - event: pilih nav atau close
  - state berikutnya: drawer closed

### QA responsive

Breakpoint yang dicek:

- mobile portrait
- mobile landscape
- tablet
- desktop

Hal yang dicek:

- tidak ada horizontal overflow terlihat
- desktop sidebar tidak muncul di mobile/tablet
- content dashboard tidak jatuh terlalu jauh ke bawah
- active nav state lebih compact
- logout tidak floating awkwardly
- card spacing lebih konsisten
- warna mengikuti landing/login: white, soft gray, dark navy, primary blue

Screenshot QA dibuat di:

- `/tmp/taptu-phase15-mobile-portrait.png`
- `/tmp/taptu-phase15-mobile-landscape.png`
- `/tmp/taptu-phase15-tablet.png`
- `/tmp/taptu-phase15-desktop.png`

### Kondisi build setelah Phase 1.5

- `npm run test --workspace @taptu/web -- designSystem` pass
- `npm run test --workspace @taptu/api` pass: `47/47`
- `npm run test --workspace @taptu/web` pass: `55/55`
- `npm run typecheck` pass
- `npm run build` pass
- `npx cap sync ios` pass
- Xcode build pass untuk iPhone 15 Pro Max iOS 17.5 simulator
- app berhasil di-install dan launch di simulator dengan bundle `com.taptu.attendance`

### Routes yang perlu dicek manual sebelum Phase 2

- `/app`
- `/app?role=admin`
- `/app?role=manager`
- `/app?role=employee`
- `/app?role=scanner`

### Catatan untuk Phase 2

- Lanjutkan build feature attendance validation setelah UI foundation ini dipertahankan.
- Jangan mengembalikan token/theme lama yang sudah dibersihkan.
- Untuk success state, gunakan semantic tone yang subtle dan kompatibel dengan Taptu, bukan hijau dashboard lama.
