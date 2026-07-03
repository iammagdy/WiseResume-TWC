# WiseResume

<p align="center">
  <strong>AI-powered resume builder, tailoring workspace, cover letter generator, and public portfolio platform.</strong>
</p>

<p align="center">
  <a href="https://wiseresume.app"><strong>Live App (wiseresume.app)</strong></a>
  •
  <a href="./Project%20Atlas/MASTER_HANDBOOK.md">Master Handbook</a>
  •
  <a href="./Project%20Atlas/CURRENT_STATE.md">Current State</a>
  •
  <a href="./Project%20Atlas/RULES.md">Developer Rules</a>
</p>

<p align="center">
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black" alt="React 18" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript 5" /></a>
  <a href="https://vitejs.dev/"><img src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white" alt="Vite 6" /></a>
  <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS v4" /></a>
  <a href="https://appwrite.io/"><img src="https://img.shields.io/badge/Appwrite-Cloud-FD366E?logo=appwrite&logoColor=white" alt="Appwrite Cloud" /></a>
  <a href="https://vercel.com/"><img src="https://img.shields.io/badge/Vercel-Hosted-000000?logo=vercel&logoColor=white" alt="Vercel" /></a>
</p>

---

## 📌 Product Overview

**WiseResume** is a full-stack, AI-driven career workspace designed for job seekers, professionals, and recruiters. It streamlines career document preparation and online presence management into a unified, privacy-conscious workflow:

* **AI-Powered Resume Builder**: Create, edit, and format multi-template resumes with live rendering and automatic saving.
* **Resume Tailoring Workspace**: Match resumes against specific job descriptions to extract key ATS keywords and calculate genuine fit score improvements.
* **Cover Letter Generator**: Produce targeted, highly contextual cover letters based on candidate resumes and job postings.
* **Public Portfolio Platform**: Publish responsive online career portfolios with security controls, visitor contact forms, and analytics.
* **Export & Preview Workflows**: Generate print-ready PDF exports and clean DOCX documents.

---

## ✨ Key Features

* **AI Resume Editor**: Real-time visual resume editing with dynamic section ordering, customizable color themes, and automatic autosave.
* **Tailoring Hub**: Intelligent resume-to-job matching with ATS keyword gap analysis and measurable score deltas.
* **AI Cover Letter Generation**: Context-aware cover letter draft generation tailored to target company requirements.
* **Upload & Import Flow**: Client-side document parsing for importing existing PDF and DOCX CVs into structured templates.
* **PDF & DOCX Export**: One-click export options supporting native styled PDFs and clean DOCX file downloads.
* **Public Portfolio Publishing**: Dedicated public portfolio URLs (`/p/:username`), optional password protection, custom themes, and custom sections.
* **Portfolio Engagement**: Cloudflare Turnstile-protected contact form, in-app notification center, and visitor activity tracking.
* **Bilingual Support (Arabic & English)**: Comprehensive internationalization supporting LTR (English) and RTL (Arabic) layouts.
* **DevKit & Operations Hub**: Privileged administrative surface for system health audits, analytics monitoring, and user support.

---

## 🏗️ Architecture

WiseResume uses a modern, serverless, Appwrite-native architecture:

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
                         ├── admin-devkit-data (Admin Operations)
                         └── admin-email, admin-visitor-analytics, etc.
```

* **Frontend Layer**: SPA built with React 18, TypeScript 5, Vite 6, and Tailwind CSS v4, deployed to Vercel.
* **Backend Layer**: Appwrite Cloud managing authentication, databases, and file storage.
* **Server-Side AI Gateway**: All AI requests route through the server-side Appwrite `ai-gateway` function (`appwrite-hubs/ai-gateway`).
* **Zero Client Secret Exposure**: AI provider API keys reside exclusively in server-side function environments and are never exposed to the client browser.

---

## 🛠️ Tech Stack

| Category | Technology |
| --- | --- |
| **Frontend** | React 18, TypeScript 5, Vite 6 |
| **UI & Styling** | Tailwind CSS v4, Radix UI Primitives, shadcn/ui, Framer Motion |
| **State & Data** | TanStack Query (`@tanstack/react-query`), Zustand |
| **Backend** | Appwrite Cloud (Databases & Storage) |
| **Auth** | Appwrite Auth |
| **AI Routing** | Appwrite Serverless Functions (`ai-gateway` proxying OpenAI / OpenRouter / Anthropic) |
| **Deployment** | Vercel (Frontend Web App) & Appwrite Cloud (Backend & Functions) |
| **Testing** | Vitest (Unit/Integration) & Playwright (E2E Automation) |

---

## 🚀 Local Development

### Prerequisites

* **Node.js**: `22+`
* **Package Manager**: `npm`

### Quickstart

```bash
# 1. Copy environment variables example file
cp .env.example .env.local

# 2. Install dependencies
npm install

# 3. Start local development server (http://localhost:5000)
npm run dev

# 4. Typecheck and build for production
npm run build

# 5. Run Vitest test suite
npm run test

# 6. Run Playwright E2E tests
npm run test:e2e
```

---

## 🔒 Environment & Security Model

* **Environment Variables**: Configure client variables in `.env.local` using `.env.example` as a template.
* **Secret Protection**: Never commit API keys, tokens, or credentials to version control.
* **Server-Side AI Security**: AI provider API keys (OpenAI, OpenRouter, Anthropic) are stored exclusively in Appwrite serverless function environment variables.
* **Public Client Safety**: Frontend variables (prefixed with `VITE_`) are public-safe for web browser bundle distribution.
* **Bot Defense**: Public portfolio contact forms utilize Cloudflare Turnstile site verification.
* **Privileged Admin Data**: Cross-user database operations are restricted to server-side Appwrite Functions (`admin-devkit-data`).

---

## 📦 Deployment Model

* **Frontend Hosting (Vercel)**: Pushes to the `main` branch automatically deploy the web application to [wiseresume.app](https://wiseresume.app).
* **Backend Functions (Appwrite)**: Appwrite Functions located in `appwrite-hubs/` deploy independently via GitHub Actions or helper scripts.
* **Targeted Deployment Policy**: Always execute targeted function deploys (e.g. `node scripts/deploy_hubs.cjs --only=ai-gateway`). **Never run target-all (`target=all`) deployments**.

---

## 📚 Project Atlas (Documentation Source of Truth)

Canonical project documentation, architecture details, and operating manuals are maintained in **Project Atlas**:

* **[Master Handbook (AI & Developer Manual)](./Project%20Atlas/MASTER_HANDBOOK.md)** — Core entry point and operating manual.
* **[Current Production State](./Project%20Atlas/CURRENT_STATE.md)** — Verified production architecture snapshot.
* **[Developer & Agent Rules](./Project%20Atlas/RULES.md)** — Execution rules and definition of done.
* **[Master Routing Rules](./Project%20Atlas/ATLAS_ROUTING_RULES.md)** — Document routing matrix and placement policy.
* **[Source of Truth Map](./Project%20Atlas/SOURCE_OF_TRUTH_MAP.md)** — Complete documentation inventory index.

---

## 📊 Project Status

* **Status**: Actively developed and maintained.
* **Production URL**: Live at [https://wiseresume.app](https://wiseresume.app).
* **Billing / Payments**: Currently **disabled** or marked **Coming Soon**.
* **WiseHire Module**: Secondary / deprioritized product component.

---

## 📄 License

`License: TBD — this repository is not currently licensed for public reuse.`
