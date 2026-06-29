# WiseResume / WiseHire — The Wise Cloud

## Project Overview
An AI-powered career platform with two products:
- **WiseResume**: AI resume builder with agentic chat, ATS scanning, tailoring, cover letters, and PDF export.
- **WiseHire**: Recruiter tools including candidate pipeline, bulk screening, JD writing, and talent pool search.

## Tech Stack
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui (Radix UI)
- **State**: Zustand + TanStack Query
- **Backend**: Express server (port 5001) — Puppeteer PDF export, SSRF-hardened URL proxy, portfolio view tracking
- **Auth & DB**: Appwrite (cloud) — auth, database, and serverless functions
- **AI**: AI calls routed through Appwrite Functions (ai-gateway); never called directly from browser

## Running the App
- Frontend (Vite): port 5000
- API server (Express): port 5001
- Both started together via the "Start application" workflow

## Key Environment Variables
- `VITE_APPWRITE_ENDPOINT` — Appwrite cloud endpoint (set in .replit userenv)
- `VITE_APPWRITE_PROJECT_ID` — Appwrite project ID (set in .replit userenv)
- `DATABASE_URL` — PostgreSQL connection string (Replit-managed)
- `API_PORT` — Express server port (5001)
- `PUPPETEER_SKIP_DOWNLOAD` / `SKIP_PUPPETEER_CHROME` — skip Puppeteer Chrome download in dev

## Architecture Notes
- AI calls go through Appwrite Functions (server-side), never directly from the browser
- No AI API keys are exposed via `VITE_*` env vars
- Server-side `server/db.ts` uses Drizzle ORM with the Replit PostgreSQL database
- PDF export uses Puppeteer on the Express server
- SSRF hardening on the `/api/fetch-url` proxy endpoint
- Localization catalogs live in `locales/en` and `locales/ar`; `LocaleProvider` owns UI locale, HTML direction, local persistence, and signed-in preference synchronization.
- Public Arabic URLs use `/ar/...`; authenticated routes are not prefixed. Each resume separately stores `customization.documentLocale`.
- Arabic PDF and cover-letter export uses Chromium with bundled Noto Sans Arabic. Arabic DOCX uses RTL document/run properties, and Arabic LaTeX targets XeLaTeX while English remains pdflatex.
- Page cuts are keyed by template, page format, document locale, fonts, and scale. Legacy page cuts are English-only fallback data.

## User Preferences
- Keep existing code structure and patterns
- Use Appwrite for auth and database (not Supabase/Firebase)
