# TAPTU

Baseline full-stack project untuk platform absensi TAPTU.

## Stack

- `apps/web` → React + Vite + Tailwind + PWA
- `apps/api` → Node.js + Express
- `packages/shared` → shared TypeScript types

## Yang sudah ada

- landing page responsif
- login web dengan akun demo
- mobile-first app shell untuk role `admin`, `employee`, dan `scanner`
- PWA manifest
- app icon dan splash asset berbasis SVG
- fondasi Git repository lokal

## Akun demo

- `admin@taptu.app / Taptu123!`
- `employee@taptu.app / Taptu123!`
- `scanner@taptu.app / Taptu123!`

## Menjalankan project

```bash
npm install
npm run dev:api
npm run dev:web
```

Frontend default:

- `http://localhost:5173`

Backend default:

- `http://localhost:3001`

## Supabase storage

Local development defaults to `local-demo`, which writes `apps/api/data/demo-store.json`.
To use Supabase:

1. Run `supabase/migrations/202605010001_create_taptu_app_store.sql` in the Supabase SQL editor for project `ajlfwivpllbcmadscmkb`.
2. Copy `apps/api/.env.example` to `apps/api/.env`.
3. Set:

```bash
TAPTU_STORAGE_MODE=supabase
SUPABASE_URL=https://ajlfwivpllbcmadscmkb.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only. Do not expose it in the web app.

## Build

```bash
npm run build
```

## Catatan iOS

Wrapper iOS belum digenerate karena `CocoaPods` belum tersedia di environment ini. Setelah `CocoaPods` siap, lanjutkan dari `apps/web`:

```bash
npx cap add ios
npm run cap:sync
```
