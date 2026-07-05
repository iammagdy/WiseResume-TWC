# WiseResume UI/UX Findings Matrix — 2026-06-26

Commit: `main` @ `ff22e245` · Mode: AUDIT ONLY · Method: static code inspection (no browser run)

Severity: P0 blocking · P1 major · P2 pre-polish-launch · P3 polish · Info = not-a-bug note
Vis = visual-only · Code = requires code change · Design = needs design clarification · BE = backend/Appwrite · Safe = fixable without product-logic change

| ID | Title | Route/Component | File(s) | Severity | Type | Viewports | Visual-only | Needs code | Design? | Backend? | Safe (no logic) | Verify? |
|----|-------|-----------------|---------|----------|------|-----------|-------------|-----------|---------|----------|-----------------|---------|
| M1 | `type:'spring'` easing (43× / 27 files) | app-wide | OnboardingPage, UploadPage, EnterprisePage, ChatWidget, ProfileImportSheet, PortfolioHistorySheet, HiredCelebrationModal, AIStudioTourModal, AIFloatingButton, SectionEmptyState, TailorProgress, EmptyState, BiometricLockScreen, SlideCaptcha, AuthVerifyEmailPage, ResumeListCard, CoverLetterCard, AnswerScoreSheet, landing demos, ui/floating-panel.tsx, ui/pull-to-refresh.tsx, portfolio/editor/shared.tsx, upload/UploadProgressSteps, upload/UploadErrorRecovery, landing/PortfolioDemo, landing/TrackerDemo, wisehire demos | P2 | Design-system/Motion | all | No | Yes | No | No | Yes | No |
| M2 | AppShell page transition `easeInOut 0.15` not ease-out-quart | all in-shell | layout/AppShell.tsx:164,176,200,212 | P3 | Motion | all | No | Yes | No | No | Yes | No |
| M3 | Spring/scale entrances not reduced-motion gated | Onboarding/Upload/celebration | OnboardingPage.tsx:677,1063; upload/UploadProgressSteps.tsx:50; upload/UploadErrorRecovery.tsx:162; dashboard/HiredCelebrationModal.tsx | P2 | A11y/Motion | all | No | Yes | No | No | Yes | Partial |
| M4 | Primitive components carry spring (cascades) | shared primitives | ui/floating-panel.tsx:15; ui/pull-to-refresh.tsx:117,123,126 | P2 | Motion | all | No | Yes | No | No | Yes | No |
| C1 | WiseHire landing/demos hardcode `#3B82F6`/`#1D4ED8` | WiseHire landing | landing/wisehire/* (WiseHirePricing, WiseHireFeatures, WiseHireDemoSection, JDDemo, PipelineDemo, OfferTrackerDemo, BulkScreeningDemo, TalentPoolDemo) | P2 | Design-system/Theming | all | Yes | Yes | No | No | Yes | dark-mode contrast |
| C2 | `WiseResumeHero` hardcodes `#9E1B22` bg (ring permitted) | `/` | landing/WiseResumeHero.tsx:148,161 | P3 | Design-system | all | Yes | Yes | Maybe | No | Yes | No |
| C3 | `EnterprisePage` hardcodes `#1D4ED8` button bg inline | `/enterprise` | wisehire/EnterprisePage.tsx:154,884,951,1033 | P2 | Design-system | all | Yes | Yes | No | No | Yes | No |
| AP1 | `border-left` color stripe on app-UI cards | Tailor/Notifications/Brief | TailorPage.tsx:1148,1546; NotificationsPage.tsx:139; wisehire/brief/BriefOutput.tsx:130; wisehire/scorecard/ScorecardView.tsx:88 | P2 | Anti-pattern | all | Yes | Yes | No | No | Yes | No |
| AP2 | `z-[9999]` violates semantic z-index scale | splash | components/AnimatedSplash.tsx:80 | P3 | Anti-pattern | all | No | Yes | No | No | Yes | No |
| AP3 | Glassmorphism `backdrop-filter: blur` decorative? | portfolio chat | portfolio/public/ChatWidget.tsx:206 | P3 | Anti-pattern | all | Yes | Maybe | Yes | No | Yes | Yes |
| O2 | Resume templates use `border-left` — BY DESIGN | templates | components/templates/* | Info | Not-a-bug | n/a | n/a | No | n/a | No | n/a | No |
| A1 | Icon-only button aria-label coverage | app-wide | non-primitive icon buttons | P2 | A11y | all | No | Yes | No | No | Yes | Yes |
| A2 | `aria-live` on AI/score async regions | AI Studio/Tailor/scores | AI sheets, score readouts | P2 | A11y | all | No | Yes | No | No | Yes | Yes |
| A3 | Keyboard-open mobile form states | all forms | auth/editor/settings forms | P2 | A11y/Responsive | mobile | No | Maybe | No | No | Yes | Yes |
| R1 | Mobile overflow on dense pages | Editor/TailorHub/Analytics/Pipeline | EditorPage, TailoringHubPage, AnalyticsPage, wisehire/PipelinePage, BulkScreenPage | P2 | Responsive | 320–430 | No | Maybe | No | No | Yes | Yes |
| IA1 | `/tailor` + `/tailoring-hub` + `/tailoring` clarity | navigation | AppInterior.tsx:387-392 | P2 | IA/Nav | all | No | Maybe | Yes | No | Yes | Yes |
| O1 | Output/result honesty + retry paths | export/AI results | Preview, Tailor result, AI sheets | P2 | Product/AI | all | No | Maybe | No | No | Yes | Yes |
| E1 | Empty/loading/error premium quality per-page | many | EmptyState, SectionEmptyState, per-page | P2 | States | all | Yes | Maybe | Maybe | No | Yes | Yes |
| T1 | Dark-mode contrast on hardcoded-hex WiseHire | WiseHire | landing/wisehire/* | P2 | Theming | all | Yes | Yes | No | No | Yes | Yes |
| P1 | Heavy surfaces perf/layout-shift | Editor/Analytics/Portfolio | EditorPage, AnalyticsPage, PortfolioEditorPage | P3 | Performance | all | No | Maybe | No | No | Yes | Yes |

## Counts by severity (code-grounded + flagged)

- **P0:** 0
- **P1:** 0
- **P2:** 13 (M1, M3, M4, C1, C3, AP1, A1, A2, A3, R1, IA1, O1, E1, T1) — *14 incl T1*
- **P3:** 5 (M2, C2, AP2, AP3, P1)
- **Info:** 1 (O2)

## Positives (maintain)

- `ui/button.tsx` — 44px targets, focus rings, active-scale, touch-manipulation (systemic).
- `ui/dialog.tsx` — z-50 semantic, Radix focus trap/Escape, 44px sr-only close, mobile-fit dvh.
- `AppShell` — skip-to-content, scroll restoration, `100dvh`, swipe-back, banner system.
- Route-level `Suspense` skeletons + `RouteEB` error boundaries on every route.
- No warm/cream backgrounds (grep clean). Cool-neutral discipline intact.
- AI-cost badges + tailoring honesty guardrail (product-trust positives).
- `tsc --noEmit` = 0 errors; full suite 673 passed / 0 failed.
