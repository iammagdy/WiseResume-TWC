# 🧠 WiseResume Master Handover & State (May 2026)

## ⚠️ MANDATORY CONTEXT FOR AI AGENTS
- **Environment Status:** This is a **DEVELOPMENT ENVIRONMENT**. It is NOT a production environment. All actions, deployments, and configurations are for development and testing purposes only.
- **Strict Rule:** DO NOT guess. DO NOT hallucinate. Check logs and verify the Root Cause in the code before suggesting any fix. Magdy (the owner) values token efficiency and precision.

## 🔄 The Great Migration (Supabase/Kinde → Appwrite)
The project has undergone a complete architectural shift:
- **BEFORE:** Used Supabase (DB/Auth) and Kinde (Auth). Had 84 separate Edge Functions.
- **AFTER (Current):** 100% Appwrite-Native (v4.0.0+). 
- **Migration Scope:** 
  - 21 users and 20 resumes were manually migrated from Supabase to Appwrite.
  - Legacy users MUST use "Claim Account" or Password Reset flow to activate their Appwrite accounts.
  - Kinde and Supabase SDKs have been removed or deprecated in favor of `appwrite` (Client SDK) and `node-appwrite` (Server SDK).

## 🏗️ Current Architecture & Integration
- **Appwrite Endpoint:** `https://fra.cloud.appwrite.io/v1` (Note: UI labels must refer to "Cloud Feed", never "Frankfurt").
- **Project ID:** `69fd362b001eb325a192`.
- **AI-Gateway Hub:** All 84 legacy AI functions are now consolidated into a single intelligent "AI Hub" within Appwrite Functions. 
- **Provider Routing:** The Hub securely routes requests to OpenRouter, Groq, and DeepSeek using Global Variables stored in Appwrite.
- **Frontend-to-Backend:** React hooks now call `databases.listDocuments` and other Appwrite methods directly. No intermediary API layer is used for standard DB operations.

## ✨ Features & Fixed Issues
- **DevKit 2.1:** Advanced admin dashboard with Neon Blue/Dark theme and Biometric (Passkey) support.
- **Deployment (Hostinger):**
  - **Path:** Files are synced to `/public_html/resume/`.
  - **SPA Fix:** A `.htaccess` file is required in the root to redirect all traffic to `index.html` (prevents 404 on refresh).
  - **Vite Config:** Base path is set to `/` and custom CSP meta-tags are injected at build time.
- **CI/CD:** GitHub Actions are cleaned. Only `deploy-frontend.yml` and `deploy-appwrite-hubs.yml` should be triggered.

## 📍 Where We Stopped
- **Current Task:** Migrated the development environment onto **Replit** so the project can be edited and previewed there.
- **Replit Dev Environment Setup (May 2026):**
  - Replit-provisioned **PostgreSQL** (Neon-compatible) is connected via `DATABASE_URL`; Drizzle schema pushed with `npx drizzle-kit push --force`. This DB is for *Replit-side dev only* — production data still lives in Appwrite Cloud.
  - `npm install --legacy-peer-deps` runs cleanly; workflow `Start application` runs `npm run server:dev & npm run dev` and serves Vite on port 5000 (proxied to the Replit preview).
  - **Removed the last dead Kinde imports** that were preventing the SPA from compiling on Replit:
    - `src/pages/Index.tsx` — duplicate `useAuth` import + `kindeRegister` ref in `handleCTA` deps.
    - `src/components/auth/SignInPromptDialog.tsx` — `useKindeAuth` replaced with `react-router` `navigate('/auth?...')`.
    - `src/components/landing/LandingHeader.tsx` — `kindeLogin({ prompt: 'login' })` call replaced with `navigate('/auth?mode=login')`.
    - `src/pages/WhatsNewPage.tsx` — stripped unused `useKindeAuth` import.
  - `src/contexts/AuthContext.tsx` exposes `supabaseSettled` / `supabaseReady` as Appwrite-backed aliases (`!appwriteLoading` / `!appwriteLoading && (impersonating || !!appwriteUser)`) so the legacy hooks that still read those flag names compile against the Appwrite-Native context without a regression.
  - **Security:** Removed plaintext `SUPABASE_SERVICE_ROLE_KEY` from `.replit` (`[userenv.shared]`). No Supabase secrets were re-issued — Appwrite-Native flow does not need them. The remaining `VITE_SUPABASE_*` plaintext entries are still in `.replit` because legacy bundles read them at module load; physical deletion of those modules is out-of-scope for this Replit setup task and tracked as a follow-up cleanup.
- **Next Steps:**
  - Continue monitoring Hostinger deployment at `https://resume.thewise.cloud/`.
  - Follow-up task: physically delete `src/lib/supabaseBridge.ts`, `src/lib/apiFetch.ts` Supabase routing branches, and `server/index.ts` Supabase auth/proxy code now that nothing on the Appwrite-Native critical path depends on them.

---
*Created by Wingman to ensure continuity and prevent technical regression.*
