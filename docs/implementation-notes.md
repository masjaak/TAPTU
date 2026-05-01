# TAPTU Implementation Notes

- Root folder `Documents/TAPTU` is now treated as the new project root.
- `apps/web` contains the landing page, login page, PWA setup, and app shell.
- `apps/api` contains the Express API baseline for auth, attendance, request, scanner, and dashboard data.
- `packages/shared` contains shared TypeScript types between frontend and backend.
- Storage defaults to local JSON persistence for demos.
- Supabase storage is available with `TAPTU_STORAGE_MODE=supabase`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`.
- The current Supabase adapter stores the same `DemoStore` shape in `public.taptu_app_store.payload` as JSONB. This keeps the API stable while production table normalization can be introduced later.
- Next production steps: normalized PostgreSQL tables, Redis, OTP, upload flow, and role-specific feature modules.
