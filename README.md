<div align="center">
  <img src="./src/assets/wiseresume-logo-light.webp" alt="WiseResume Logo" width="180" />
  
  <br />
  <br />

  <h1>WiseResume</h1>
  
  <p>
    <strong>Craft your career story with an AI-powered resume builder — part of The Wise Cloud ecosystem.</strong>
  </p>

  <p>
    <a href="https://reactjs.org/"><img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white&style=flat-square" alt="React 18" /></a>
    <a href="https://vitejs.dev/"><img src="https://img.shields.io/badge/Vite-5.0-646CFF?logo=vite&logoColor=white&style=flat-square" alt="Vite" /></a>
    <a href="https://supabase.com/"><img src="https://img.shields.io/badge/Supabase-DB_%26_Edge-3ECF8E?logo=supabase&logoColor=white&style=flat-square" alt="Supabase" /></a>
    <a href="https://kinde.com/"><img src="https://img.shields.io/badge/Auth-Kinde-000000?style=flat-square" alt="Kinde Auth" /></a>
    <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_CSS-3.0-38B2AC?logo=tailwind-css&logoColor=white&style=flat-square" alt="Tailwind CSS" /></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white&style=flat-square" alt="TypeScript" /></a>
  </p>

  <p>
    <a href="#-features">Features</a> •
    <a href="#-tech-stack">Tech Stack</a> •
    <a href="#-getting-started">Getting Started</a> •
    <a href="#-project-architecture">Architecture</a> •
    <a href="#-for-contributors--ai-agents">Governance</a>
  </p>
</div>

---

Welcome to **WiseResume**, your personalized, AI-driven career hub. Built as a blazing-fast, mobile-first Progressive Web App (PWA), WiseResume is designed to help you not just create a resume, but truly stand out in today's competitive job market. 

Whether you're a recent graduate, making a career pivot, or aggressively applying for multiple roles, WiseResume gives you the ultimate toolkit to land your next big opportunity.

## ✨ Features

WiseResume is packed with features designed to give you an unfair advantage in your job search:

<details open>
<summary><b>🧠 Advanced AI Career Studio</b></summary>
<br/>

- **AI Resume Editor**: Choose from over 30 professional templates, see your changes in real-time, and let **Wise AI** enhance your bullet points and summaries.
- **Beat the ATS**: Paste in a job description, and our AI Tailor will intelligently rewrite your resume to maximize your Applicant Tracking System (ATS) match score.
- **Career Assistant**: Generate cover letters, draft resignation emails, take career quizzes, or chat directly with our dedicated AI career agent.
- **Mock Interviews**: Practice makes perfect. Try our real-time voice interview simulator—get instant feedback and a performance score to help you improve.
</details>

<details open>
<summary><b>⚡ Frictionless Experience</b></summary>
<br/>

- **Effortless Parsing**: Have an old resume? Upload your PDF, DOCX, or even an image. Our parser will extract your career history so you don't have to type it out again.
- **Keep Everything Organized**: Use our built-in Kanban board to log, organize, and track every job application in one centralized dashboard.
- **Showcase Your Portfolio**: Claim your own `/p/username` link and instantly turn your resume into a stunning, public web portfolio.
</details>

<details open>
<summary><b>🔒 Secure & Resilient</b></summary>
<br/>

- **Flexible AI (BYOK)**: Use our default Wise AI, or bring your own API keys (Gemini, ElevenLabs, Ollama) for extended, private usage.
- **Biometric Security**: Lock the app using FaceID or TouchID (via WebAuthn) for extra privacy.
- **Works Offline**: On a train? No problem. WiseResume works offline and automatically syncs your changes to the cloud when you reconnect.
</details>

---

## 🛠 Tech Stack

We built WiseResume to be fast, modern, scalable, and highly reliable.

### Frontend
- **Core**: [React 18](https://react.dev/) & [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/) for lightning-fast HMR and optimized production builds.
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) paired with [Radix UI](https://www.radix-ui.com/) and [Framer Motion](https://www.framer.com/motion/) for smooth, accessible, and beautiful interfaces.
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) for local state and [TanStack Query](https://tanstack.com/query/latest) for server state caching.
- **PWA**: Fully functional offline capabilities with Service Workers and IndexedDB synchronization.

### Backend & Infrastructure
- **Authentication**: [Kinde](https://kinde.com/) for enterprise-grade, secure authentication.
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL) with stringent Row Level Security (RLS).
- **Compute**: Supabase Edge Functions (Deno) for secure, lightning-fast server-side AI tasks, token exchanges, and file parsing.

---

## 🚀 Getting Started

Want to run WiseResume locally? Here is how to get your development environment set up:

### Prerequisites
- [Node.js](https://nodejs.org/) 18+ (or [Bun](https://bun.sh/))
- A [Kinde](https://kinde.com/) account (for secure authentication)
- A [Supabase](https://supabase.com/) project (for the database and edge functions)

### 1. Clone & Install
```bash
git clone https://github.com/iammagdy/wiseresume-74945019.git
cd wiseresume-74945019
npm install
```

### 2. Configure Your Environment
Create your local environment file:
```bash
cp .env.example .env
```
Open up `.env` and fill in your details:
- `VITE_KINDE_*` — Your Kinde application credentials.
- `VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY` — Your Supabase project keys.
- *(Optional)* Add your Gemini or ElevenLabs API keys if you want to test the BYOK features.

### 3. Fire it up
Start the Vite development server:
```bash
npm run dev
```
Navigate to `http://localhost:8080` in your browser.

---

## 📜 For Contributors & AI Agents

We're glad to have you here! To keep the project running smoothly, all contributors (human or AI) must respect our governance rules. **These rules are our source of truth and take precedence over everything else.**

You can find all of our guiding documents in the `project-governance/` folder:

| Document | Purpose |
|---|---|
| [`CONSTITUTION.md`](./project-governance/CONSTITUTION.md) | Our supreme rules for development and AI agents. |
| [`PRODUCT.md`](./project-governance/PRODUCT.md) | What WiseResume is (and isn't), and our quality standards. |
| [`ARCHITECTURE.md`](./project-governance/ARCHITECTURE.md) | Technical constraints, security, and our Kinde/Supabase setup. |
| [`BRANDING.md`](./project-governance/BRANDING.md) | Our approved names (**WiseResume**, **Wise AI**, **The Wise Cloud**) and UI guidelines. |
| [`WORKFLOW.md`](./project-governance/WORKFLOW.md) | How we build, test, and deploy. |

**🚨 Important Notes for AI Agents:**
- Please ignore the `legacy-docs/` folder—it is only preserved for historical context.
- Always ensure you are synced with the latest `main` branch before proposing changes.
- **Do not** introduce any branding outside of the approved Wise ecosystem.
- Read `AGENTS.md` in the root directory for specific CLI execution constraints.

---

## 📄 License

Copyright © The Wise Cloud. All rights reserved.  
Proprietary and confidential. Unauthorized use, copying, or distribution is strictly prohibited.
