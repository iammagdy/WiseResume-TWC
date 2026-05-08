# 🧠 WiseResume Master Handover & State (May 2026)

## 🎯 Current Project State
- **Version:** `4.0.0-Appwrite-Native`
- **Core Status:** Project successfully migrated from Supabase/Kinde to Appwrite.
- **Base URL:** `https://resume.thewise.cloud` (Subdirectory: `/resume`)
- **Deployment:** Hostinger (FTP Sync) via GitHub Actions.

## 🏗️ Architectural Decisions (Critical)
1. **Appwrite-Native Architecture:** All React hooks interact directly with Appwrite SDK. No intermediary API layer for DB/Auth unless security requires it.
2. **AI-Gateway Hub:** Consolidated 84 legacy Edge Functions into a single intelligent Hub in Appwrite. This Hub handles all LLM providers (OpenRouter, Groq, DeepSeek) using Global Variables for secure key management.
3. **Data Migration:** Successfully migrated 21 users and 20 resumes from Supabase. Users from legacy systems must use the "Claim Account" or Password Reset flow for the first login.
4. **Resend Integration:** Handled via custom scripts for high-quality, branded emails. Regional references (e.g., "Frankfurt") are strictly prohibited in user-facing content.

## ✨ Implemented Features & Fixes
- **DevKit 2.1:** High-end admin dashboard (Neon Blue/Dark Theme). Supports Biometric/Passkey login.
- **Branding:** "The Wise Cloud" logo system integrated into all email templates and UI.
- **SPA Deployment Fix:** 
  - Hostinger sync target set to `/public_html/resume/`.
  - Added `.htaccess` in `/public` to handle React Router client-side routing (prevents 404 on refresh).
  - CSP and PATH fixes in `vite.config.ts`.
- **Clean CI/CD:** GitHub Actions reduced to 2 core active workflows: `🚀 Deploy Frontend` and `🧠 Deploy AI Hubs`.

## 🛠️ Technical Identifiers
- **Appwrite Project ID:** `69fd362b001eb325a192`
- **Appwrite Endpoint:** `https://fra.cloud.appwrite.io/v1` (Internal only, UI should show "Cloud Feed").
- **Deployment Folder:** `domains/thewise.cloud/public_html/resume`.

## ⚠️ Instructions for Future Agents
1. **NO GUESSING:** Magdy hates hallucinations. Verify the Root Cause locally before suggesting fixes.
2. **TOKEN EFFICIENCY:** Do not enter infinite loops of failing Workflows. Stop and check logs.
3. **DESIGN STANDARDS:** UI must remain "World-Class" (Neon/Glassmorphism where appropriate).
4. **SECURITY:** Keep AI keys in Appwrite Global Variables. Never hardcode.

---
*Last updated: May 8, 2026, by Wingman.*
