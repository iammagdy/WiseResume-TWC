

# Reducing Feature Overwhelm: Discoverability Improvements

## The Problem

The app has 15+ AI tools, 5 bottom tabs, multiple dashboard cards (WhatsNextCard, FeatureDiscoveryCard, DashboardStats with tips, QuickActionChips, trust banner), onboarding modals, tour modals, discovery dots, intro tooltips, NextStepBanners, and pro tips -- all competing for attention. A new user lands on the dashboard and is hit with:

1. Trust banner
2. WhatsNextCard (suggested action)
3. FeatureDiscoveryCard ("Did you know?")
4. DashboardStats with inline daily tip
5. QuickActionChips row (3 buttons)
6. Discovery dots pulsing on AI Tools + Portfolio tabs
7. Eventually: AIStudioTourModal, AIIntroTooltip, NextStepBanners

This creates "notification fatigue" where users tune out everything rather than engaging with any single prompt.

---

## Proposed Changes

### 1. PROGRESSIVE DISCLOSURE -- Stagger Hints Over Time

**Problem:** Multiple discovery mechanisms fire simultaneously on first use.

**Fix:** Introduce a simple `DiscoveryManager` utility that gates hints based on session count and resume count. Only one "discovery surface" shows per session.

- Session 1-2: Only WhatsNextCard (core CTA)
- Session 3: FeatureDiscoveryCard appears
- Session 4+: Discovery dots on tabs activate
- AIStudioTourModal: only on first AI Studio visit (already correct)
- NextStepBanners: only after completing their trigger action (already correct)

**Files:**
- Create `src/lib/discoveryManager.ts` (~40 lines) -- reads/writes session count from localStorage, exposes `shouldShow(feature: string): boolean`
- Edit `src/pages/DashboardPage.tsx` -- wrap FeatureDiscoveryCard in discovery gate
- Edit `src/components/layout/BottomTabBar.tsx` -- wrap discovery dots in discovery gate

### 2. MERGE REDUNDANT DASHBOARD CARDS

**Problem:** WhatsNextCard, FeatureDiscoveryCard, and the inline daily tip in DashboardStats all compete for the same "nudge the user" role. Three nudge surfaces above the actual resume list push content below the fold.

**Fix:** Merge FeatureDiscoveryCard into WhatsNextCard as a secondary state. When there is no "next step" to suggest (user has resumes, has tailored, has practiced), WhatsNextCard falls back to showing a rotating feature discovery tip instead. Remove the standalone FeatureDiscoveryCard from the dashboard.

**Files:**
- Edit `src/components/dashboard/WhatsNextCard.tsx` -- add feature discovery fallback when no step is computed
- Edit `src/pages/DashboardPage.tsx` -- remove `<FeatureDiscoveryCard />` import and rendering
- Delete or deprecate `src/components/dashboard/FeatureDiscoveryCard.tsx`

### 3. SIMPLIFY AI STUDIO -- ADD "RECOMMENDED FOR YOU" SECTION

**Problem:** AI Studio shows 14 tools in a flat 4-category grid. New users don't know which tool to start with and are overwhelmed by choice.

**Fix:** Add a "Recommended" row at the top that shows 2-3 tools contextually based on user state:
- No tailored resume yet: show "Smart Tailor"
- Resume score below 40: show "Enhance"
- Never proofread: show "Proofread"
- Has interviews coming (or never tried): show "Interview Prep"

This gives a clear starting point without removing any tools.

**Files:**
- Edit `src/pages/AIStudioPage.tsx` -- add a `useMemo` that computes 2-3 recommended tools based on resume data, render them as a highlighted row above the categories

### 4. CONTEXTUAL TOOL SURFACING IN EDITOR

**Problem:** Users editing their resume don't know about relevant AI tools unless they switch to the AI Studio tab. The editor had an `AIAssistantBar` that was removed.

**Fix:** Add a lightweight "AI suggestion chip" that appears at the bottom of the editor (above the tab bar) only when contextually relevant:
- After editing 3+ sections: "Try Proofread to catch errors"
- After first save: "Match this to a job with Smart Tailor"
- These use the existing `NextStepBanner` component (already built for this purpose)

This is already partially implemented via `NextStepBanner` but the `variant="tailor"` banner only triggers after editing. Ensure the trigger conditions are reliable.

**Files:**
- Edit `src/pages/EditorPage.tsx` -- verify NextStepBanner render conditions, add proofread variant trigger after 3+ section edits

### 5. SIMPLIFY ONBOARDING GOAL TO ACTION MAPPING

**Problem:** The onboarding collects a goal (land a job, update resume, explore templates) but doesn't visibly use it afterward. The dashboard looks the same regardless of goal.

**Fix:** Use the stored goal to customize the WhatsNextCard suggestion:
- "Land a new job" goal: prioritize "Smart Tailor" as first suggestion
- "Update my resume" goal: prioritize "Enhance" or "Proofread"
- "Explore templates" goal: prioritize "Browse Templates"

**Files:**
- Edit `src/components/dashboard/WhatsNextCard.tsx` -- read `localStorage.getItem('wr-onboarding-goal')` and factor it into the step selection logic

### 6. ADD A "WHAT CAN I DO?" QUICK HELP ENTRY POINT

**Problem:** The Settings > Help section has Documentation (coming soon) and Keyboard Shortcuts, but no quick way to see what features exist from the dashboard or editor.

**Fix:** Add a small "?" floating button (or integrate into the existing profile popover) that opens a minimal feature map -- a bottom sheet listing the 5 tabs with one-line descriptions of what each contains. This serves as a "table of contents" for the app.

**Files:**
- Create `src/components/layout/FeatureMapSheet.tsx` (~80 lines) -- a Sheet with 5 sections matching the bottom tabs, each listing 2-3 key capabilities
- Edit `src/pages/DashboardPage.tsx` -- add a subtle "?" icon button in the header that opens the sheet

---

## Summary of Changes

| Change | Impact | Effort |
|--------|--------|--------|
| Progressive disclosure manager | High -- eliminates first-session overwhelm | Small |
| Merge FeatureDiscoveryCard into WhatsNextCard | Medium -- reduces visual clutter | Small |
| AI Studio "Recommended" row | High -- gives clear starting point | Small |
| Contextual editor suggestions (verify NextStepBanner) | Medium -- surfaces tools in context | Tiny |
| Goal-based WhatsNextCard | Medium -- makes onboarding feel personalized | Small |
| Feature map help sheet | Medium -- gives overwhelmed users an overview | Small |

### Files Created (2)
- `src/lib/discoveryManager.ts`
- `src/components/layout/FeatureMapSheet.tsx`

### Files Modified (5)
- `src/pages/DashboardPage.tsx` -- remove FeatureDiscoveryCard, add discovery gates, add "?" button
- `src/components/dashboard/WhatsNextCard.tsx` -- merge feature discovery fallback, read onboarding goal
- `src/components/layout/BottomTabBar.tsx` -- gate discovery dots via discoveryManager
- `src/pages/AIStudioPage.tsx` -- add "Recommended for you" section
- `src/pages/EditorPage.tsx` -- verify/fix NextStepBanner trigger conditions

### Files Removed (1)
- `src/components/dashboard/FeatureDiscoveryCard.tsx` (functionality merged into WhatsNextCard)

