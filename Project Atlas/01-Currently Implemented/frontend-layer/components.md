# Components (`src/components/`)

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `src/components/`, `replit.md`.

**Canonical owner:** `src/components/` directory.

---

542 component files across 49 folders. Top-level subfolders are listed first; nested subfolders are listed under their parent.

## Top-level subfolders

| Folder | What's in it |
|---|---|
| `ai/` | Cross-page AI primitives (chat sheet, action buttons, fallback toasts). |
| `ai-studio/` | AI Studio sheet renderers (one per tool variant). |
| `applications/` | Job-application Kanban cards + modals. |
| `auth/` | Sign-in, sign-up, password-reset forms. |
| `brand/` | Logo / wordmark / theme-aware brand assets. |
| `career/` | Career advisor / assessment surfaces. |
| `cover-letter/` | Cover-letter editor + viewer. |
| `dashboard/` | WiseResume dashboard widgets. |
| `dev-kit/` | Admin DevKit panels (`/devkit`) — see critical-system 06. |
| `editor/` | Resume-editor sections (Experience, Skills, Education, Projects, …) + AgenticChatSheet. |
| `examples/` | `/examples` gallery. |
| `home/` | Landing-page sections (For Job Seekers / For Companies toggle). |
| `interview/` | Interview Coach surfaces (mic, transcript, CompanyBriefingSheet). |
| `landing/` | Marketing-page primitives (testimonials, hero, etc.). |
| `layout/` | App shell — `Header`, `Sidebar`, `Footer`, `WiseHireGuard`, `JobSeekerRoute`, `<FeatureGate>`. |
| `onboarding/` | 6-step WiseResume + 5-step WiseHire wizards. |
| `plan/` | Plan badges, upgrade CTAs, trial banners. |
| `portfolio/` | Public portfolio editor + viewer (note: `pf-*` CSS scope — do not touch). |
| `profile/` | Profile editor (avatar upload here). |
| `qr/` | QR-code surfaces (`/qr-code`, `/qr-batch`, `/qr-scan`). |
| `resignation/` | Resignation-letter editor + viewer. |
| `settings/` | Settings panels (theme, account, notifications). |
| `store/` | App-store screenshot generator (`/store-screenshots`). |
| `templates/` | Template gallery + preview + the resume templates themselves. |
| `ui/` | shadcn primitives (do not regenerate without checking — many have local edits). |
| `upload/` | Existing-resume upload + parse. |
| `wisehire/` | WiseHire-only components — see nested table. |

## Nested subfolders

| Parent | Subfolder | What's in it |
|---|---|---|
| `cover-letter/` | `templates/` | Cover-letter template renderers. |
| `dev-kit/` | `analytics/` | Dev-kit analytics widgets. |
| `editor/` | `ai/` | Editor-side AI primitives (e.g. `AIEnhanceSheet`). |
| `editor/` | `export/` | Editor PDF/print export UI. |
| `editor/` | `tailor/` | Tailor flow UI inside the editor. |
| `landing/` | `wisehire/` | WiseHire-specific landing sections. |
| `portfolio/` | `editor/` | Portfolio editor surfaces (auth-gated). |
| `portfolio/` | `public/` | Public portfolio renderer (uses `pf-*` CSS — do not touch). |
| `portfolio/` | `qr/` | QR surfaces inside the portfolio (share). |
| `settings/` | `sections/` | Per-section settings panels. |
| `templates/` | `shared/` | Shared template primitives + `prepareForCapture`. |
| `wisehire/` | `analytics/` | WiseHire analytics widgets. |
| `wisehire/` | `brief/` | Candidate-brief renderers. |
| `wisehire/` | `bulk-screen/` | Bulk-screen UI. |
| `wisehire/` | `dashboard/` | WiseHire dashboard widgets. |
| `wisehire/` | `jd-writer/` | JD writer flow. |
| `wisehire/` | `notes/` | Candidate notes UI. |
| `wisehire/` | `outreach/` | Outreach email flow. |
| `wisehire/` | `pipeline/` | Pipeline kanban. |
| `wisehire/` | `scorecard/` | Scorecard editor + viewer. |
| `wisehire/` | `talent-pool/` | Talent-pool surfaces. |

## `__tests__/` folders
`editor/__tests__/`, `interview/__tests__/`, `layout/__tests__/`, `portfolio/editor/__tests__/`, `portfolio/public/__tests__/`, `templates/__tests__/`, `templates/shared/__tests__/`. Per-feature Vitest specs live next to their components.

## Top-level component files
`ActionsPanel.tsx`, `AnimatedSplash.tsx`, `BiometricLockScreen.tsx`, `BugReportDialog.tsx`, `ErrorBoundary.tsx`.

## Hard rules
- Public portfolio uses CSS-isolated `pf-*` classes. Editing global Tailwind tokens can break public portfolios — verify against `src/components/portfolio/public/` styles before changing theme tokens. → `replit.md`.
- WiseHire components live under `src/components/wisehire/`. They must never be reused by WiseResume routes (account-type isolation). → Constitution §7.4.
- Template `<img>` tags inside `[data-resume-template]` (currently `CreativeTemplate`, `DesignerTemplate`) MUST set `crossOrigin="anonymous"` and MUST NOT use `loading="lazy"` (`replit.md` PDF capture rule).
- `ui/` is shadcn — many components have local edits; never blindly regenerate.
- The legacy `pwa/` subfolder no longer exists (PWA was removed — see `docs/ops/pwa-removal-verification.md`).
