# Hadiri by TAPTU

Baseline full-stack project untuk platform absensi Hadiri.

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

- `admin@hadiri.app / Hadiri123!`
- `employee@hadiri.app / Hadiri123!`
- `scanner@hadiri.app / Hadiri123!`

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
