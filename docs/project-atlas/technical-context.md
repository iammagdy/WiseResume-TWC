# WiseResume — Technical Context
*Last updated: 2026-05-16 | App version: 4.6.0*

## Stack Overview

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 6 + TypeScript |
| UI | Tailwind CSS + Radix UI / shadcn/ui |
| State | Zustand (local/session) + TanStack React Query (server) |
| Backend | Appwrite Cloud (Auth, Database, Storage, Realtime, Functions) |
| Deploy | Hostinger shared hosting via FTP (GitHub Actions) |
| Server | Express.js (`server/index.ts`) — **not deployed to Hostinger** |
| PDF Export | Puppeteer (via Express server) |
| AI | OpenRouter + Appwrite Function `ai-gateway` |

---

## Appwrite Configuration

**Endpoint:** `https://fra.cloud.appwrite.io/v1`
**Project ID:** `69fd362b001eb325a192`
**Database ID:** `main`

### Always Use COLLECTIONS.* Constants

Import from `@/lib/appwrite-collections`:
```ts
import { COLLECTIONS, DATABASE_ID } from '@/lib/appwrite-collections';
databases.listDocuments(DATABASE_ID, COLLECTIONS.resumes, [...]);
```

Never use string literals for collection IDs — they will silently break if a collection is renamed.

### Key Collections (User-Facing)

| Constant | Collection ID | Purpose |
|---|---|---|
| `COLLECTIONS.resumes` | `resumes` | Resume documents |
| `COLLECTIONS.resume_experiences` | `resume_experiences` | Work experience entries |
| `COLLECTIONS.resume_educations` | `resume_educations` | Education entries |
| `COLLECTIONS.resume_certifications` | `resume_certifications` | Certifications |
| `COLLECTIONS.profiles` | `profiles` | User profile / portfolio settings |
| `COLLECTIONS.user_preferences` | `user_preferences` | App preferences |
| `COLLECTIONS.notifications` | `notifications` | In-app notifications |
| `COLLECTIONS.job_applications` | `job_applications` | Job application tracker |
| `COLLECTIONS.cover_letters` | `cover_letters` | Cover letter documents |
| `COLLECTIONS.user_gamification` | `user_gamification` | XP, level, streaks |
| `COLLECTIONS.tailor_history` | `tailor_history` | Resume tailoring history |
| `COLLECTIONS.subscriptions` | `subscriptions` | Billing / plan data |
| `COLLECTIONS.ai_credits` | `ai_credits` | AI credit balance |

**Note:** `resume_skills` does NOT exist in the live DB. Skills are stored inline on resume documents.
**Note:** `migration-ledger` collection has hyphen in ID — access via `COLLECTIONS.migration_ledger` (normalized key with underscore).

### Storage Buckets

| Constant | Bucket ID | Purpose |
|---|---|---|
| `BUCKETS.avatars` | `avatars` | User profile photos, resume headshots |

### Appwrite Functions

Routed via `appwriteFunctions.invoke(fnName, options)` in `src/lib/appwrite-functions.ts`.

| Function Name | Routed To | Purpose |
|---|---|---|
| `ai-gateway` | `ai-gateway` | All AI feature calls (resume enhance, tailor, etc.) |
| `validate-coupon` / `redeem-coupon` | `coupons` | Billing coupon handling |
| `wisehire-*` | `wisehire-gateway` | WiseHire features (pre-launch) |
| `verify-share-password` | `public-share` | Password-protected resume sharing |
| `admin-*` / `inspect-ai-keys` | direct | Admin DevKit functions |

---

## Environment Variables

### Frontend (Vite — all must be prefixed `VITE_`)

| Variable | Required | Description |
|---|---|---|
| `VITE_APPWRITE_ENDPOINT` | Yes | Appwrite API endpoint (hardcoded in workflow: `https://fra.cloud.appwrite.io/v1`) |
| `VITE_APPWRITE_PROJECT_ID` | Yes | Appwrite project ID (hardcoded in workflow: `69fd362b001eb325a192`) |
| `VITE_SENTRY_DSN` | No | Sentry error tracking DSN (GitHub secret) |
| `VITE_DEV_KIT_PASSWORD` | No | DevKit admin panel password (GitHub secret) |
| `VITE_API_URL` | No | URL of the Express server for PDF export and OG images (GitHub secret) |
| `VITE_CODE_KEY` | No | Internal feature unlock key |
| `VITE_STORAGE_KEY` | No | Appwrite storage encryption key |

### `VITE_API_URL` — Critical Note

This variable points to the Express.js server (`server/index.ts`) which handles:
- `POST /api/export/pdf-native` — Puppeteer PDF generation
- `GET /og-image/:username` — Social OG preview image generation

**Hostinger does NOT run Node.js.** The Express server must be deployed separately (e.g., on a VPS, Railway, Render, or Fly.io). If `VITE_API_URL` is not set or the server is not reachable:
- PDF export falls back to browser print dialog
- OG image meta tags are present in HTML but the image URL returns 404

**To verify:** `curl -I {VITE_API_URL}/og-image/testuser` — should return `200 image/png`. If connection refused or 404, document as N/A in `audit-roadmap.md` finding #26.

---

## Deployment Architecture

```
GitHub Push → GitHub Actions
  ├── Build: npm run build (Vite, outputs to dist/)
  ├── Check bundle size (3MB JS limit)
  └── Deploy: lftp FTP sync to Hostinger
       ├── Large assets (tesseract/, pdfjs/) — only-newer
       └── App bundle (assets/, index.html) — delete stale
```

**Hostinger path:** `resume/` on the FTP server at `82.29.154.120`
**No server-side rendering.** 100% client-side SPA.
**No Node.js on Hostinger.** Express server must be on a separate host.

---

## State Management

### Zustand Stores

| File | Store Key (persistence) | Purpose |
|---|---|---|
| `src/store/resumeStore.ts` | `wr-resume-store` | Active resume edit state |
| `src/store/offlineSyncStore.ts` | `wr-offline-sync` | Offline mutation queue |
| `src/store/settingsStore.ts` | `wr-settings` | User app settings |
| `src/store/guidesStore.ts` | — (no persistence) | Guides list cache |
| `src/store/aiHealthStore.ts` | — (no persistence) | AI provider health status |
| `src/store/aiEnhancingStore.ts` | — (no persistence) | AI enhancement loading state |
| `src/store/atsScoreHistoryStore.ts` | `wr-ats-history` | ATS score history per resume |
| `src/store/chatTriggerStore.ts` | — (no persistence) | Wise AI chat open/close state |
| `src/store/contentLibraryStore.ts` | — (no persistence) | Content suggestion library |
| `src/store/sectionAIBridge.ts` | — (no persistence) | AI section enhancement bridge |

**Never rename persisted store keys** — it will wipe user state stored in localStorage.

### localStorage Key Registry

| Key Pattern | Set By | Read By | Purpose |
|---|---|---|---|
| `wr-offline-sync` | offlineSyncStore | offlineSyncStore | Offline mutation queue |
| `wr-dash-search` | DashboardPage | DashboardPage | Dashboard search persistence |
| `wr-dash-tab` | DashboardPage | DashboardPage | Dashboard active tab |
| `wr-onboarding-completed-{userId}` | OnboardingPage | DashboardPage | Onboarding completion flag |
| `wr-search-prefill` | Various | CommandPalette | Search prefill value |
| `wr-search-open` | CommandPalette | CommandPalette | Search open state |
| `wr-checklist-exported-{userId}` | ExportOptionsSheet (Phase 1.1 fix) | DashboardPage | Export step completion |
| `wr-checklist-dismissed-{userId}` | DashboardPage | DashboardPage | Checklist dismissed flag |
| `wr-changelog-seen-version` | BottomTabBar / useChangelogBadge | useChangelogBadge | Last seen changelog version |

**Never rename any key above** — users would lose their stored state silently.

### React Query Keys

Key format: `[queryKey, ...params]`. Common keys:

| Key | Hook | Data |
|---|---|---|
| `'me'` | `useProfile` | Current user profile |
| `'resumes'` | `useResumes` | Resume list |
| `'resume'` | `useResume` | Single resume by ID |
| `'notifications'` | `useNotifications` | Notification list |
| `'notifications-unread-count'` | `useUnreadNotificationCount` | Unread count |
| `'profile'` | `usePublicProfile` | Public portfolio profile |
| `'cover-letters'` | `useCoverLetters` | Cover letter list |
| `'job-applications'` | `useJobApplications` | Application list |
| `'app-settings'` | `useAppSettings` | App-wide settings |
| `'activity-streak'` | `useActivityStreak` | Login streak |

---

## Code Splitting

Uses `lazyWithRetry` wrapper around `React.lazy()` for route-level code splitting. All page components are lazy-loaded. Template renderers are lazy-loaded inside `MiniTemplateThumbnail` and `TemplateThumbnail`.

## Mobile Detection

```ts
import { useIsMobile } from '@/hooks/use-mobile';
const isMobile = useIsMobile(); // < 900px
const isMobile = useIsMobile(1024); // < 1024px (editor breakpoint)
```

## Important Patterns

### Never Do This
```ts
// ❌ String literal collection ID
databases.listDocuments('main', 'resumes', [...]);

// ❌ Hardcoded hex in component
style={{ color: '#fbbf24' }}

// ❌ Raw hex in Tailwind
className="text-[#fbbf24]"
```

### Always Do This
```ts
// ✅ Use COLLECTIONS constant
databases.listDocuments(DATABASE_ID, COLLECTIONS.resumes, [...]);

// ✅ Use semantic Tailwind token
className="text-primary"

// ✅ Use CSS variable
className="text-amber-400 dark:text-amber-300"
```
