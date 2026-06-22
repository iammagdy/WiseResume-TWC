# 03 — Page-by-Page Findings

Format per finding: severity, area, page/component, user impact, evidence (file:line), root cause, recommended fix, risk, validation. Live/browser confirmation is **UNKNOWN** throughout (no browser run); each finding has a code-level root cause. Severities are the synthesizer's final call (a few agent severities were adjusted — noted inline).

---

# DASHBOARD & APP SHELL

## [P1] Dashboard tip rotation presents fabricated statistics as facts
Area: Trust / metrics integrity
Page / component: `DashboardStats` (tips array)
User impact: The product rule is "no fabricated metrics." The daily tips assert invented precise figures ("increases callbacks by 40%", "boost interview chances by 30%", "77% of hiring managers reject…", "25%…") that read as product-backed statistics.
Evidence: `src/components/dashboard/DashboardStats.tsx:209-229`.
Root cause: Static motivational copy hardcodes unsourced percentages.
Recommended fix: Cite a source or rephrase to non-numeric guidance ("Tailoring to each job tends to increase callbacks"). Keep precise percentages out of UI chrome unless computed from the user's own data.
Risk: None (copy).
Validation: No standalone fabricated percentage appears as a "fact" in tip cards.

> **Fake-data / premium-prompt verification (positive result):** Every *dashboard metric* is computed from real user data — ATS average, tailored-this-week, application matches, saved jobs, trend delta, sparkline, streak (`dashboardMetricsUtils.ts:7-151`, `DashboardMetricsStrip.tsx:88-142`, `DashboardStats.tsx:323-331`). AI recommendations derive from the real health score (`dashboardIntelligenceUtils.ts:36-167`). **No fabricated user metrics, no fake ATS scores, no fake activity.** Upgrade CTAs are correctly gated to free/unresolved plans only (`AppWorkspaceSidebar.tsx:78,311-323`; `DashboardWorkspaceProfileDialog.tsx:181`; `CreateResumeDialog.tsx:421,476-489`) — **premium/paid users are not shown upgrade prompts on the dashboard.** The only fabricated-numbers issue is the tip copy above.

## [P1] Empty-state dashboard drops the workspace search and AI intelligence rail
Area: App-shell cohesion / first-run
Page / component: `DashboardPage` empty branch
User impact: A brand-new user (who most needs orientation) gets a lesser shell — no ⌘K search entry (`DashboardTopCommandBar`) and no `DashboardIntelligencePanel`. The "workspace OS" feel only appears after the first resume exists, so first impressions read as a marketing splash bolted onto the shell.
Evidence: `src/pages/DashboardPage.tsx:779-802,840-843` (empty path) vs the `DashboardWorkspaceLayout` `else` branch at `:844-868`.
Root cause: Two divergent layouts gated on `showEmptyDashboard` instead of one frame with empty content.
Recommended fix: Keep the `DashboardWorkspaceLayout` frame (search + intelligence rail) for empty state too, swapping only the main column for the empty CTA; the rail can show "Run your first ATS scan" (`dashboardIntelligenceUtils.ts:42-51`).
Risk: Medium (restructures the empty render path).
Validation: New account at 1440px shows the same chrome as a populated account.

## [P1] Dashboard resume-list nested-scroll classes fight the CSS un-trap (<1280px)
Area: Mobile/tablet scrolling
Page / component: `DashboardPage` list + `DashboardWorkspaceLayout`
User impact: Risk of a double scrollbar or a trapped/dead inner scroll region on phones/tablets.
Evidence: `src/pages/DashboardPage.tsx:889,1029` (JSX `overflow-y-auto overscroll-y-contain`) vs `src/index.css:619-633` (only neutralizes via `overflow:visible` under `@media (max-width:1279px)`).
Root cause: Two competing overflow declarations on the same element; Tailwind utility (`@layer utilities`, single class) can win by source order over the component rule.
Recommended fix: Remove the JSX overflow utilities; set overflow only in CSS under `min-width:1280px`, leaving the mobile default genuinely `visible`.
Risk: Low.
Validation: 390px with 8+ resumes → single page scroll; 1440px → list still caps ~4 rows and scrolls internally.

## [P2] No persistent mobile section nav; single bottom-left FAB with no active indicator
Area: Primary navigation / mobile
Page / component: `AppMobileSidebarSheet`, `AppWorkspaceTopBar`
User impact: Switching top-level sections on phones requires the bottom-left Menu FAB → sheet; the current section isn't shown in always-visible chrome.
Evidence: `src/components/layout/AppMobileSidebarSheet.tsx:29-48`; `src/components/layout/AppWorkspaceTopBar.tsx:42-75` (no nav). Note: `showBottomNav` in `AppShell.tsx:78-80` is a misnamed boolean selecting the sidebar layout — there is no actual bottom tab bar.
Root cause: Desktop sidebar is the single nav source; mobile collapses it behind one FAB.
Recommended fix: Add a persistent bottom tab bar (or labeled top-bar entry) for 3-4 primary destinations <768px; reflect the active section.
Risk: Medium (new mobile chrome).
Validation: 390px — user can identify and reach the current section without opening the sheet.

## [P2] Bottom-left FAB overlaps the resume list
Area: Mobile dashboard
Page / component: `AppMobileSidebarSheet` over `DashboardPage`
Evidence: `AppMobileSidebarSheet.tsx:41-44` (fixed z-48) + `DashboardPage.tsx:1031` (`pb-1`).
Root cause: No reserved bottom inset for the global FAB.
Recommended fix: `pb-20` on the mobile list scroll container, or shift the FAB.
Risk: Low. Validation: 375px + selection mode → last card checkbox fully tappable.

## [P2] Collapsed sidebar hides membership/credits (crown-only)
Area: Collapsed sidebar / premium UX
Page / component: `AppWorkspaceSidebar`
User impact: Collapsing replaces the plan + AI-credits gauge with a single crown (billing only). Free users see nothing about credits; paid users lose the at-a-glance credit count.
Evidence: `AppWorkspaceSidebar.tsx:253-378` (full panel gated on `!effectiveCollapsed`) vs `:380-392` (crown only).
Recommended fix: Show a compact credit ring/number (or tooltip) in collapsed mode; surface the upgrade entry for free users.
Risk: Low. Validation: Collapse as free user with finite credits → credits still discoverable.

## [P2] "Tailored Resumes — This week" reads as data loss on a fresh week
Area: Metrics clarity (not fabrication — value is correctly computed)
Page / component: `DashboardMetricsStrip`
Evidence: `DashboardMetricsStrip.tsx:116-123`; `dashboardMetricsUtils.ts:116-125` (strict 7-day window).
Recommended fix: When weekly = 0 but tailored resumes exist, show "0 this week · N total".
Risk: None. Validation: With tailored resumes >7 days old, the card isn't a confusing bare 0.

## [P3] Duplicate "next step"/tip systems; likely-dead components
Area: Cohesion
Page / component: `WhatsNextCard`, `FeatureDiscoveryCard`, `DashboardIntelligencePanel`, `DashboardHero`
Evidence: `FeatureDiscoveryCard.tsx:7-33` vs `WhatsNextCard.tsx:30-55` (duplicated tip array + shared localStorage keys `feature-discovery-*`); "Recommended next step" appears in `DashboardHero.tsx:36` and `DashboardIntelligencePanel.tsx:156`. `WhatsNextCard`/`FeatureDiscoveryCard` do not appear imported by `DashboardPage` (likely dead).
Recommended fix: Single source of "next step"; delete unused cards.
Risk: Low. Validation: One "next step" surface per viewport.

## [P3] In-app sidebar logo routes to marketing `/`
Evidence: `AppWorkspaceSidebar.tsx:191-201` (`to="/"`). Recommended fix: route to `/dashboard`. Risk: Low.

## [P3] "No resumes match your search" shown when there is no search
Evidence: `DashboardPage.tsx:1042-1048` (terminal `else`). Recommended fix: default to "No resumes yet" when `!deferredSearch`. Risk: None.

## [P3] Two stacked greetings above the fold
Evidence: `DashboardWorkspaceToolbar.tsx:13-30` + `DashboardStats.tsx:335-345`. Recommended fix: keep one; tighten `mb-3`. Risk: None.

## [P3] Global search trigger only on the dashboard top bar (mobile)
Evidence: `DashboardTopCommandBar.tsx:49` (`hidden sm:inline-flex` ⌘K hint) vs `AppWorkspaceTopBar.tsx:42-75` (no search button). On non-dashboard routes there's no tap entry to the palette on mobile. Recommended fix: add a search icon to `AppWorkspaceTopBar`. Risk: Low.

> **Surface note:** The *populated* dashboard genuinely reads as a premium workspace OS (cohesive sidebar, glass top bar, tasteful amber Premium badge `index.css:866-873`, real metrics, AI rail). It feels less unified at the seams: the empty-state path loses search + rail, and mobile nav hides behind one FAB.

---

# RESUME EDITOR

## [P0] Editor workspace renders hardcoded-dark chrome in light mode
Area: Dark/Light correctness (corroborated independently by 2 agents — high confidence)
Page / component: `EditorPage` / `editor-workspace.css` (nav rail, header, section headers, preview toolbar, chips)
User impact: In **light mode** the editor chrome is permanently dark (dark header, crimson nav rail, dark panels) while the scroll area is light; rail text uses white-alpha (`hsl(0 0% 100% / 0.55-0.95)`) and `hsl(0 0% 96%)`, which is near-invisible the moment any element lands on a light surface. The primary working surface looks broken in light theme.
Evidence: `src/components/editor/editor-workspace.css:7-12` (dark-only `--editor-surface*`/`--editor-border`/`--editor-crimson`, no `.light` override), `:96-97` (rail gradient + `color: hsl(0 0% 96%)`), `:125-257` (white-alpha text/fills throughout); `src/pages/EditorPage.tsx:1197` (`editor-workspace-root bg-background`, no forced `dark`); the `index.css:663-667` patch only overrides `background`, never the `--editor-surface*` custom properties.
Root cause: Editor styled as a single-theme "premium dark workspace" with private tokens + white-alpha text, but mounted inside the themeable shell; no light token set.
Recommended fix: Define light values for `--editor-surface*`/`--editor-border`/`--editor-muted-fg` (or map them onto `--card`/`--muted`/`--border`) and replace `hsl(0 0% 100%/x)`/`#fff`/`hsl(0 0% 96%)` text with `hsl(var(--foreground)/x)`/`hsl(var(--muted-foreground))`; give the rail a light gradient. Alternatively, if a dark editor is intentional, force a `dark` class on `editor-workspace-root` so page + chrome are consistently dark.
Risk: Medium — most-used screen; re-test both themes.
Validation: `/editor` in light theme → rail/section headers/preview toolbar are not dark; text is legible.

## [P1] Preview/editor can render and export the WRONG resume from a stale store
Area: Correctness / data safety
Page / component: `PreviewPage`
User impact: Opening `/preview?id=B` while the Zustand store still holds resume A shows A (and the auto-export effect can fire) until async bootstrap swaps it in — risk of exporting the wrong person's resume.
Evidence: `PreviewPage.tsx:100-116` (`needsResumeBootstrap` true on id mismatch; `isPreviewReady` requires id match) but the page guard at `:252` only blocks when `!currentResume`, and the render at `:715-727` passes `currentResume` regardless of `isPreviewReady`. (Auto-export at `:200-227` *is* gated on `isPreviewReady` — so export is partly protected, but the visible render is not.)
Root cause: The visible template render isn't gated on `isPreviewReady`.
Recommended fix: While `needsResumeBootstrap && !isPreviewReady`, render `<TemplateSkeleton />` instead of `currentResume`.
Risk: Low (skeleton during the brief bootstrap window).
Validation: Store holding A, hard-navigate to `/preview?id=B` → skeleton until B loads (not A).

## [P1] "Improve with AI" is icon-only on mobile (no label/tooltip/aria-label)
Area: Discoverability + a11y
Page / component: `InlineAIButton` / `SectionAIAction`
Evidence: `InlineAIButton.tsx:171` (label `hidden sm:inline`), mobile button `:262-275` renders only the icon, no `aria-label`. Rendered via `EditorScrollForm.tsx:242-305` / `SectionCard.tsx:87-95`.
Recommended fix: `aria-label="Improve with AI"` + a short visible "AI" label or one-time coachmark.
Risk: Low. Validation: 390px — control is recognizable and SR-labeled.

## [P1] Preview bottom action bar can hide resume content (short screens)
Area: Responsive
Evidence: `PreviewPage.tsx:734` bar `pb-[calc(4rem+safe-area)]`; scroll container `:704` has no matching bottom padding.
Recommended fix: pad the scroll container to the bar height.
Risk: Low. Validation: 375×667, 2-page resume scrolls fully clear of the bar.

## [P1] Mobile "Export PDF" primary opens the options sheet, not a download; quick PDF buried
Evidence: `PreviewPage.tsx:745` primary opens `setShowExportSheet(true)`; quick button `:751` is `hidden sm:inline-flex`; quick PDF only in kebab `:794`.
Recommended fix: make the mobile primary a true one-tap Quick PDF, or relabel to "Export Options".
Risk: Low. Validation: tapping the primary at 390px matches its label.

## [P1] Mismatched input heights in Education (h-10 vs h-12)
Evidence: `EducationSection.tsx:262` (h-10) vs `:271` (h-12) in one grid; Institution `:250` h-12; MonthYearPicker `h-11`. Recommended fix: one shared height. Risk: Low.

## [P2] Desktop nav rail auto-collapses on every section change
Evidence: `EditorNavRail.tsx:80` (`useState(false)`), `:86-88` (`useEffect` resets `expanded` on `activeSection`), `:90-96` (collapse on click). Users can't keep labels visible. Recommended fix: persist preference; stop auto-collapsing. Risk: Low.

## [P2] 60-item Year `Select`, no typeahead
Evidence: `MonthYearPicker.tsx:21,149-151`. Recommended fix: typeahead/numeric input. Risk: Low.

## [P2] Collapsed entries truncate with no tooltip
Evidence: `EducationSection.tsx:221-226`, `ExperienceItem.tsx:140-146`. Recommended fix: add `title=`. Risk: Low.

## [P3] Static "ATS-Ready" badge ignores the template's real `atsScore`
Evidence: `PreviewPage.tsx:669-672` (static) vs `:858` (reads real `atsScore`). Recommended fix: drive badge from `templateAtsScore`. Risk: Low.

## [P3] Export branding/watermark not reflected in on-screen preview
Evidence: `PreviewPage.tsx:418,449,460-466` (export `showBranding:true`) with no preview-side indicator. Recommended fix: small "Exports include WiseResume footer" note. Risk: Low.

> **Surface note:** The editor is genuinely a **workspace**, not a stepper (scroll-spy form `EditorScrollForm.tsx:176-210`, resizable persisted split `EditorPage.tsx:1451`, live debounced preview, strong autosave reassurance `:887-907`, form max-width `42rem` so it doesn't over-stretch at 1920). What still reads "hand-assembled": the light-mode dark surfaces (P0), inconsistent field heights, the hidden mobile AI control, and the auto-collapsing rail.

---

# UPLOAD / IMPORT

## [P1] Import always creates a NEW resume — no dedupe / no in-flight guard
*(Agent rated P0; downgraded to P1 — the flow completes successfully, it just creates duplicates; no trap/crash.)*
Area: Data hygiene / correctness
Page / component: `UploadPage` `handleValidationContinue`
User impact: Re-importing the same file (back → re-import, or double-submit) unconditionally creates a second resume; user may later edit/export the wrong copy.
Evidence: `UploadPage.tsx:144-179` — `createResume.mutateAsync(...)` with no existence/duplicate check and no disable-while-pending.
Recommended fix: Check existing resumes by title/content fingerprint → "Open existing / Create copy"; at minimum disable the continue button while `createResume.isPending`.
Risk: Medium (fingerprint definition); the disable mitigation is trivial.
Validation: Import the same PDF twice → one resume or an explicit choice.

## [P2] Parse-recovery banner actions under-wired
Evidence: `UploadPage.tsx:380-394` — "Try a different file" does same-route `navigate('/upload')` without `clearError()`; "Fill in manually" only hides the banner (doesn't start a blank resume), contradicting its label. Compare the proper `UploadErrorRecovery` path `:410-418`.
Recommended fix: "Try a different file" → `clearError()` + reset; "Fill in manually" → start blank/navigate to editor.
Risk: Low. Validation: each banner action does what its label says.

---

# TAILORING HUB

## [P1] Mobile result content clipped behind the fixed action bar
Area: Responsive (CSS source-order bug)
Page / component: `TailoringHubResultPage` / `job-match-workspace.css`
User impact: On phones the bottom export links ("ATS PDF / Word / Open in editor / Create cover letter") and the resume footer sit under the fixed Back/Export bar with no way to reach them.
Evidence: `job-match-workspace.css:892-900` — the `@media (max-width:639px)` rule (`padding-bottom: 4.5rem + safe-area`, line 892) is overridden by a later equal-specificity `.jmw-result-body--compare { padding-bottom: 1.25rem }` (line 898); fixed bar at `:877`; mobile actions `TailoringHubResultPage.tsx:523-542`.
Root cause: Unconditioned rule appears after the media query → wins at all widths.
Recommended fix: Move the `1.25rem` rule above the media query, or scope the desktop override in `@media (min-width:640px)`.
Risk: Low (CSS reorder). Validation: 390px — last export link and footer clear the fixed bar; desktop unchanged.

## [P1] "No meaningful changes detected" guardrail framed as failure, no inline retry, credit consumed
Area: AI UX
Page / component: `TailoringHubPage`
User impact: A *successful, paid* AI run is presented as "Tailoring failed" text with no Retry/Edit-JD button; the user must scroll back to the sticky footer to re-press the CTA, and a credit was likely consumed. (This is the P2 the 2026-06-21 QA report logged — but the UX framing is the real issue.)
Evidence: `TailoringHubPage.tsx:389-399` (sets `tailorError` + toast, returns; `executeAI` ran at `:339`), text-only error block `:677-686`.
Root cause: Unchanged-output branch reuses the generic error panel (no buttons); the only retry path is the distant CTA.
Recommended fix: Render a distinct *warning* (not "failed") with inline actions — "Retry tailoring", "Edit job description" (focus the textarea) — and a credit-usage note. Do not change the guardrail logic; consider a one-time free retry server-side.
Risk: Low (UI only). Validation: vague/short JD → recoverable state with one-tap retry.

## [P2] `/tailor` legacy route renders the old TailorPage instead of redirecting
Evidence: `AppInterior.tsx:387` (`/tailoring`→`/tailoring-hub`) but `:388-389` (`/tailor`, `/tailor/:resumeId` still mount `TailorPage`, ~1,978 lines). Divergent parallel tailoring UI for old links/bookmarks.
Recommended fix: redirect `/tailor*` → `/tailoring-hub` (carry `resumeId`) if deprecated; else document why.
Risk: Medium (confirm no deep-links rely on TailorPage). Validation: hit `/tailor` → intended destination.

## [P3] Long-run: cancel hidden first 4s; "up to 2 min" reassurance appears late
Evidence: `JobMatchProgressStage.tsx:170-174` (4s cancel delay), `:117-122,248-254` (reassurance gated on `≥80% && >35s`). Recommended fix: show "1-2 minutes" from the start; reduce cancel delay to ~1.5s. Risk: Low.

> **Surface note:** Tailoring Hub reads as the **flagship** — command-center landing with stat cards + saved-jobs/history panels and proper empty states (`TailoringHubLanding.tsx:249-336`), dual paste/URL input with site detection (`JobInputArea.tsx:33-59`), a premium multi-phase progress stage, and a strong before/after story (score `before→after` + `+delta` pill, side-by-side compare, application bundle). The mobile clip and guardrail framing are the only things undercutting it.

---

# AI STUDIO

## [P1] Sticky composer collides with sticky header on mobile/tablet
Evidence: `AIStudioPage.tsx:433` (header `sticky top-0 z-50`), `:489` (composer `sticky top-0 z-30 lg:static`) — both stick at top:0 in one scroll container; z-50 header paints over the composer. Recommended fix: offset composer `top` by mobile header height, or one sticky element on mobile. Risk: Low-medium.

## [P2] No real first-run tour; orphaned `AIStudioTourModal` (dead code); tour Pro-gated
Evidence: `AIStudioPage.tsx:143-147` (gate), `:659-680` (one-line dialog); `ai-studio/AIStudioTourModal.tsx` imported nowhere. Recommended fix: wire the richer modal or delete it; reconsider Pro-only onboarding. Risk: Low.

## [P2] Conceptual duplicate tools (flag only)
Evidence: `aiStudioTools.ts:56` (`tailor` "Smart Tailor") + `:60` (`job-match` "Tailoring Hub") both under `parentWorkflowId:"tailor-for-job"`; `cover-letter` workflow `:116-126` wraps a navigate-only tool `:68`. Recommended fix: clarify labels so Smart Tailor (in-editor sheet) vs Tailoring Hub (workspace) don't read as duplicates. Risk: None (flag).

## [P3] Cost badge can crowd long workflow titles at 375px
Evidence: `AIStudioPage.tsx:373-378`. Recommended fix: `min-w-0` + `line-clamp` on title, or move badge to footer at xs. Risk: Low.

> **Surface note:** AI Studio is **not overloaded** — it deliberately presents 6 primary + 1 secondary workflow cards with individual tools demoted to backing chips (`aiStudioTools.ts:71-149`), and even advertises "one workspace, not a long list" (`AIStudioPage.tsx:540`). Issues are structural (sticky collision, thin tour) not tool-count.

---

# PORTFOLIO (public + editor)

## [P2] Password-set state can be stale (two sources of truth)
Evidence: `PortfolioEditorPage.tsx:1579` (`portfolioPasswordSet={!!passwordHash}` from the `portfolio_extras` mirror at `:276,319`) vs the authoritative `portfolio_settings` read only at save (`:909-917`); consumed in `MoreTab.tsx:375-385`. Cross-tab edits can show a misleading "Password is set."
Recommended fix: On editor load, seed `passwordEnabled`/`portfolioPasswordSet` from `portfolio_settings`, not the extras mirror.
Risk: Medium (password hydration). Validation: set password in tab A, open tab B → reflects correctly.

## [P2] Hero "Get in Touch" hidden when only LinkedIn is provided (inconsistent with sticky CTA)
Evidence: `PublicHero.tsx:87` computes a LinkedIn-fallback `contactHref` but the button at `:268` gates on `contactEmail` only; the page-level CTA `PublicPortfolioPage.tsx:307-311` does use the fallback.
Recommended fix: render the hero CTA from `contactHref`.
Risk: Low. Validation: portfolio with LinkedIn + no email → hero contact CTA appears.

## [P3] Duplicate dead component & duplicate import (hygiene)
- `AICreditsRow.tsx:9` (Settings) is never imported; live credits UI is inline in `AIEngineSection.tsx:34-52`. Recommended fix: delete or wire.
- `SetupTab.tsx:2` and `:10` both import `getPortfolioDisplayUrl` from `@/lib/portfolioUrl` (redundant duplicate import). **Correction to agent claim:** this does **not** break the build — `tsc --noEmit` and `vite build` both passed (exit 0) in this audit. Downgraded to P3 hygiene; remove line 2.

> **Domain-consistency check (positive result):** The public portfolio presents **`wiseresume.app`** as primary — `getPortfolioDisplayUrl`/`getPortfolioCanonicalUrl`/`getAppUrl` resolve to `wiseresume.app` (`portfolioUrl.ts:35-47`); editor StatusBar/Setup/QR/Visitors + the public footer (`PublicPortfolioPage.tsx:680`) use canonical helpers; short links use `CANONICAL_PORTFOLIO_ORIGIN`. The only `resume.thewise.cloud` reference is a backward-compat fallback in `DOMAIN_MAP` (`portfolioUrl.ts:18`), never surfaced as branding. **Clean.** Separately, the **WiseHire/Enterprise** surfaces do present `thewise.cloud` as the brand domain (`EnterprisePage.tsx:997`, `PublicBriefPage.tsx:89`, `WiseHireShell.tsx:107`) — flagged for product confirmation (likely intentional product separation), not a WiseResume defect.

---

# SETTINGS

## [P2] No login entry to the implemented "Claim Your Account" migration flow
Evidence: `AuthPage.tsx:23` (`'claim-account'` type), rendered `:238-246`, but `:56-63` only maps `mode=signup|login`; no `?mode=claim` handler or button. Migrated users can't reach it.
Recommended fix: add a `mode==='claim'` branch + a "Migrated? Claim your account" link.
Risk: Low. Validation: `/auth?mode=claim` renders the claim view.

## [P3] SettingsProfileHero plan CTA vertical misalignment
Evidence: `SettingsProfileHero.tsx:58` (`mt-2` on the button inside an `items-center` row at `:54`). Recommended fix: remove `mt-2`. Risk: None.

---

# AUTH / PRICING / ONBOARDING

## [P1] Premium users see "Upgrade" CTAs on the Free/Pro pricing cards
Area: Premium-free UX
Page / component: `PricingPage` per-plan CTA
User impact: A Premium subscriber on `/pricing` sees "Upgrade" on Free and Pro cards (a downgrade framed as an upgrade), routing to `/subscription`.
Evidence: `PricingPage.tsx:41-45` — `ctaLabel` returns "Current Plan" only for the matching plan, else "Upgrade"; no plan-rank awareness.
Root cause: No notion of plan rank (free < pro < premium).
Recommended fix: Rank plans; below current → disabled "Included"/no CTA; only strictly-higher → "Upgrade". For premium users, disable Free/Pro CTAs.
Risk: Low (label/disabled logic). Validation: premium user → Free/Pro cards don't say "Upgrade".

## [P2] Register / forgot / claim show failures only via transient toast (no inline error)
Evidence: `AuthPage.tsx:121-161` (register uses `toast.error` only), `:248-279` (no `aria-describedby`/error element) — contrast the correct login pattern at `:183-214`.
Recommended fix: add a persistent `role="alert"` error line per form (mirror login).
Risk: Low. Validation: register failure → announced, persistent error.

## [P3] Pricing "Recommended" Pro card loses its scale lift on desktop
Evidence: `PricingPage.tsx:82` (`scale-[1.02] sm:scale-100`) with grid `sm:grid-cols-3` `:70` — the emphasis is dropped exactly where the three cards are compared side-by-side. Recommended fix: keep `sm:scale-[1.03]` / `sm:-translate-y-2`. Risk: None.

## [P3] Onboarding "Skip" visible on the Welcome step
Evidence: `OnboardingPage.tsx:506-510` (Skip shown on every non-terminal step incl. Welcome). Recommended fix: hide Skip on `welcome`. Risk: Low.

> **Auth surface note (positive):** Auth/verification flows are robust — inline `role="alert"` login errors, plan-intent persistence via sessionStorage + signup banner, scanner-safe "click to verify" gating, resend cooldown. The portfolio public page handles malformed data defensively (`safeHref` on links, filtered empty sections, bot-obfuscated email, "Anonymous" fallback) and the password gate is mobile-appropriate (`max-w-sm`, autofocus).
