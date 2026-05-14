# 📋 Current State

| Aspect      | Details                                                                                          |
|-------------|--------------------------------------------------------------------------------------------------|
| Framework   | NestJS v10                                                                                       |
| Database    | PostgreSQL via Prisma (hosted on Supabase)                                                       |
| Current Auth| Simple API-key middleware (`x-api-key` header) protecting `/jobs`                                |
| Supabase    | Already configured (`SUPABASE_URL`, `SUPABASE_API_KEY`) — used for storage only                 |
| Installed   | `@supabase/supabase-js` v2                                                                       |
| Schema      | Job, Company (with Sector enum)                                                                  |

---

# 🗺️ Plan: Supabase Auth + User Management

## Phase 1 — Database Schema

### 1.1 Add User Model to `prisma/schema.prisma`

```prisma
model User {
  id          String    @id @default(uuid())
  supabaseUid String    @unique          // maps to auth.users.id
  email       String    @unique
  fullName    String?
  role        Role      @default(USER)
  avatarUrl   String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  applications Application[]
  savedJobs   SavedJob[]
}

enum Role {
  USER
  ADMIN
}

model Application {
  id          String      @id @default(uuid())
  userId      String
  jobId       String
  job         Job         @relation(fields: [jobId], references: [id])
  coverLetter String?
  resumeUrl   String?
  status      AppStatus   @default(PENDING)
  createdAt   DateTime    @default(now())

  @@unique([userId, jobId])
}

enum AppStatus {
  PENDING
  ACCEPTED
  REJECTED
}

model SavedJob {
  id      String  @id @default(uuid())
  userId  String
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  jobId   String
  job     Job     @relation(fields: [jobId], references: [id], onDelete: Cascade)

  @@unique([userId, jobId])
}
```

### 1.2 Run `npx prisma migrate dev` to apply the migration.

---

## Phase 2 — NestJS Auth Infrastructure

### 2.1 Create AuthModule (`src/auth/`)

| File               | Purpose                                                                 |
|--------------------|-------------------------------------------------------------------------|
| `auth.module.ts`   | Module wiring — imports ConfigService, exports AuthService              |
| `auth.service.ts`  | Business logic: user lookup/creation from Supabase JWT claims           |
| `auth.controller.ts` | Optional: callback for any custom auth flows                          |

### 2.2 Create Supabase Client Provider

- Singleton Supabase client using `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (for admin operations like looking up users)
- Also expose a method to verify Supabase JWTs using the Supabase JWT secret (or the public key approach)

### 2.3 JWT Verification Strategy

- Supabase issues JWTs signed with its own secret
- Create a custom AuthGuard (NestJS PassportStrategy or a lightweight custom guard) that:
  1. Extracts the `Authorization: Bearer <token>` header
  2. Verifies the token signature using Supabase's JWT secret (from env: `SUPABASE_JWT_SECRET`)
  3. Decodes the payload to get `sub` (Supabase UID) and email
  4. Attaches the user to `request.user`

### 2.4 Create Guards

| Guard      | Protects                                                   |
|------------|------------------------------------------------------------|
| `AuthGuard`     | All protected routes — requires valid Supabase JWT      |
| `RolesGuard`    | Admin-only endpoints — checks `user.role === 'ADMIN'`   |

---

## Phase 3 — Replace Old API Key Auth

### 3.1 Update `AppModule`

- Remove `AuthMiddleware` from the `configure()` method
- Apply `@UseGuards(AuthGuard)` on controllers that need auth (instead of middleware)

### 3.2 Keep Backward-Compatible API Key Auth (Optional)

- Allow both JWT or API key for the scraper/cron endpoints
- This keeps your existing scraper pipeline working if it uses `x-api-key`

---

## Phase 4 — Auth Endpoints & User Features

### 4.1 Protected Job Endpoints

- `/jobs` → now behind `AuthGuard` (JWT required)
- Optionally add rate-limiting per user

### 4.2 User Endpoints

| Endpoint         | Method   | Description                                                       |
|------------------|----------|-------------------------------------------------------------------|
| `/auth/me`       | `GET`    | Returns current user profile (from JWT claims + local DB)         |
| `/jobs/:id/apply`| `POST`   | Submit application (cover letter, resume URL)                     |
| `/jobs/:id/save` | `POST`   | Bookmark a job                                                    |
| `/jobs/:id/unsave`| `DELETE`| Remove bookmark                                                   |
| `/jobs/saved`    | `GET`    | List saved/bookmarked jobs                                        |
| `/jobs/applied`  | `GET`    | List applied jobs with status                                     |

### 4.3 User Model Methods in `UserService`

- `getUserBySupabaseUid(supabaseUid: string) → User | null`
- `syncUser(supabaseUid, email, fullName?) → User` — creates or updates local user from JWT claims
- `applyToJob(userId, jobId, coverLetter?) → Application`
- `saveJob(userId, jobId) → SavedJob`
- `unsaveJob(userId, jobId)`

---

## Phase 5 — Supabase Webhook (Optional but Recommended)

Set up a Supabase Database Webhook (or Edge Function) on `auth.users` events:

- `signup` → auto-create local User record
- `delete` → cascade-delete local user data (or soft-delete)
- `update` → sync email / fullName / avatarUrl changes

> This keeps your local User table in sync with Supabase Auth without manual intervention.

---

## Phase 6 — Environment Variables

Add to `.env`:

```env
SUPABASE_JWT_SECRET=<your-jwt-secret-from-supabase>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

> Get the JWT secret from Supabase Dashboard → Authentication → URL Signing Secret

---

## Phase 7 — Security Hardening

- Enable Supabase Row Level Security (RLS) on the `users`, `applications`, and `saved_jobs` tables
- Set up Supabase policies so users can only read/update their own data
- Add input validation (`class-validator`) on all DTOs
- Add rate limiting (`@nestjs/throttler`) on auth endpoints

---

# 📦 Packages to Install

```bash
npm install @nestjs/passport passport-jwt @types/passport-jwt jwt-decode
```

> `jwt-decode` for easy payload extraction; `passport-jwt` is optional if you prefer a lightweight custom guard.

---

# 🔄 Summary Flow

```
Frontend (React/Vue/etc.)
  ↓ signs up/logs in via Supabase Auth (email, Google, GitHub, etc.)
  ↓ receives JWT
  ↓ sends JWT in Authorization header
NestJS API
  ↓ verifies JWT with Supabase JWT secret
  ↓ extracts user from JWT + local DB
  ↓ processes protected request (apply, save, etc.)
```
