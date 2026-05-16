# WiseResume — UI/UX Audit Roadmap
*Audit date: 2026-05-16 | App version: 4.6.0*

## Status Key

| Status | Meaning |
|---|---|
| `done` | Already implemented in codebase |
| `implement` | Approved, pending implementation |
| `verify-first` | Must verify actual behavior before implementing |
| `n/a` | Finding was incorrect or already resolved |
| `deferred` | Valid finding, out of scope for this sprint |
| `partial` | Partial fix applied; root cause deferred |

---

## Full Findings Mapping Table

| # | Finding | Status | Phase | File(s) | Risk |
|---|---|---|---|---|---|
| 1 | Export checklist step (`wr-checklist-exported-*`) never written anywhere | `implement` | 1.1 | `ExportOptionsSheet.tsx`, `DashboardPage.tsx` | Low |
| 2 | `AchievementToast.tsx` uses hardcoded hex colors — breaks in light mode | `implement` | 1.2 | `AchievementToast.tsx` | Low |
| 3 | `NotificationsPage.tsx` shows no toast after markAllAsRead — no user feedback | `implement` | 1.3 | `NotificationsPage.tsx`, `useNotifications.ts` | Low |
| 4 | Referral stats cards hardcode `value: 0` — looks broken, not "coming soon" | `implement` | 1.4 | `ReferralPage.tsx` | Low |
| 5 | FAB and DesktopNav button label says "Ask" — should be "Wise AI" | `implement` | 1.5 | `AppShell.tsx`, `DesktopNav.tsx` | Low |
| 6 | BottomTabBar: double notification signaling (dot on More button + numeric badge in sheet) | `implement` | 1.6 | `BottomTabBar.tsx` | Low |
| 7 | ShortcutHelpSheet lists shortcuts with no scope context (editor-only vs global) | `implement` | 1.7 | `ShortcutHelpSheet.tsx` | Low |
| 8 | More menu `grid-cols-4` cramped on mobile; no visual grouping between items | `implement` | 1.8 | `BottomTabBar.tsx` | Low |
| 9 | `sonner.tsx` uses `role="status"` — should be `role="log"` for a toast stream | `implement` | 1.9 | `sonner.tsx` | Low |
| 10 | FAB may overlap last list item on some pages (ApplicationsPage, CoverLettersPage) | `verify-first` | 1.10 | `appShellLayout.ts` | Low |
| 11 | Dashboard shows large hero for returning users — resume list pushed below fold on mobile | `implement` | 2.1 | `DashboardPage.tsx` | Medium |
| 12 | EditorPage has no breadcrumb navigation | `implement` | 2.2 | `EditorPage.tsx`, `Breadcrumb.tsx` | Low |
| 13 | TailorPage uses `navigate(-1)` directly — may fail on direct load or after refresh | `verify-first` | 2.3 | `TailorPage.tsx`, `navigation.ts` | Low |
| 14 | ApplicationsPage `<h1>` says "My Activity", inner tab says "My Applications" | `implement` | 2.4 | `ApplicationsPage.tsx` | Low |
| 15 | Long resume names overflow breadcrumb on mobile | `implement` | 2.5 | `Breadcrumb.tsx` | Low |
| 16 | No ErrorBoundary around `MiniTemplateThumbnail` — template crash takes down card | `implement` | 3.1 | `ResumeListCard.tsx`, `EmptyState.tsx` | Low |
| 17 | `TemplatesPage.tsx` `as any` cast on preview data can cause silent crash in sheet | `partial` | 3.2 | `TemplatesPage.tsx` | Low |
| 18 | Thumbnail in ResumeListCard is `h-[54px]` — 2px off A4 aspect ratio (should be 56px) | `implement` | 3.3 | `ResumeListCard.tsx` | Low |
| 19 | All MiniTemplateThumbnails render at mount — paint jank on large resume lists | `implement` | 3.4 | `MiniTemplateThumbnail.tsx` | Low |
| 20 | EmptyState carousel auto-rotation uses `setInterval` without `useReducedMotion()` check | `implement` | 3.5 | `EmptyState.tsx` | Low |
| 21 | AuthPage register form has no password hint — users submit weak passwords | `implement` | 4.1 | `AuthPage.tsx` | Low |
| 22 | TailorPage custom instructions textarea has no character limit or counter | `implement` | 4.2 | `TailorPage.tsx` | Low |
| 23 | OnboardingChecklist dismiss button has no `aria-label` | `implement` | 4.3 | `OnboardingChecklist.tsx` | Low |
| 24 | Focus drops to document body when checklist is dismissed | `implement` | 4.3 | `OnboardingChecklist.tsx` | Low |
| 25 | OnboardingChecklist dismiss button text "Dismiss" is abrupt — should be "Got it" | `implement` | 4.4 | `OnboardingChecklist.tsx` | Low |
| 26 | OG image endpoint (`/og-image/:username`) assumed reachable — Hostinger has no Node server | `verify-first` | — (deferred) | `server/index.ts` | — |
| 27 | `portfolioEnabled` field mapping — audit suggested possible mismatch | `n/a` | — | — | — |
| 28 | ExportProgressBar `AlertCircle` missing size class | `n/a` | — | — | — |
| 29 | TemplatesPage type-safe preview (root cause: `as any` data type mismatch) | `deferred` | — | `TemplatesPage.tsx` | — |

---

## Phase 0 — Documentation
**Status:** Complete (this sprint)

Created:
- `/docs/project-atlas/design-system.md`
- `/docs/project-atlas/mobile-ux-priorities.md`
- `/docs/project-atlas/audit-roadmap.md` (this file)
- `/docs/project-atlas/technical-context.md`

---

## Phase 1 — Mobile & Trust Quick Wins
**Status:** Pending | Findings: #1–10

All are isolated single-file changes. No new API calls or data schema changes.

---

## Phase 2 — Navigation & Dashboard Polish
**Status:** Pending | Findings: #11–15

Dashboard change (2.1) has medium complexity — hero collapse for returning users.
Breadcrumb addition (2.2) requires extending `Breadcrumb.tsx` with optional `links` prop.
Back navigation (2.3) requires verification of 3 entry scenarios before implementing.

---

## Phase 3 — Stability & Performance
**Status:** Pending | Findings: #16–20

All low-risk. ErrorBoundary addition is the most impactful for stability.
IntersectionObserver (3.4) improves paint performance on large resume lists.

---

## Phase 4 — Forms, Copy & Fine Polish
**Status:** Pending | Findings: #21–25

All extremely low-risk, mostly text and ARIA attribute additions.

---

## Phase 5 — Deferred

| Finding | Why Deferred | Owner Action Required |
|---|---|---|
| OG image / VITE_API_URL (#26) | Hostinger has no Node server. Verify if Express is deployed separately. | Check production: `curl -I {VITE_API_URL}/og-image/testuser` |
| Real referral stats (#29 equivalent) | Requires `referred_by` Appwrite attribute + index via Console | Appwrite Console → Database → profiles collection → Add attribute |
| Thumbnail server pipeline | Requires Appwrite Function + storage bucket | Schema design session |
| Full WCAG AA audit | Out of scope | Future dedicated a11y sprint |
| Dashboard personalization | Major new feature | Product planning |
| Notification center overhaul | Requires new Appwrite attributes | Schema design session |
| LinkedIn import | Legal/ToS review required | Legal review first |
| E2E Playwright tests | Needs GitHub secrets | Add `TEST_USER_EMAIL` + `TEST_USER_PASSWORD` to repo secrets |
| Hook waterfall consolidation | Needs new Appwrite Function + benchmarking | Architecture session |

---

## Updating This Document

After each phase is implemented:
1. Change status of completed findings from `implement` → `done`
2. Note completion date in parentheses: `done (2026-05-XX)`
3. Move any findings that became inapplicable to `n/a` with reason
4. Update `Project Atlas/CHANGELOG.md` with dated entry
