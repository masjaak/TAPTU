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

- API tests pass `14/14`
- Web tests pass `5/5`
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

1. Jadikan tab `Scanner` benar-benar fullscreen operational screen
2. Tambahkan filter attendance history
3. Tambahkan request detail dan cancel untuk request pending milik employee
4. Mulai siapkan storage dan DB layer yang lebih dekat ke produksi

## Update terbaru setelah handoff awal

Batch terbaru sudah menambahkan:

- filter attendance history:
  - `all`
  - `present`
  - `issue`
- request detail panel di tab `Izin`
- cancel request untuk request `Menunggu`
- scanner screen yang lebih fullscreen-like dan lebih cocok untuk perangkat operasional

Review terakhir tetap hijau:

- API tests pass `18/18`
- Web tests pass `5/5`
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
