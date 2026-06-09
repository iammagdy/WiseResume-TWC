# Wise AI Workspace Simplification

**Last verified:** 2026-06-09
**Type:** overview
**Sources:**
- `src/pages/AIStudioPage.tsx`
- `src/lib/aiStudioTools.ts`
- `src/components/layout/appSidebarNav.ts`
- `src/pages/__tests__/AIStudioPage.test.tsx`
**Canonical owner:** `src/pages/AIStudioPage.tsx`

---

## Summary

`/ai-studio` no longer behaves like a flat AI tool directory. It now presents Wise AI as a workflow-led workspace with:

- a compact workspace shell and simplified top copy;
- 6 primary workflow cards;
- 2 lower-emphasis secondary workflows;
- backward-compatible deep links for hidden tools;
- QR utilities removed from the AI Studio information architecture while keeping their dedicated routes alive.

No backend contracts, credits logic, auth flows, Appwrite Functions, schema, or provider routing changed in this pass.

## Visible AI Studio workflows

### Primary workflows

| Workflow | Primary route / launcher | Backing tools |
|---|---|---|
| Tailor for a Job | `/tailoring-hub` | `job-match`, `tailor`, `skills-gap`, `onepage` |
| Improve My Resume | `/ai-studio/enhance` | `enhance`, `recruiter`, `humanizer`, `ab-compare`, `onepage` |
| Prepare for Interview | `/interview` | `interview`, `company-briefing` |
| Company Briefing | `/ai-studio/company-briefing` | `company-briefing` |
| Cover Letter | `/cover-letters` | `cover-letters` |
| LinkedIn / Personal Brand | `/ai-studio/linkedin` | `linkedin`, `portfolio-bio`, `personal-branding` |

### Secondary workflows

| Workflow | Primary route / launcher | Backing tools |
|---|---|---|
| Career Plan | `/career` | `career` |
| Write Documents | `/resignation-letters` | `resignation-letters`, `reference-letter`, `cold-email` |

## Hidden tools report

These tools are still supported, but they are no longer shown as first-class cards in the main AI Studio grid.

| Tool | Tool ID | Direct link | Hidden under |
|---|---|---|---|
| Smart Tailor | `tailor` | `/ai-studio/tailor` | Tailor for a Job |
| Enhance | `enhance` | `/ai-studio/enhance` | Improve My Resume |
| 1-Page Wizard | `onepage` | `/ai-studio/onepage` | Improve My Resume |
| Humanize | `humanizer` | `/ai-studio/humanizer` | Improve My Resume |
| A/B Compare | `ab-compare` | `/ai-studio/ab-compare` | Improve My Resume |
| Recruiter Sim | `recruiter` | `/ai-studio/recruiter` | Improve My Resume |
| Skills Gap | `skills-gap` | `/ai-studio/skills-gap` | Tailor for a Job |
| Salary Coach | `salary-negotiation` | `/ai-studio/salary-negotiation` | Hidden only |
| Cold Email | `cold-email` | `/ai-studio/cold-email` | Write Documents |
| Rejection Analyzer | `job-rejection` | `/ai-studio/job-rejection` | Hidden only |
| Brand Statement | `personal-branding` | `/ai-studio/personal-branding` | LinkedIn / Personal Brand |
| Portfolio Bio | `portfolio-bio` | `/ai-studio/portfolio-bio` | LinkedIn / Personal Brand |
| Resignation Letter | `resignation-letters` | `/resignation-letters` | Write Documents |
| Reference Letter | `reference-letter` | `/ai-studio/reference-letter` | Write Documents |

## Removed from AI Studio IA but still reachable

These utilities were intentionally excluded from the AI Studio workspace and remain available on their own routes.

| Tool | Tool ID | Direct link | Status |
|---|---|---|---|
| QR Generator | `qr-code` | `/qr-code` | Excluded from AI Studio |
| Batch QR | `qr-batch` | `/qr-batch` | Excluded from AI Studio |
| QR Scanner | `qr-scan` | `/qr-scan` | Excluded from AI Studio |

## Compatibility notes

- Existing `/ai-studio/:tool` deep links still open the matching hidden tools.
- Recent-history storage still uses `wr-recent-ai-tools`.
- Hidden tools can still appear in the Recent strip without being reintroduced into the main grid.
- `job-match` remains the analytics-safe Tailoring Hub tool ID.
- `company-briefing` still opens through `/ai-studio/company-briefing`.

## Validation

- `npx tsc --noEmit`
- `npx vitest run src/pages/__tests__/AIStudioPage.test.tsx`
- `npm run build`
