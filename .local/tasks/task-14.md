---
title: WiseHire Phase 3 — Bug Fix & Spec Compliance
---
# WiseHire Phase 3 — Bug Fix & Spec Compliance

  ## What & Why

  The WiseHire Phase 3 implementation (landing page toggle + full theme switch) was delivered with 15 confirmed issues spanning spec violations, functional bugs, visual regressions, and governance gaps. This task fixes every finding so Phase 3 meets the spec and constitution before Phase 4 (waitlist backend) begins.

  ## Done looks like

  - Toggle strip reads **"For Job Seekers"** and **"For Companies"** (matching spec FR-001 and BRANDING.md exactly)
  - WiseHire mode shows the correct section order: Hero → Trust/Social Proof → Feature Ticker → Demo → Features → Pricing → Footer
  - Aurora background animation displays **WiseHire teal/blue tones** in WiseHire mode (not red) and red tones in WiseResume mode — the mode prop is passed to AuroraBackground
  - "See it in action" demo pane is never empty — all three demo tabs (Brief Generator, Pipeline Board, JD Writer) are visible immediately on first render without needing to scroll
  - BriefDemo score dial **loops** — resets and re-animates every ~5 seconds
  - PipelineDemo kanban **loops** — once all cards reach the Offer column they reset to their starting positions and the cycle begins again
  - JDDemo typewriter **loops** — after completing the JD it pauses and restarts from the top
  - All four WiseHire pricing tiers show an **"Early Access"** badge; the Professional tier additionally shows a "Most Popular" label below the badge (not in place of it)
  - Clicking **"Pricing"** in the nav while in WiseHire mode scrolls smoothly to the inline WiseHire pricing section on the landing page (not routing to the WiseResume /pricing page)
  - Any loading spinner visible in WiseHire context uses **WiseHire blue** (#1D4ED8), not crimson
  - WiseHire Trust section uses **HR-appropriate social proof** ("teams hiring smarter" copy, company/recruiter trust signals — no job-seeker logos)
  - WiseHire Feature Ticker shows **WiseHire feature names** (Brief Generator, JD Writer, Pipeline Board, Bulk Screening, Talent Pool) instead of WiseResume features
  - FeatureNumberedNav active state uses **`var(--lp-brand)`** CSS variable (switches correctly in both modes; no hardcoded crimson rgba)
  - The Index.tsx comment typo ("WISERESUEME") is corrected
  - `npm run test` is run after all changes; any failures are reported or fixed

  ## Out of scope

  - Phase 4 waitlist backend (T033–T040) — WaitlistModal remains a UI stub
  - WiseHire app pages (dashboard, onboarding, brief generator, pipeline board — all Phase 5+)
  - Mobile responsiveness of WiseHire (deferred to Phase 3 per Decision #8 — but the landing page toggle must not break at common mobile widths)

  ## Tasks

  1. **Fix toggle labels** — Change the LandingToggle button labels from "Job Seeker"/"Hiring / HR" to "For Job Seekers"/"For Companies" to match BRANDING.md and spec FR-001.

  2. **Fix Aurora background color in WiseHire mode** — Pass the current `mode` state down to AuroraBackground (or promote it to accept a `colorScheme` prop). In WiseHire mode use teal/blue color stops (`#0D2E6E`, `#1D4ED8`, `#38BDF8`); in WiseResume mode keep the existing red stops.

  3. **Fix "See it in action" demo section visibility** — Remove the `lp-animate` wrapper from the outermost flex container in WiseHireDemoSection so the demo pane is visible immediately on scroll without requiring the IntersectionObserver to fire. Keep `lp-animate` only on the heading block.

  4. **Add WiseHire Trust / Social Proof section** — Create `src/components/landing/wisehire/WiseHireTrustSection.tsx`: a compact strip of HR-specific trust signals ("teams trust WiseHire to hire smarter" copy, logo placeholders or word-based badges). Insert it in Index.tsx between WiseHireHero and WiseHireDemoSection.

  5. **Add WiseHire Feature Ticker** — Either extend the existing FeatureTicker to accept a custom items prop or create `WiseHireFeatureTicker.tsx`. Show the five WiseHire pillars (Brief Generator · JD Writer · Pipeline Board · Bulk Screening · Talent Pool). Insert it in Index.tsx between WiseHireTrustSection and WiseHireDemoSection.

  6. **Fix demo replay loops** — Update BriefDemo to reset score to 0 and restart the animation every ~5 s. Update PipelineDemo to reset all cards to initial column positions when all 7 reach column 3, then restart the advance cycle. Update JDDemo to clear the displayed lines and restart the typewriter 2 s after it finishes.

  7. **Fix WiseHire pricing badge** — On the Professional tier, keep the "Early Access" badge at the top and add a secondary "Most Popular" label beneath it (or style both on the same card) so no tier ever lacks "Early Access".

  8. **Fix the Pricing nav link in WiseHire mode** — In WiseHire mode the "Pricing" nav `<Link>` should smooth-scroll to the WiseHire pricing section on the page instead of navigating to `/pricing`. Add an `id="wisehire-pricing"` to WiseHirePricing and conditionally change the link behaviour based on mode.

  9. **Fix loading spinner color in WiseHire context** — Identify every spinner that can appear while in WiseHire mode (WaitlistModal Loader2, any auth-loading skeleton) and ensure they use WiseHire blue rather than inheriting the crimson primary token. If MiniSpinner is used in WiseHire context, pass an explicit `color` override or gate on the product CSS variable.

  10. **Fix FeatureNumberedNav hardcoded crimson** — Replace the two inline `rgba(158,27,34,...)` color values with `var(--lp-brand)` so the active state correctly switches when mode changes (even though the nav only shows in WiseResume mode, it should honour the variable system).

  11. **Fix comment typo and run tests** — Correct "WISERESUEME" to "WISERESUEME" → "WISERESUEME" correction in Index.tsx comment. Run `npm run test` and fix or report any failures. Update CHANGELOG.md with this fix pass entry.

  ## Relevant files

  - `src/components/landing/LandingToggle.tsx`
  - `src/components/landing/AuroraBackground.tsx`
  - `src/components/landing/Aurora.tsx`
  - `src/components/landing/wisehire/WiseHireDemoSection.tsx`
  - `src/components/landing/wisehire/BriefDemo.tsx`
  - `src/components/landing/wisehire/PipelineDemo.tsx`
  - `src/components/landing/wisehire/JDDemo.tsx`
  - `src/components/landing/wisehire/WiseHirePricing.tsx`
  - `src/pages/Index.tsx:267-320,381-815`
  - `project-governance/BRANDING.md`
  - `project-governance/CHANGELOG.md`