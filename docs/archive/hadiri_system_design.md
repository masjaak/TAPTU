# Hadiri — System Design Document
**Versi:** 1.0  
**Stack:** React PWA · Node.js/Express · PostgreSQL  
**Update:** April 2026

---

## Daftar Isi

1. [Arsitektur Sistem Overview](#1-arsitektur-sistem-overview)
2. [Database Design (ERD)](#2-database-design-erd)
3. [API Design](#3-api-design)
4. [Sequence Diagrams](#4-sequence-diagrams)
5. [Infrastruktur & Deployment](#5-infrastruktur--deployment)
6. [Security Design](#6-security-design)
7. [Caching Strategy](#7-caching-strategy)
8. [Offline & Sync Strategy](#8-offline--sync-strategy)
9. [Notification System](#9-notification-system)
10. [Observability & Monitoring](#10-observability--monitoring)

---

## 1. Arsitektur Sistem Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │  Karyawan PWA    │  │  Admin PWA       │  │ Scanner PWA  │  │
│  │  (React)         │  │  (React)         │  │ (React)      │  │
│  │  Mobile-first    │  │  Desktop/Tablet  │  │ Fullscreen   │  │
│  └────────┬─────────┘  └────────┬─────────┘  └──────┬───────┘  │
└───────────┼──────────────────────┼──────────────────┼──────────┘
            │                      │                  │
            └──────────────────────┼──────────────────┘
                                   │ HTTPS
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                         CDN / EDGE                              │
│  Cloudflare (Static assets, DDoS protection, WAF)               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY                                │
│  Node.js/Express · Port 3001                                    │
│  Rate limiting · Request validation · JWT verify                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Routes                                                  │   │
│  │  /api/auth/*  /api/attendance/*  /api/requests/*         │   │
│  │  /api/admin/* /api/reports/*     /api/scanner/*          │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────┬──────────────────────────────────────────────────┘
              │
    ┌─────────┴──────────┐
    │                    │
    ▼                    ▼
┌──────────┐    ┌──────────────────┐
│PostgreSQL│    │  Redis Cache     │
│(Primary) │    │  Sessions        │
│          │    │  QR Tokens       │
│Replica   │    │  Rate limits     │
└──────────┘    └──────────────────┘
              │
    ┌─────────┴──────────┐
    │                    │
    ▼                    ▼
┌──────────┐    ┌──────────────────┐
│Cloudflare│    │  Email / Push    │
│R2 Storage│    │  Resend (email)  │
│(selfie   │    │  FCM (push notif)│
│ photos)  │    └──────────────────┘
└──────────┘
```

### Komponen Utama

| Komponen | Teknologi | Fungsi |
|----------|-----------|--------|
| Frontend PWA | React 18, Vite, TailwindCSS | UI semua role |
| Backend API | Node.js 20, Express 5 | Business logic, API |
| Database | PostgreSQL 16 | Data utama |
| Cache | Redis 7 | Session, QR token, rate limit |
| File Storage | Cloudflare R2 | Foto selfie, lampiran |
| Email | Resend | OTP, notifikasi, invite |
| Push Notif | Firebase FCM | Mobile push notification |
| CDN/Proxy | Cloudflare | Static assets, protection |
| Monitoring | Grafana + Prometheus | Metrics, alerting |

---

## 2. Database Design (ERD)

### Entity Relationship Diagram (Teks)

```
organizations ──< locations ──< shifts
      │                              │
      ├──< users ──────────────< attendance_records >──── locations
      │       │                     │
      │       └──< leave_requests   └── qr_tokens
      │       │
      │       └──< notification_preferences
      │
      ├──< qr_tokens
      ├──< audit_logs
      └──< billing_subscriptions
```

---

### Tabel: `organizations`

| Kolom | Type | Constraint | Keterangan |
|-------|------|------------|------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `name` | VARCHAR(255) | NOT NULL | Nama organisasi |
| `type` | ENUM | NOT NULL | 'corporate','school','ukm','startup' |
| `slug` | VARCHAR(100) | UNIQUE, NOT NULL | URL-friendly, auto-generated |
| `logo_url` | TEXT | NULL | URL di Cloudflare R2 |
| `timezone` | VARCHAR(50) | DEFAULT 'Asia/Jakarta' | |
| `default_work_start` | TIME | DEFAULT '08:00' | |
| `default_work_end` | TIME | DEFAULT '17:00' | |
| `late_tolerance_minutes` | INTEGER | DEFAULT 15 | |
| `plan` | ENUM | DEFAULT 'free' | 'free','starter','pro','enterprise' |
| `max_employees` | INTEGER | DEFAULT 10 | Berdasarkan plan |
| `is_active` | BOOLEAN | DEFAULT true | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes:** `slug`, `plan`

---

### Tabel: `users`

| Kolom | Type | Constraint | Keterangan |
|-------|------|------------|------------|
| `id` | UUID | PK | |
| `organization_id` | UUID | FK organizations, NOT NULL | |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | |
| `password_hash` | VARCHAR(255) | NOT NULL | bcrypt, cost 12 |
| `full_name` | VARCHAR(255) | NOT NULL | |
| `phone` | VARCHAR(20) | NULL | |
| `role` | ENUM | NOT NULL | 'superadmin','admin','employee' |
| `department` | VARCHAR(100) | NULL | |
| `employee_id` | VARCHAR(50) | NULL | ID karyawan eksternal |
| `avatar_url` | TEXT | NULL | |
| `shift_id` | UUID | FK shifts, NULL | Shift default |
| `annual_leave_quota` | INTEGER | DEFAULT 12 | |
| `annual_leave_used` | INTEGER | DEFAULT 0 | |
| `push_token` | TEXT | NULL | FCM token |
| `email_notif` | BOOLEAN | DEFAULT true | |
| `push_notif` | BOOLEAN | DEFAULT true | |
| `is_active` | BOOLEAN | DEFAULT true | |
| `last_login_at` | TIMESTAMPTZ | NULL | |
| `invited_by` | UUID | FK users, NULL | |
| `invite_accepted_at` | TIMESTAMPTZ | NULL | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes:** `organization_id`, `email`, `role`, `shift_id`

---

### Tabel: `locations`

| Kolom | Type | Constraint | Keterangan |
|-------|------|------------|------------|
| `id` | UUID | PK | |
| `organization_id` | UUID | FK organizations, NOT NULL | |
| `name` | VARCHAR(255) | NOT NULL | "Kantor Pusat" |
| `address` | TEXT | NULL | |
| `latitude` | DECIMAL(10,8) | NOT NULL | |
| `longitude` | DECIMAL(11,8) | NOT NULL | |
| `radius_meters` | INTEGER | DEFAULT 200 | Min 50, max 2000 |
| `is_active` | BOOLEAN | DEFAULT true | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes:** `organization_id`

---

### Tabel: `shifts`

| Kolom | Type | Constraint | Keterangan |
|-------|------|------------|------------|
| `id` | UUID | PK | |
| `organization_id` | UUID | FK organizations, NOT NULL | |
| `name` | VARCHAR(100) | NOT NULL | "Shift Pagi" |
| `work_days` | INTEGER[] | NOT NULL | [1,2,3,4,5] = Senin–Jumat |
| `start_time` | TIME | NOT NULL | |
| `end_time` | TIME | NOT NULL | |
| `late_tolerance_minutes` | INTEGER | NULL | Override dari org default |
| `location_id` | UUID | FK locations, NULL | Lokasi default shift ini |
| `is_active` | BOOLEAN | DEFAULT true | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |

---

### Tabel: `attendance_records`

| Kolom | Type | Constraint | Keterangan |
|-------|------|------------|------------|
| `id` | UUID | PK | |
| `user_id` | UUID | FK users, NOT NULL | |
| `organization_id` | UUID | FK organizations, NOT NULL | Denormalized untuk query cepat |
| `date` | DATE | NOT NULL | Tanggal absensi |
| `check_in_at` | TIMESTAMPTZ | NULL | |
| `check_out_at` | TIMESTAMPTZ | NULL | |
| `check_in_method` | ENUM | NULL | 'qr','selfie','gps','manual' |
| `check_out_method` | ENUM | NULL | 'qr','selfie','gps','manual' |
| `check_in_location_id` | UUID | FK locations, NULL | |
| `check_out_location_id` | UUID | FK locations, NULL | |
| `check_in_lat` | DECIMAL(10,8) | NULL | |
| `check_in_lng` | DECIMAL(11,8) | NULL | |
| `check_out_lat` | DECIMAL(10,8) | NULL | |
| `check_out_lng` | DECIMAL(11,8) | NULL | |
| `selfie_url` | TEXT | NULL | URL foto di R2 |
| `status` | ENUM | NOT NULL | 'present','late','absent','izin','cuti' |
| `is_late` | BOOLEAN | DEFAULT false | |
| `late_minutes` | INTEGER | NULL | |
| `shift_id` | UUID | FK shifts, NULL | Snapshot shift saat itu |
| `work_duration_minutes` | INTEGER | NULL | check_out - check_in |
| `is_synced` | BOOLEAN | DEFAULT true | false jika dari offline queue |
| `offline_submitted_at` | TIMESTAMPTZ | NULL | |
| `notes` | TEXT | NULL | Catatan admin/manual |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes:** `(user_id, date)` UNIQUE, `(organization_id, date)`, `status`, `(user_id, created_at DESC)`

**Constraint:** UNIQUE (user_id, date) — satu record per orang per hari

---

### Tabel: `qr_tokens`

| Kolom | Type | Constraint | Keterangan |
|-------|------|------------|------------|
| `id` | UUID | PK | |
| `organization_id` | UUID | FK organizations, NOT NULL | |
| `location_id` | UUID | FK locations, NOT NULL | |
| `token` | VARCHAR(255) | NOT NULL | HMAC-SHA256 hash |
| `payload` | JSONB | NOT NULL | {orgId, locationId, timestamp, nonce} |
| `expires_at` | TIMESTAMPTZ | NOT NULL | NOW() + 30 seconds |
| `is_used` | BOOLEAN | DEFAULT false | |
| `used_by` | UUID | FK users, NULL | |
| `used_at` | TIMESTAMPTZ | NULL | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |

**Note:** Token juga di-cache di Redis dengan TTL 35 detik  
**Indexes:** `token`, `(organization_id, expires_at)`, `(location_id, expires_at)`  
**Cleanup:** Cron job setiap jam hapus expired tokens

---

### Tabel: `leave_requests`

| Kolom | Type | Constraint | Keterangan |
|-------|------|------------|------------|
| `id` | UUID | PK | |
| `user_id` | UUID | FK users, NOT NULL | |
| `organization_id` | UUID | FK organizations, NOT NULL | |
| `type` | ENUM | NOT NULL | 'izin','cuti','koreksi' |
| `start_date` | DATE | NOT NULL | |
| `end_date` | DATE | NOT NULL | |
| `duration_days` | INTEGER | NOT NULL | Hari kerja efektif |
| `category` | VARCHAR(100) | NULL | 'sakit','pribadi','dinas_luar', dll |
| `reason` | TEXT | NOT NULL | |
| `attachment_url` | TEXT | NULL | |
| `status` | ENUM | DEFAULT 'pending' | 'pending','approved','rejected' |
| `reviewed_by` | UUID | FK users, NULL | Admin yang review |
| `reviewed_at` | TIMESTAMPTZ | NULL | |
| `review_notes` | TEXT | NULL | Catatan approval/rejection |
| `correction_date` | DATE | NULL | Khusus type='koreksi' |
| `correction_checkin` | TIME | NULL | |
| `correction_checkout` | TIME | NULL | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes:** `(user_id, status)`, `(organization_id, status)`, `(start_date, end_date)`

---

### Tabel: `invite_tokens`

| Kolom | Type | Constraint | Keterangan |
|-------|------|------------|------------|
| `id` | UUID | PK | |
| `organization_id` | UUID | FK organizations, NOT NULL | |
| `email` | VARCHAR(255) | NOT NULL | |
| `role` | ENUM | NOT NULL | 'admin','employee' |
| `shift_id` | UUID | FK shifts, NULL | |
| `token` | VARCHAR(255) | UNIQUE, NOT NULL | Random secure token |
| `invited_by` | UUID | FK users, NOT NULL | |
| `expires_at` | TIMESTAMPTZ | NOT NULL | +7 hari |
| `accepted_at` | TIMESTAMPTZ | NULL | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |

---

### Tabel: `audit_logs`

| Kolom | Type | Constraint | Keterangan |
|-------|------|------------|------------|
| `id` | BIGSERIAL | PK | |
| `organization_id` | UUID | FK organizations, NOT NULL | |
| `actor_id` | UUID | FK users, NULL | NULL = sistem |
| `action` | VARCHAR(100) | NOT NULL | 'checkin','approve_request', dll |
| `entity_type` | VARCHAR(50) | NOT NULL | 'attendance','leave_request', dll |
| `entity_id` | UUID | NOT NULL | |
| `old_values` | JSONB | NULL | Snapshot sebelum |
| `new_values` | JSONB | NULL | Snapshot sesudah |
| `ip_address` | INET | NULL | |
| `user_agent` | TEXT | NULL | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |

**Retention:** 2 tahun, lalu archive ke cold storage  
**Indexes:** `(organization_id, created_at)`, `(entity_type, entity_id)`, `actor_id`

---

### Tabel: `billing_subscriptions`

| Kolom | Type | Constraint | Keterangan |
|-------|------|------------|------------|
| `id` | UUID | PK | |
| `organization_id` | UUID | FK organizations, UNIQUE | |
| `plan` | ENUM | NOT NULL | 'free','starter','pro','enterprise' |
| `price_idr` | INTEGER | NOT NULL | Dalam Rupiah |
| `billing_cycle` | ENUM | DEFAULT 'monthly' | 'monthly','yearly' |
| `current_period_start` | DATE | NOT NULL | |
| `current_period_end` | DATE | NOT NULL | |
| `status` | ENUM | NOT NULL | 'active','past_due','cancelled' |
| `payment_method` | VARCHAR(50) | NULL | |
| `external_subscription_id` | VARCHAR(255) | NULL | ID dari payment gateway |
| `cancelled_at` | TIMESTAMPTZ | NULL | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |

---

## 3. API Design

### Base URL
```
Production:  https://api.hadiri.app/api/v1
Staging:     https://api-staging.hadiri.app/api/v1
```

### Authentication
Semua endpoint (kecuali `/auth/*`) memerlukan:
```
Authorization: Bearer {jwt_access_token}
```

### Conventions
- Response format: JSON
- Success: `{ data: {...}, meta: {...} }`
- Error: `{ error: { code, message, details } }`
- Timestamp: ISO 8601 UTC
- Pagination: `?page=1&limit=25`

---

### Auth Endpoints

**POST `/auth/register`**
```json
Request:
{
  "organizationName": "PT. Maju Bersama",
  "email": "admin@perusahaan.com",
  "password": "Password123!",
  "phone": "08123456789",
  "organizationType": "corporate"
}
Response 201:
{
  "data": {
    "userId": "uuid",
    "organizationId": "uuid",
    "message": "OTP sent to email"
  }
}
```

**POST `/auth/verify-otp`**
```json
Request:
{ "email": "admin@perusahaan.com", "otp": "123456" }
Response 200:
{ "data": { "accessToken": "...", "refreshToken": "..." } }
```

**POST `/auth/login`**
```json
Request:
{ "email": "...", "password": "..." }
Response 200:
{ "data": { "accessToken": "...", "refreshToken": "...", "user": {...}, "organization": {...} } }
```

**POST `/auth/refresh`**
```json
Request: { "refreshToken": "..." }
Response 200: { "data": { "accessToken": "..." } }
```

**POST `/auth/logout`** — Invalidate refresh token

**POST `/auth/forgot-password`** — Kirim email reset

**POST `/auth/reset-password`** — Token dari email + password baru

---

### Attendance Endpoints

**POST `/attendance/checkin`**
```json
Request (QR):
{
  "method": "qr",
  "qrToken": "hmac-token-string",
  "latitude": -7.0051,
  "longitude": 110.4381
}

Request (Selfie):
{
  "method": "selfie",
  "photo": "base64...",
  "latitude": -7.0051,
  "longitude": 110.4381
}

Request (GPS):
{
  "method": "gps",
  "latitude": -7.0051,
  "longitude": 110.4381,
  "accuracy": 8.5
}

Response 201:
{
  "data": {
    "attendanceId": "uuid",
    "checkInAt": "2026-04-28T01:02:00Z",
    "status": "present",
    "isLate": false,
    "location": { "id": "...", "name": "Kantor Pusat" },
    "selfieUrl": null
  }
}
```

**POST `/attendance/checkout`**
```json
Request: { "latitude": -7.0051, "longitude": 110.4381 }
Response 200: { "data": { "checkOutAt": "...", "workDurationMinutes": 542 } }
```

**GET `/attendance/today`** — Status kehadiran hari ini user yang login

**GET `/attendance/history`**
```
Query: ?month=2026-04&page=1&limit=20
Response: { data: [...records], meta: { total, page, limit, summary: {present, late, absent} } }
```

**GET `/attendance/:id`** — Detail satu record

---

### Scanner Endpoints

**POST `/scanner/auth`** — Login scanner dengan PIN
```json
Request: { "organizationSlug": "pt-maju-bersama", "locationId": "uuid", "pin": "123456" }
Response: { "data": { "scannerToken": "...", "expiresAt": "..." } }
```

**GET `/scanner/token`** — Get QR token saat ini
```json
Headers: Authorization: Bearer {scannerToken}
Response:
{
  "data": {
    "token": "hmac-sha256-string",
    "expiresAt": "2026-04-28T01:41:30Z",
    "location": { "id": "...", "name": "Kantor Pusat" }
  }
}
```

---

### Leave Requests Endpoints

**GET `/requests`**
```
Query: ?type=izin|cuti|koreksi&status=pending|approved|rejected&page=1
```

**POST `/requests`**
```json
Request:
{
  "type": "izin",
  "startDate": "2026-05-02",
  "endDate": "2026-05-02",
  "category": "sakit",
  "reason": "Demam tinggi",
  "attachmentUrl": "r2://..."
}
Response 201: { "data": { "requestId": "...", "status": "pending" } }
```

**GET `/requests/:id`** — Detail satu request

**DELETE `/requests/:id`** — Batalkan request (status pending only)

---

### Admin Endpoints

**GET `/admin/dashboard`**
```json
Response:
{
  "data": {
    "today": {
      "present": 41, "late": 4, "absent": 3,
      "total": 48, "notCheckedIn": [...]
    },
    "last30days": [
      { "date": "2026-04-01", "presentRate": 0.89 },
      ...
    ]
  }
}
```

**GET `/admin/attendance`** — Log kehadiran dengan filter + pagination

**GET `/admin/requests`** — List requests dengan filter pending/approved/rejected

**PATCH `/admin/requests/:id`**
```json
Request: { "status": "approved" | "rejected", "reviewNotes": "..." }
```

**GET `/admin/employees`** — List karyawan dengan filter

**POST `/admin/employees/invite`**
```json
Request: { "emails": ["..."], "role": "employee", "shiftId": "uuid" }
```

**PATCH `/admin/employees/:id`** — Update data karyawan

**DELETE `/admin/employees/:id`** — Nonaktifkan (soft delete)

**GET `/admin/reports`** — Laporan dengan filter
```
Query: ?startDate=2026-04-01&endDate=2026-04-30&employeeId=...&status=...
```

**GET `/admin/reports/export`**
```
Query: ?format=xlsx|pdf&...filters
Response: File download (Content-Disposition: attachment)
```

---

## 4. Sequence Diagrams

### 4.1 QR Check-in Flow

```
Karyawan App     Backend API       Redis          PostgreSQL
     │                │               │               │
     │ Buka /checkin/qr               │               │
     │─────────────────────────────────────────────────►
     │                │               │               │
     │ Kamera aktif   │               │               │
     │                │               │               │
     │ [Scan QR]      │               │               │
     │ qrToken="abc"  │               │               │
     │────────────────►               │               │
     │ POST /attendance/checkin       │               │
     │ {method:"qr", token, lat, lng} │               │
     │                │               │               │
     │                │ GET qr:abc    │               │
     │                │───────────────►               │
     │                │ {payload, exp}│               │
     │                │◄──────────────│               │
     │                │               │               │
     │                │ Validasi:     │               │
     │                │ - exp > now   │               │
     │                │ - HMAC valid  │               │
     │                │ - not used    │               │
     │                │               │               │
     │                │ SELECT attendance WHERE       │
     │                │ user_id=X AND date=today      │
     │                │───────────────────────────────►
     │                │ (null = belum check-in)       │
     │                │◄──────────────────────────────│
     │                │               │               │
     │                │ SET qr:abc used│              │
     │                │───────────────►               │
     │                │               │               │
     │                │ INSERT attendance_records     │
     │                │───────────────────────────────►
     │                │ {id, status, check_in_at}     │
     │                │◄──────────────────────────────│
     │                │               │               │
     │                │ INSERT audit_log              │
     │                │───────────────────────────────►
     │                │               │               │
     │ 201 {attendanceId, checkInAt, status}          │
     │◄───────────────│               │               │
     │                │               │               │
     │ Navigate ke /checkin/success   │               │
```

---

### 4.2 Selfie Check-in Flow

```
Karyawan App     Backend API       R2 Storage     PostgreSQL
     │                │               │               │
     │ Buka kamera depan              │               │
     │ Liveness check (berkedip)      │               │
     │                │               │               │
     │ [Capture foto] │               │               │
     │ Kompres → base64               │               │
     │ Get GPS coords │               │               │
     │                │               │               │
     │ POST /attendance/checkin       │               │
     │ {method:"selfie",photo,lat,lng}│               │
     │────────────────►               │               │
     │                │               │               │
     │                │ Validasi GPS  │               │
     │                │ (dalam radius?)               │
     │                │               │               │
     │                │ Upload photo  │               │
     │                │───────────────►               │
     │                │ PUT r2://org/user/timestamp.jpg│
     │                │◄──────────────│               │
     │                │ selfieUrl     │               │
     │                │               │               │
     │                │ INSERT attendance_records     │
     │                │ {selfie_url, lat, lng, ...}   │
     │                │───────────────────────────────►
     │                │◄──────────────────────────────│
     │                │               │               │
     │ 201 success    │               │               │
     │◄───────────────│               │               │
```

---

### 4.3 Admin Approve Request Flow

```
Admin App        Backend API       PostgreSQL     Notification
     │                │               │           Service
     │ PATCH /admin/requests/:id      │               │
     │ {status:"approved",notes:"..."}│               │
     │────────────────►               │               │
     │                │               │               │
     │                │ Validasi:     │               │
     │                │ - role Admin? │               │
     │                │ - org match?  │               │
     │                │ - status pending?             │
     │                │               │               │
     │                │ BEGIN TXN     │               │
     │                │───────────────►               │
     │                │               │               │
     │                │ UPDATE leave_requests         │
     │                │ SET status='approved'         │
     │                │ reviewed_by=adminId           │
     │                │───────────────►               │
     │                │               │               │
     │                │ Jika type='cuti':             │
     │                │ UPDATE users SET              │
     │                │ annual_leave_used += days     │
     │                │───────────────►               │
     │                │               │               │
     │                │ INSERT attendance untuk      │
     │                │ hari cuti/izin (status='cuti')│
     │                │───────────────►               │
     │                │               │               │
     │                │ COMMIT TXN    │               │
     │                │───────────────►               │
     │                │               │               │
     │                │ Send push + email             │
     │                │───────────────────────────────►
     │                │ "Izin kamu disetujui"         │
     │                │               │               │
     │ 200 {status:"approved"}        │               │
     │◄───────────────│               │               │
```

---

### 4.4 QR Token Generation (Scanner)

```
Scanner Device   Backend API       Redis
     │                │               │
     │ GET /scanner/token             │
     │────────────────►               │
     │                │               │
     │                │ Verify scanner token (JWT)
     │                │               │
     │                │ GET qr_current:{locationId}
     │                │───────────────►
     │                │               │
     │     (Cache HIT)│               │
     │                │◄──────────────│
     │                │ token, exp    │
     │                │               │
     │     ATAU       │               │
     │                │               │
     │     (Cache MISS atau exp <5s)  │
     │                │ Generate new token:
     │                │ payload = {orgId, locationId,
     │                │           timestamp, nonce}
     │                │ token = HMAC-SHA256(payload, SECRET)
     │                │               │
     │                │ SET qr_current:{locationId}
     │                │ TTL = 35s     │
     │                │───────────────►
     │                │               │
     │                │ INSERT qr_tokens (async)
     │                │               │
     │ 200 {token, expiresAt}         │
     │◄───────────────│               │
     │                │               │
     │ [Timer countdown 30s]          │
     │ [Auto-request token baru setelah 28s]
```

---

## 5. Infrastruktur & Deployment

### Environment Structure

```
┌──────────────────────────────────────────────────────┐
│                    PRODUCTION                        │
│                                                      │
│  Vercel (Frontend)          Railway / Render         │
│  ┌────────────────┐         (Backend)                │
│  │ React PWA      │         ┌────────────────────┐   │
│  │ hadiri.app     │◄───────►│ Node.js API        │   │
│  │ admin.hadiri.  │         │ Port 3001           │   │
│  │ scanner.hadiri.│         └────────┬───────────┘   │
│  └────────────────┘                  │               │
│                                      ▼               │
│                            ┌────────────────────┐   │
│                            │ PostgreSQL         │   │
│                            │ (Supabase / Neon)  │   │
│                            └────────────────────┘   │
│                                                      │
│  Cloudflare R2 (Storage)   Upstash Redis (Cache)    │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│                    STAGING                           │
│  Vercel Preview + Railway Staging                    │
│  Separate database + Separate R2 bucket             │
└──────────────────────────────────────────────────────┘
```

### Environment Variables

**Backend (.env):**
```env
# Server
NODE_ENV=production
PORT=3001
API_VERSION=v1

# Database
DATABASE_URL=postgresql://user:pass@host:5432/hadiri_prod
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Redis
REDIS_URL=redis://default:pass@host:6379

# JWT
JWT_ACCESS_SECRET=<256-bit random>
JWT_REFRESH_SECRET=<256-bit random>
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=30d

# QR Token
QR_HMAC_SECRET=<256-bit random>
QR_TOKEN_TTL_SECONDS=30

# Storage
CLOUDFLARE_R2_ACCOUNT_ID=...
CLOUDFLARE_R2_ACCESS_KEY=...
CLOUDFLARE_R2_SECRET_KEY=...
CLOUDFLARE_R2_BUCKET=hadiri-prod
CLOUDFLARE_R2_PUBLIC_URL=https://files.hadiri.app

# Email
RESEND_API_KEY=re_...

# Push Notification
FCM_SERVICE_ACCOUNT_JSON=...

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
CHECKIN_RATE_LIMIT_MAX=3

# Security
CORS_ORIGINS=https://hadiri.app,https://admin.hadiri.app
BCRYPT_ROUNDS=12
```

### Deployment Pipeline (CI/CD)

```
GitHub Repository
      │
      ├── Push ke branch `develop`
      │         │
      │         ▼
      │   GitHub Actions
      │   ┌──────────────────────────┐
      │   │ 1. Lint (ESLint)         │
      │   │ 2. Type check (TSC)      │
      │   │ 3. Unit tests (Jest)     │
      │   │ 4. Integration tests     │
      │   │ 5. Build                 │
      │   └──────────────────────────┘
      │         │ All pass
      │         ▼
      │   Deploy ke STAGING
      │   (Vercel Preview + Railway Staging)
      │
      └── Merge ke `main`
                │
                ▼
          GitHub Actions
          (sama + E2E tests Playwright)
                │ All pass
                ▼
          Deploy ke PRODUCTION
          (Vercel + Railway Production)
          + Slack notification
```

### Scaling Strategy

| Komponen | Phase 1 (0–1000 user) | Phase 2 (1000–10000) | Phase 3 (10000+) |
|----------|----------------------|---------------------|-----------------|
| Backend | Single instance | 2–3 instances | Auto-scale |
| Database | Single Postgres | Read replica | Sharding per org |
| Cache | Upstash Redis | Redis cluster | Multi-region |
| Storage | R2 single bucket | R2 multi-region | CDN optimized |
| CDN | Cloudflare free | Cloudflare Pro | Enterprise |

---

## 6. Security Design

### Authentication & Authorization

**JWT Flow:**
```
Access Token:  expire 15 menit → rotate agresif
Refresh Token: expire 30 hari → stored httpOnly cookie

Payload access token:
{
  "sub": "userId",
  "orgId": "organizationId",
  "role": "admin",
  "iat": timestamp,
  "exp": timestamp
}
```

**Role-Based Access Control (RBAC):**
| Endpoint | Karyawan | Admin | Superadmin |
|----------|----------|-------|-----------|
| `/attendance/*` | ✓ (own) | ✓ (all) | ✓ (all) |
| `/requests/*` | ✓ (own) | ✓ (all) | ✓ (all) |
| `/admin/*` | ✗ | ✓ | ✓ |
| `/admin/settings` | ✗ | Read | Write |
| `/admin/employees/delete` | ✗ | ✗ | ✓ |
| `/admin/billing` | ✗ | ✗ | ✓ |

### QR Token Security

```
Token generation:
1. payload = JSON.stringify({
     orgId, locationId,
     timestamp: Date.now(),
     nonce: crypto.randomBytes(16).toString('hex')
   })
2. token = crypto.createHmac('sha256', QR_HMAC_SECRET)
              .update(payload)
              .digest('hex')
3. Store di Redis: SET qr:{token} {payload} EX 35

Validation:
1. Decode token dari QR scan
2. GET dari Redis — kalau tidak ada: expired
3. Re-compute HMAC dan compare — kalau beda: invalid
4. Check expires_at — kalau lewat: expired
5. Check is_used — kalau true: already used
6. Mark as used: SET qr:{token}:used 1 EX 10
```

**Anti-screenshot attack:**
- Token expire 30 detik → screenshot tidak berguna dalam 30s
- Nonce unik per token → tidak bisa di-replay
- Mark used → tidak bisa dipakai dua kali

### Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /auth/login` | 5 req | 5 menit per IP |
| `POST /auth/register` | 3 req | 1 jam per IP |
| `POST /auth/verify-otp` | 3 req | 10 menit per email |
| `POST /attendance/checkin` | 3 req | 1 menit per user |
| `GET /scanner/token` | 10 req | 1 menit per scanner |
| Global API | 100 req | 1 menit per user |

Implementation: Redis sliding window counter

### Data Validation

```javascript
// Setiap request divalidasi dengan Joi/Zod sebelum controller
const checkinSchema = z.object({
  method: z.enum(['qr', 'selfie', 'gps']),
  qrToken: z.string().optional(),
  photo: z.string().base64().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().positive().optional()
})
```

### SQL Injection Prevention
- Semua query menggunakan parameterized queries (pg driver)
- ORM: Knex.js dengan query builder — no raw string interpolation
- Input sanitization middleware (express-validator)

### CORS Configuration
```javascript
cors({
  origin: process.env.CORS_ORIGINS.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
})
```

### File Upload Security
```
Validasi upload foto selfie:
1. MIME type check (hanya image/jpeg, image/png)
2. File size limit: 5MB
3. Scan magic bytes (bukan hanya extension)
4. Resize & strip metadata sebelum store ke R2
5. Generate random filename (bukan nama asli user)
6. URL signed (private) — akses hanya via API, bukan langsung
```

### HTTPS & Headers
```
Semua response menggunakan security headers:
- Strict-Transport-Security: max-age=31536000
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Content-Security-Policy: default-src 'self'
- X-XSS-Protection: 1; mode=block
```

---

## 7. Caching Strategy

### Redis Cache Keys

| Key Pattern | Content | TTL | Invalidate When |
|-------------|---------|-----|----------------|
| `qr_current:{locationId}` | QR token aktif | 35s | Generate baru |
| `qr:{token}` | Token payload | 35s | Expire auto |
| `qr:{token}:used` | Flag used | 10s | Auto |
| `org:{orgId}:employees` | List karyawan | 5 menit | Employee update |
| `org:{orgId}:locations` | List lokasi | 10 menit | Location update |
| `org:{orgId}:shifts` | List shift | 10 menit | Shift update |
| `dashboard:{orgId}:{date}` | Dashboard stats | 2 menit | Checkin event |
| `session:{userId}` | Session data | 15 menit | Logout |
| `ratelimit:{ip}:{endpoint}` | Counter | Per window | Auto |

### Cache Strategy per Use Case

**QR Token (Ultra-short TTL):**
- Read-through: Cek Redis dulu, kalau miss generate baru
- Write-through: Generate → save Redis → async save PostgreSQL
- TTL sangat pendek (35 detik) untuk security

**Dashboard Stats (Short TTL):**
- Cache-aside: Load dari DB, cache di Redis 2 menit
- Invalidate setiap ada check-in baru (cache bust)
- Acceptable stale: 2 menit untuk dashboard

**Config Data (Long TTL):**
- Org config, lokasi, shift → cache 10 menit
- Invalidate on write: setiap admin update, bust cache

**Report Data (No cache):**
- Laporan selalu fresh dari DB
- Heavy query: optimize dengan proper indexes + pagination

---

## 8. Offline & Sync Strategy

### PWA Service Worker

```javascript
// Cache strategy per resource type:
precacheAndRoute([
  { url: '/', revision: BUILD_HASH },
  { url: '/static/js/main.js', revision: BUILD_HASH },
  // ... semua static assets
])

// Runtime caching:
registerRoute(
  /\/api\/attendance\/history/,
  new StaleWhileRevalidate({ cacheName: 'attendance-history' })
)

registerRoute(
  /\/api\/admin\/dashboard/,
  new NetworkFirst({
    cacheName: 'dashboard',
    networkTimeoutSeconds: 3
  })
)
```

### Offline Queue (IndexedDB)

```javascript
// Schema offline queue
const offlineQueue = {
  storeName: 'pendingCheckins',
  schema: {
    id: 'auto',
    userId: 'string',
    method: 'string',          // 'gps' only (QR butuh online)
    latitude: 'number',
    longitude: 'number',
    accuracy: 'number',
    photoBlob: 'blob',         // Untuk selfie offline
    submittedAt: 'timestamp',  // Waktu asli check-in
    syncedAt: null,
    attempts: 0
  }
}

// Sync saat online kembali
window.addEventListener('online', async () => {
  const queue = await getOfflineQueue()
  for (const item of queue) {
    try {
      await submitCheckin(item)
      await removeFromQueue(item.id)
    } catch (err) {
      await incrementAttempts(item.id)
    }
  }
})
```

### Conflict Resolution

| Skenario | Resolution |
|----------|------------|
| Offline checkin, sudah manual check-in oleh admin | Offline submission ditolak (409 Conflict), log ke audit |
| 2 offline checkin di hari sama | Pertama diterima, kedua ditolak |
| Offline checkout + sudah ada | Ambil yang lebih logis (waktu lebih awal = check-in, lebih akhir = check-out) |

---

## 9. Notification System

### Event → Notification Mapping

| Event | Penerima | Channel | Timing |
|-------|----------|---------|--------|
| Check-in berhasil | Karyawan | Push | Immediate |
| Check-in terlambat | Karyawan + Admin | Push + Email | Immediate |
| Karyawan tidak hadir | Admin | Push + Email | +30 menit dari jam masuk |
| Request izin baru | Admin | Push + Email | Immediate |
| Request disetujui | Karyawan | Push + Email | Immediate |
| Request ditolak | Karyawan | Push + Email | Immediate |
| QR Code expired | Karyawan (saat scan) | In-app toast | On event |
| Check-in offline tersync | Karyawan | Push | On sync |
| Laporan bulanan | Admin | Email | 1 tgl bulan berikutnya |
| Kuota cuti < 3 hari | Karyawan | Push | Setelah approval |
| Renewal billing | Superadmin | Email | H-7 renewal |

### Email Templates (Resend)

```
Template yang diperlukan:
1. otp-verification.html        → Verifikasi OTP registrasi
2. employee-invite.html         → Undangan karyawan baru
3. password-reset.html          → Reset password
4. leave-request-approved.html  → Notifikasi approval
5. leave-request-rejected.html  → Notifikasi rejection
6. monthly-report.html          → Laporan bulanan otomatis
7. billing-renewal.html         → Reminder renewal
```

### Push Notification (FCM)

```javascript
// Payload FCM
const notification = {
  token: user.pushToken,
  notification: {
    title: "Check-in Berhasil ✓",
    body: "Kehadiran Anda tercatat pukul 08:02 WIB"
  },
  data: {
    type: "checkin_success",
    attendanceId: "uuid",
    action: "open_home"
  },
  android: {
    notification: { channelId: "attendance" }
  },
  apns: {
    payload: { aps: { sound: "default" } }
  }
}
```

---

## 10. Observability & Monitoring

### Metrics (Prometheus)

```
Metrics yang dikumpulkan:

Business metrics:
- hadiri_checkins_total{method, status, org}
- hadiri_requests_total{type, status}
- hadiri_active_orgs_total
- hadiri_active_users_total{role}

Technical metrics:
- http_request_duration_seconds{method, route, status}
- http_requests_total{method, route, status}
- db_query_duration_seconds{query}
- redis_cache_hits_total
- redis_cache_misses_total
- queue_size{queue_name}
```

### Alerting Rules

| Alert | Condition | Severity |
|-------|-----------|----------|
| API Error Rate High | error_rate > 5% selama 5 menit | Critical |
| DB Slow Queries | p99 latency > 1s selama 3 menit | Warning |
| Redis Down | redis_up == 0 | Critical |
| Check-in Spike | checkins > 3x normal 15 menit | Info |
| Disk Usage | disk_used > 80% | Warning |
| QR Token Gen Fail | qr_gen_errors > 0 selama 2 menit | Critical |

### Logging Strategy

```javascript
// Structured logging (Winston)
logger.info('checkin_success', {
  userId, orgId, method,
  lat, lng, locationId,
  duration_ms: Date.now() - startTime
})

logger.error('qr_validation_failed', {
  token: token.substring(0, 8) + '...', // Jangan log full token
  reason: 'expired',
  userId
})

// Log levels:
// ERROR: Production issues yang butuh action
// WARN:  Anomali yang tidak blocking
// INFO:  Business events penting
// DEBUG: Development only (disable di production)
```

### Health Check Endpoint

**GET `/health`** (no auth required)
```json
Response 200:
{
  "status": "healthy",
  "timestamp": "2026-04-28T01:41:00Z",
  "checks": {
    "database": "healthy",
    "redis": "healthy",
    "storage": "healthy"
  },
  "version": "1.0.0"
}
```

### Uptime SLA Target

| Tier | Target | Max Downtime/Month |
|------|--------|--------------------|
| Free | 99.0% | 7.2 jam |
| Starter | 99.5% | 3.6 jam |
| Pro | 99.9% | 43 menit |
| Enterprise | 99.95% | 21 menit |

---

*System Design ini adalah dokumen hidup — update setiap ada keputusan arsitektur signifikan.*

**Next steps setelah dokumen ini:**
1. Setup monorepo (pnpm workspace: `/apps/web`, `/apps/api`, `/packages/shared`)
2. Initialize PostgreSQL schema dengan migrations (Knex)
3. Build auth module dulu (register → OTP → login → JWT)
4. Lalu attendance module (QR + GPS)
5. Baru selfie + admin dashboard
