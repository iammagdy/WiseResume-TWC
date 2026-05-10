<div align="center">

<img src="./src/assets/wiseresume-logo-light.webp" alt="The Wise Cloud" width="160" />

<br />
<br />

<h3>
  <img src="https://img.shields.io/badge/WiseResume-AI_Career_Platform-9E1B22?style=for-the-badge&logoColor=white" alt="WiseResume" />
  &nbsp;
  <img src="https://img.shields.io/badge/WiseHire-AI_HR_SaaS-1D4ED8?style=for-the-badge&logoColor=white" alt="WiseHire" />
</h3>

# The Wise Cloud
### 🚀 Appwrite-Native Edition (v4.0.0+)

**The complete AI-powered platform for career growth and hiring. Successfully migrated to Appwrite.**

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white&style=flat-square)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white&style=flat-square)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white&style=flat-square)](https://vitejs.dev/)
[![Appwrite](https://img.shields.io/badge/Appwrite-Native-FD366E?logo=appwrite&logoColor=white&style=flat-square)](https://appwrite.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38B2AC?logo=tailwind-css&logoColor=white&style=flat-square)](https://tailwindcss.com/)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-12-black?logo=framer&logoColor=white&style=flat-square)](https://www.framer.com/motion/)

**[🌐 Live App →](https://resume.thewise.cloud)**&nbsp;&nbsp;•&nbsp;&nbsp;
[Master Handover](./Project%20Atlas/MASTER_HANDOVER_2026.md) &nbsp;•&nbsp;
[Project Rules](./Project%20Atlas/RULES.md) &nbsp;•&nbsp;
[Screenshots](#-screenshots) &nbsp;•&nbsp;
[Admin Dev Kit](#-admin-dev-kit) &nbsp;•&nbsp;
[Architecture](#-architecture)

</div>

---

## 🏗️ Major Update: Migration to Appwrite
WiseResume and WiseHire have been completely rebuilt as **Appwrite-Native** applications. The platform is now fully Appwrite-native.

- **Unified Auth:** Appwrite Auth (Email/Password + Passkeys + Future OAuth).
- **Consolidated AI Hub:** 84 legacy Edge Functions are now managed via a single **AI-Gateway Hub** in Appwrite.
- **Direct DB Access:** Optimized frontend hooks now call the Appwrite SDK directly, reducing latency and complexity.
- **Region:** Appwrite Cloud (Frankfurt).

---

## 🎯 WiseResume — AI Career Platform
The complete AI toolkit for job seekers, career changers, and high-volume applicants.

- **AI Resume Builder:** 30+ templates with live preview.
- **AI Studio:** 20 career tools + Wise AI Chat assistant.
- **AI Interview Coach:** Voice + text mock interviews with real-time feedback.
- **Public Portfolio:** Convert your resume into a high-end public site with themes.
- **Job Tracker:** Kanban-style application management.

---

## 🔧 Admin Dev Kit 2.1
An internal operations console accessible only to administrators.
- **User Management:** Full control over users and permissions.
- **AI Health:** Real-time monitoring of providers (OpenRouter, Groq, DeepSeek).
- **Audit Logs:** Full system transparency with "Cloud Feed".
- **Passkey Security:** Admin access secured via WebAuthn/Biometrics.

---

## 🛠 Tech Stack
| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + TypeScript 5 + Vite 6 |
| **Backend** | Appwrite (Databases, Auth, Storage, Functions) |
| **Styling** | Tailwind CSS + Radix UI + shadcn/ui |
| **AI Hub** | Appwrite Functions (Consolidated Gateway) |
| **Email** | Resend (Transactionals + Branded Templates) |
| **Deployment** | Hostinger (FTP Sync via GitHub Actions) |

---

## 🚀 Getting Started
### Prerequisites
- Node.js 22+
- An Appwrite Cloud project (`69fd362b001eb325a192`)

### Setup
```bash
git clone https://github.com/iammagdy/WiseResume-TWC.git
cd WiseResume-TWC
npm install
npm run dev
```

### Critical Links for AI Agents
If you are an AI assistant working on this repo, you **MUST** read these first:
1. [**Master Handover**](./Project%20Atlas/MASTER_HANDOVER_2026.md) - Context on migration and current state.
2. [**Project Rules**](./Project%20Atlas/RULES.md) - The "Definition of Done" and architectural constraints.

---

## 📄 License
Copyright © 2026 The Wise Cloud. All rights reserved. Proprietary and confidential.
