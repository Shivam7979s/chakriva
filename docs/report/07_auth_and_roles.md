# 07 - Authentication, Authorization & Role-Based Access Control (RBAC)

## Authentication Architecture Overview

VERNIQ delegates identity management and session token issuance to **Supabase Auth** (GoTrue).
The client uses the official `@supabase/supabase-js` SDK via `AuthProvider` (`frontend/src/hooks/useAuth.tsx`), managing JWTs in browser local storage and synchronizing with an auto-provisioned PostgreSQL `profiles` table.

---

## Authentication Providers & User Flows

### 1. Supported Authentication Providers
- **Email & Password:** Native Supabase GoTrue with secure bcrypt/Argon2 password hashing on the Supabase managed instance.
- **OAuth (GitHub):** Configured via `supabase.auth.signInWithOAuth({ provider: 'github' })`. Redirects to `${window.location.origin}/app/dashboard`.

### 2. Detailed Authentication Flows

#### A. Registration Flow (`SignUpView.tsx` -> `useAuth.tsx:13-20`)
1. User provides `email`, `password`, `username`, `fullName`, and optional `collegeId`.
2. Frontend calls `supabase.auth.signUp({ email, password, options: { data: { username, full_name, college_id } } })`.
3. GoTrue creates a row in `auth.users`.
4. PostgreSQL trigger `on_auth_user_created` (`20261001000001_create_user_profiles.sql`) fires `public.handle_new_user()` with `SECURITY DEFINER` privileges.
5. Trigger automatically inserts the corresponding record in `public.profiles` with `role = 'student'`, `score = 0`, and `problems_solved_count = 0`.
6. Email verification behavior:
   - If Supabase project setting "Confirm email" is enabled, an activation email is dispatched.
   - If disabled (development mode), the session is established immediately.

#### B. Login Flow (`LoginView.tsx` -> `useAuth.tsx:12`)
1. User submits credentials via `signInWithEmail(email, password)`.
2. Supabase GoTrue verifies credentials, returning an `access_token` (short-lived JWT, typically 1 hour) and a `refresh_token`.
3. SDK automatically persists tokens to `localStorage` under the Supabase key.
4. `useAuth.tsx` triggers `fetchProfile(user.id)`, hydrating `userProfile` (including college affiliation and preferred language).

#### C. Session Lifecycle & Token Refresh
1. On initial page load, `supabase.auth.getSession()` reads tokens from `localStorage`.
2. An active subscription `supabase.auth.onAuthStateChange((_event, currentSession) => ...)` handles `TOKEN_REFRESHED`, `SIGNED_IN`, and `SIGNED_OUT` events automatically.
3. Logout invokes `supabase.auth.signOut()`, flushing browser storage and setting auth context state to null.

#### D. Password Reset Flow (`ResetPasswordView.tsx` -> `useAuth.tsx:22`)
1. Calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: '.../reset-password' })`.
2. User receives recovery email with action link containing a temporary recovery token.

---

## Role & Permission Model

VERNIQ defines three distinct user tiers via PostgreSQL enum `user_role` (`20261001000000_init_extensions_and_enums.sql`):
1. **`student`** (Default): Standard platform learner.
2. **`mentor`**: Elevated access for code review, hints, and curriculum feedback.
3. **`admin`**: Full platform authority, CMS problem authoring, batch queue management, and metrics.

### RBAC Enforcement Matrix

| Feature / Resource | Anonymous | Student | Mentor | Admin | Enforcement Mechanism |
|---|---|---|---|---|---|
| Landing, Docs, Public Pages | [ALLOW] | [ALLOW] | [ALLOW] | [ALLOW] | Public React Router routes |
| Problem Catalog Listing | [ALLOW] | [ALLOW] | [ALLOW] | [ALLOW] | RLS: `Public read problems` |
| View Sample Test Cases | [ALLOW] | [ALLOW] | [ALLOW] | [ALLOW] | RLS: `is_sample = true` |
| View Canonical / Hidden Test Cases | [DENY] | [DENY] | [DENY] | [DENY]* | RLS: Blocked on DB level. (*Judge uses `service_role` backend key) |
| Run Ephemeral Code (Judge API) | [ALLOW] | [ALLOW] | [ALLOW] | [ALLOW] | Public judge `/execute` endpoint |
| Submit Solution (Tracked) | [DENY] | [ALLOW] | [ALLOW] | [ALLOW] | `ProtectedRoute` + RLS `user_id = auth.uid()` |
| Cloud CodeSpace / NoteSpace | [DENY] | [ALLOW] | [ALLOW] | [ALLOW] | RLS: `user_id = auth.uid()` |
| Adaptive Sprints / Planner | [DENY] | [ALLOW] | [ALLOW] | [ALLOW] | RLS: `user_id = auth.uid()` |
| Problem Authoring CMS (`/app/authoring`) | [DENY] | [DENY] | [DENY] | [ALLOW] | Frontend `AdminRoute.tsx` + DB RLS policies |
| Batch Authoring Mutation | [DENY] | [DENY] | [DENY] | [ALLOW] | RLS authenticated policies |
| Mutate User Role (`profiles.role`) | [DENY] | [DENY] | [DENY] | [DENY]** | DB Trigger `prevent_profile_role_update` (**Only `service_role`) |

---

## Multi-Layer Role Enforcement

### 1. Database-Level Enforcement (PostgreSQL)
The database serves as the ultimate perimeter:
- **Immutable Role Privilege Trigger:**
  [`backend/supabase/migrations/20261001000001_create_user_profiles.sql:35-46`](file:///c:/Users/LOQ/Desktop/VERNIQ/backend/supabase/migrations/20261001000001_create_user_profiles.sql#L35-L46)
  ```sql
  CREATE OR REPLACE FUNCTION public.prevent_profile_role_update()
  RETURNS TRIGGER AS $$
  BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      IF current_setting('request.jwt.claims', true)::jsonb->>'role' != 'service_role' THEN
        RAISE EXCEPTION 'Only service_role can modify user roles';
      END IF;
    END IF;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
  ```
  Even if an authenticated user issues an HTTP `PATCH /rest/v1/profiles` with `{"role": "admin"}`, Postgres aborts the transaction with an exception.

### 2. Frontend Route Guards
- **`ProtectedRoute.tsx`:** Intercepts unauthenticated navigation to `/app/*`, preserving intended destination via React Router `state.returnTo` and redirecting to `/login`.
- **`AdminRoute.tsx`:**
  [`frontend/src/components/auth/AdminRoute.tsx:39-56`](file:///c:/Users/LOQ/Desktop/VERNIQ/frontend/src/components/auth/AdminRoute.tsx#L39-L56)
  Checks `profile?.role !== 'admin'`. If not admin, renders a `403 - Unauthorized Administrative Access` screen with error code `CLEARANCE_REQUIRED`.

### 3. Backend Judge Worker Authorization
- **Status:** [PARTIAL / VULNERABLE]
- The judge worker HTTP service on port 8080 (`/execute`, `/cancel`) does NOT validate Supabase JWT tokens. Anyone with network access to the judge host can trigger code execution directly.
