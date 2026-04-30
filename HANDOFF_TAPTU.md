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

Hadiri sudah punya baseline full-stack lokal:

- `apps/web`
  - landing page responsif
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

- Admin: `admin@hadiri.app / Hadiri123!`
- Employee: `employee@hadiri.app / Hadiri123!`
- Scanner: `scanner@hadiri.app / Hadiri123!`

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
   - tidak pakai gradient
   - tidak pakai em dash

## Kondisi build terakhir

Terakhir diverifikasi hijau:

- API tests pass `32/32`
- Web tests pass `10/10`
- `npm run typecheck` pass
- `npm run build` pass

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

- API tests pass `20/20`
- Web tests pass `10/10`
- `npm run typecheck` pass
- `npm run build` pass

## Menjalankan project

```bash
npm install
npm run dev:api
npm run dev:web
```

- Web: `http://localhost:5173`
- API: `http://localhost:3001`
