<div align="center">
  <img src="./src/assets/wiseresume-logo-light.webp" alt="WiseResume Logo" width="160" />
  <h1>WiseResume</h1>
  <p><strong>Craft your career story with an AI-powered resume builder — part of The Wise Cloud ecosystem.</strong></p>
</div>

---

Welcome to **WiseResume**, your personalized AI career hub. We built WiseResume as a mobile-first Progressive Web App (PWA) to help you not just create a resume, but truly stand out in today's competitive job market. Whether you're a recent graduate, making a career pivot, or applying for multiple roles, WiseResume gives you the tools to land your next big opportunity.

## ✨ What makes WiseResume special?

- **AI Resume Editor**: Choose from over 30 professional templates, see your changes in real-time, and let **Wise AI** enhance your bullet points and summaries.
- **Effortless Parsing**: Have an old resume? Just upload your PDF, DOCX, or even an image, and we'll extract your career history so you don't have to type it all out again.
- **Beat the ATS**: Paste in a job description, and our AI Tailor will rewrite your resume to maximize your match score against Applicant Tracking Systems.
- **Your AI Career Studio**: It's more than a resume builder. Generate cover letters, draft resignation emails, take career quizzes, or chat with our dedicated career agent.
- **Mock Interviews**: Practice makes perfect. Try our real-time voice interview simulator—get instant feedback and a performance score to help you improve.
- **Keep Everything Organized**: Use our built-in Kanban board to log, organize, and track every job application in one neat place.
- **Showcase Your Portfolio**: Claim your own `/p/username` link and turn your resume into a stunning, public web portfolio.
- **Flexible & Secure**: Use our default AI, or bring your own API keys (Gemini, ElevenLabs) for extended usage. You can also lock the app using FaceID or TouchID for extra privacy.
- **Works Offline**: On a train? No problem. WiseResume works offline and automatically syncs your changes when you reconnect.

---

## 🛠 Under the Hood

We built WiseResume to be fast, modern, and reliable.

- **Frontend**: React 18, TypeScript, and Vite power the core experience, with Tailwind CSS and Framer Motion making everything look and feel smooth.
- **Authentication**: We use [Kinde](https://kinde.com) exclusively to keep your account secure.
- **Backend & Database**: Our foundation runs on Supabase (PostgreSQL), utilizing Edge Functions for lightning-fast server-side AI tasks and secure file storage.

---

## 🚀 Getting Started

Want to run WiseResume locally? Here's how to get set up:

### What you'll need
- Node.js 18+ (or Bun)
- A [Kinde](https://kinde.com) account (for secure authentication)
- A [Supabase](https://supabase.com) project (for the database and edge functions)

### 1. Clone & Install
```bash
git clone https://github.com/iammagdy/wiseresume1.git
cd wiseresume1
npm install
```

### 2. Configure Your Environment
Create your local environment file:
```bash
cp .env.example .env
```
Open up `.env` and fill in your details:
- `VITE_KINDE_*` — Your Kinde application credentials.
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` — Your Supabase project keys.
- *(Optional)* Add your Gemini or ElevenLabs API keys if you want to use the BYOK features.

### 3. Fire it up
```bash
npm run dev
```

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
| [`docs/product/PRD.md`](./docs/product/PRD.md) | Our core product requirements. |

**Important Note:**
- Please ignore the `legacy-docs/` folder—it's only there for historical context.
- Always ensure you are synced with the latest `main` branch.
- **Do not** introduce any branding outside of the approved Wise ecosystem.

---

## 📄 License

Copyright © The Wise Cloud. All rights reserved.  
Proprietary and confidential. Unauthorized use or distribution is prohibited.
