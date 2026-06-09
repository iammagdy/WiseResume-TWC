# AIStudioPage

**Last verified:** 2026-06-09
**Type:** reference card
**Sources:**
- `src/pages/AIStudioPage.tsx`
- `src/lib/aiStudioTools.ts`
- `src/AppInterior.tsx`
- `src/components/layout/appSidebarNav.ts`
**Canonical owner:** `src/pages/AIStudioPage.tsx`

---

**What it is:** The Wise AI workspace page. It now presents workflow-led entry points instead of the old flat AI tool directory, while keeping direct deep links for legacy tools.

**Route(s):**
- `/ai-studio`
- `/ai-studio/:tool`

**Where it lives:** `src/pages/AIStudioPage.tsx`

**Current visible IA:**
- Primary workflows: Tailor for a Job, Improve My Resume, Prepare for Interview, Company Briefing, Cover Letter, LinkedIn / Personal Brand
- Secondary workflows: Career Plan, Write Documents
- Hidden but reachable through direct links: Smart Tailor, Enhance, 1-Page Wizard, Humanize, A/B Compare, Recruiter Sim, Skills Gap, Salary Coach, Cold Email, Rejection Analyzer, Brand Statement, Portfolio Bio, Resignation Letter, Reference Letter
- Excluded from AI Studio: QR Generator, Batch QR, QR Scanner

**Compatibility notes:**
- `wr-recent-ai-tools` local storage remains supported
- Hidden tools can still appear in Recent
- `/ai-studio/company-briefing` remains valid
- non-AI QR routes remain available outside AI Studio

**Related:**
- Pages index: `Project Atlas/01-Currently Implemented/pages/README.md`
- Deep dive: `Project Atlas/01-Currently Implemented/critical-systems/10-ai-studio-and-agentic-chat.md`
- Implementation report: `Project Atlas/03-Implemented/wise-ai-workspace-simplification-2026-06-09.md`
