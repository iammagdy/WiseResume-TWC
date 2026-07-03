# WiseResume Architecture Overview

**Last Verified:** 2026-07-03  
**Status:** Canonical Architecture Specification  
**Location:** `Project Atlas/architecture/overview.md`  

---

## 1. High-Level Architecture

WiseResume is a full-stack, Appwrite-native web application for resume creation, AI tailoring, cover letter generation, and public portfolio hosting.

```txt
[Client Browser]
       │
       ├────► [Vercel Edge & SPA Hosting] (wiseresume.app)
       │          ├── React 18 / TypeScript 5 / Vite 6
       │          ├── Tailwind CSS v4 / Radix UI / shadcn/ui
       │          └── TanStack Query & Zustand
       │
       └────► [Appwrite Cloud Backend] (fra.cloud.appwrite.io)
                  ├── Appwrite Auth (User Accounts & Sessions)
                  ├── Appwrite Databases (`main` Database ID)
                  ├── Appwrite Storage (`avatars` & Asset Buckets)
                  └── Appwrite Serverless Functions
                         ├── ai-gateway (Consolidated AI Provider Proxy)
                         ├── admin-devkit-data (Admin Cross-User Operations)
                         └── admin-email, admin-visitor-analytics, etc.
```

---

## 2. Core System Components

### Frontend Layer
* **Framework:** React 18, TypeScript 5, Vite 6.
* **UI & Styling:** Tailwind CSS, Radix UI primitives, shadcn/ui, Framer Motion.
* **Hosting:** Vercel (Production domain: `wiseresume.app`).
* **State & Data Fetching:** TanStack Query (`@tanstack/react-query`), Zustand stores, Appwrite Web SDK (`appwrite`).

### Backend Layer (Appwrite-Native)
* **Authentication:** Appwrite Auth handling user signup, email/password sessions, OAuth, and OTP password resets.
* **Database:** Appwrite Databases (`main` database) containing user profiles, resumes, tailoring histories, portfolios, and notifications.
* **File Storage:** Appwrite Storage buckets for user avatars, uploaded resume files, and exported artifacts.
* **Serverless Functions (`appwrite-hubs/`):**
  * `ai-gateway`: Single server-side gateway for OpenAI / OpenRouter / Anthropic AI calls.
  * `admin-devkit-data`: Privileged admin hub for DevKit data operations.
  * `admin-visitor-analytics`: Aggregates visitor stats and analytics.

---

## 3. Key Architectural Rules

1. **Appwrite-Native:** The application uses Appwrite Auth, Databases, Storage, and Functions. Non-Appwrite backends (e.g. Supabase, Kinde) are legacy and strictly prohibited.
2. **AI Routing:** All AI interactions must pass through the server-side Appwrite `ai-gateway` function to enforce rate limits, token validation, and API key security. Direct client-side AI provider calls are forbidden.
3. **Admin Operation Security:** Cross-user database reads and writes must be executed server-side via Appwrite Functions (`admin-devkit-data`), never via direct client-side database permissions.
4. **Billing Status:** Billing and paid subscriptions are currently disabled or set to "Coming Soon".
