<div align="center">
  <img src="./src/assets/wise-ai-logo.webp" alt="WiseResume Logo" width="120" />
  <h1>WiseResume</h1>
  <p><strong>A resume-first AI career platform — part of The Wise Cloud, powered by Wise AI.</strong></p>
</div>

---

## Product Summary

**WiseResume** is an AI-powered career platform that puts your resume at the center of your job search. It is built as a Progressive Web App (PWA) with a mobile-first design and is part of **The Wise Cloud** ecosystem, driven by **Wise AI**.

WiseResume helps job seekers, students, career switchers, and high-volume applicants build polished resumes, tailor them to specific roles, prepare for interviews, and track their entire application process — all in one place.

---

## Key Features

- **AI Resume Editor** — 30+ customizable templates, live preview, and AI-assisted content enhancement via Wise AI.
- **Resume Upload & Parsing** — Upload a PDF, DOCX, or image and let the system extract your career history automatically.
- **ATS Job Tailoring** — Paste a job description; Wise AI rewrites your resume to maximize your ATS match score.
- **AI Studio** — A centralized hub of career tools: cover letter generator, resignation letter writer, career quiz, and an agentic career chat.
- **Voice Mock Interviews** — Real-time voice-based interview simulations with AI feedback and performance scoring.
- **Job Application Tracker** — A Kanban board to log, organize, and track all your applications in one place.
- **Public Portfolio** — Claim a `/p/username` link and share a public web portfolio generated from your resume.
- **Settings & BYOK** — Configure dark/light mode, manage Kinde credentials, and bring your own API keys (Gemini, ElevenLabs) for extended AI usage.
- **Offline-Ready PWA** — Works offline with local queuing; syncs automatically when reconnected.
- **Biometric Lock** — Optionally secure the app with device-level biometric authentication (FaceID / TouchID).

---

## Architecture Overview

### Frontend
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS, shadcn/ui (Radix UI), Framer Motion
- **State & Data**: Zustand, TanStack Query (React Query v5)
- **Routing**: React Router v6 (lazy-loaded routes)
- **PWA / Mobile**: Capacitor, `vite-plugin-pwa`

### Authentication
- **Auth Provider**: [Kinde](https://kinde.com) — the **sole** authentication provider. Supabase Auth is **not used**.

### Backend
- **Database**: Supabase (PostgreSQL) with Row-Level Security (RLS) enforced on all tables.
- **Edge Functions**: Supabase Edge Functions handle server-side AI tasks and integrations.
- **Storage**: Supabase Storage for resume files and user assets.

### Hosting & Deployment
- Target hosting: **Hostinger** via automated Git-based deployment.
- CI/CD: GitHub-based workflow (configuration in progress).

---

## Governance & Source of Truth

All product and engineering decisions are governed by the files in the `project-governance/` folder. **These take precedence over all other documentation, including this README.**

| Document | Purpose |
|---|---|
| [`project-governance/CONSTITUTION.md`](./project-governance/CONSTITUTION.md) | Supreme rules for contributors and AI agents |
| [`project-governance/PRODUCT.md`](./project-governance/PRODUCT.md) | Product identity and quality rules |
| [`project-governance/ARCHITECTURE.md`](./project-governance/ARCHITECTURE.md) | Architecture constraints and security rules |
| [`project-governance/BRANDING.md`](./project-governance/BRANDING.md) | Approved names, UI, and design guidelines |
| [`project-governance/WORKFLOW.md`](./project-governance/WORKFLOW.md) | Development and deployment procedures |
| [`docs/product/PRD.md`](./docs/product/PRD.md) | Canonical Product Requirements Document |

> Files under `legacy-docs/` are archived historical context only. They do not reflect current architecture or branding.

---

## Getting Started

### Prerequisites
- Node.js 18+ (or Bun)
- A [Kinde](https://kinde.com) account (for auth credentials)
- A [Supabase](https://supabase.com) project (for database and edge functions)

### 1. Clone and Install
```bash
git clone https://github.com/iammagdy/wiseresume1.git
cd wiseresume1
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```
Fill in the required variables in `.env`:
- `VITE_KINDE_*` — Kinde application credentials
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` — Supabase project credentials
- (Optional) AI API keys for BYOK features (Gemini, ElevenLabs)

### 3. Run the Development Server
```bash
npm run dev
```

---

## Contributing & AI Agents

All contributors — human and AI agents alike — **must** follow the governance rules before making any change:

1. Sync with the latest repository state (`git pull`).
2. Read `project-governance/CONSTITUTION.md`.
3. Inspect the relevant code and current implementation.
4. Propose your approach before making high-impact changes.

**Do not** reference or copy from `legacy-docs/`. Do not use Supabase Auth. Do not use any branding other than **WiseResume**, **Wise AI**, and **The Wise Cloud**.

---

## License

Copyright © The Wise Cloud. All rights reserved.  
Proprietary and confidential. Unauthorized use or distribution is prohibited.
