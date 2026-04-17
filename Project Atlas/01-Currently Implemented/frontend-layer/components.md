# Components (`src/components/`)

**Last verified:** 2026-04-17
**Type:** reference card
**Sources:** `src/components/`, `replit.md`.

**Canonical owner:** `src/components/` directory.

---

Subfolders by surface:

| Folder | What's in it |
|---|---|
| `ai/` | Cross-page AI primitives (chat sheet, action buttons, fallback toasts) |
| `ai-studio/` | AI Studio sheet renderers (one per tool variant) |
| `applications/` | Job application Kanban cards + modals |
| `auth/` | Sign-in, sign-up, password-reset forms |
| `brand/` | Logo / wordmark / theme-aware brand assets |
| `career/` | Career advisor / assessment surfaces |
| `cover-letter/` | Cover letter editor + viewer |
| `dashboard/` | WiseResume dashboard widgets |
| `dev-kit/` | Admin Dev Kit panels (`/devkit`) — see critical-system 06 |
| `editor/` | Resume editor sections (Experience, Skills, Education, Projects, etc.) + AgenticChatSheet |
| `examples/` | `/examples` gallery |
| `home/` | Landing-page sections (For Job Seekers / For Companies toggle) |
| `interview/` | Interview Coach surfaces (mic, transcript, CompanyBriefingSheet) |
| `landing/` | Marketing-page primitives (testimonials, hero, etc.) |
| `layout/` | App shell — `Header`, `Sidebar`, `Footer`, `WiseHireGuard`, `JobSeekerRoute`, `<FeatureGate>` |
| `onboarding/` | 6-step WiseResume + 5-step WiseHire wizards |
| `plan/` | Plan badges, upgrade CTAs, trial banners |
| `portfolio/` | Public portfolio editor + viewer (note: `pf-*` CSS scope — do not touch) |
| `profile/` | Profile editor (avatar upload here) |
| `pwa/` | PWA install prompts + offline banners |
| `qr/` | QR code surfaces (`/qr-code`, `/qr-batch`, `/qr-scan`) |
| `resignation/` | Resignation letter editor + viewer |
| `settings/` | Settings panels (BYOK, theme, account) |
| `store/` | App-store screenshot generator (`/store-screenshots`) |
| `templates/` | Template gallery + preview |
| `ui/` | shadcn primitives (do not regenerate without checking — many have local edits) |
| `upload/` | Existing-resume upload + parse |
| `wisehire/` | WiseHire-only components (pipeline kanban, brief renderers, scorecards, masking UI) |

## Top-level component files

`ActionsPanel.tsx`, `AnimatedSplash.tsx`, `BiometricLockScreen.tsx`, `BugReportDialog.tsx`, `ErrorBoundary.tsx`.

## Hard rules
- Public portfolio uses CSS-isolated `pf-*` classes. Editing global Tailwind tokens can break public portfolios — verify against `src/components/portfolio/` styles before changing theme tokens. → `replit.md`.
- WiseHire components live under `src/components/wisehire/`. They must never be reused by WiseResume routes (account-type isolation). → Constitution §7.4.
