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
- **Current Task:** The last action was fixing the Hostinger deployment path and removing regional "Frankfurt" mentions.
- **Next Steps:** Monitoring the current deployment runs and ensuring the site loads correctly at `https://resume.thewise.cloud/`.

---
*Created by Wingman to ensure continuity and prevent technical regression.*
