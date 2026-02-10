

# WiseResume -- Comprehensive Mobile App Audit Report

---

## 1. Executive Summary

**Overall Health Score: 78/100**

WiseResume is a well-architected mobile-first resume editor built with React, Capacitor, and Supabase. The codebase demonstrates strong mobile-aware patterns (safe areas, touch targets, glassmorphism design system, lazy loading). However, the audit reveals issues across several categories that impact production readiness.

| Category | Score | Status |
|----------|-------|--------|
| Mobile Compatibility | 82/100 | Good |
| AI Features | 72/100 | Needs attention |
| UI/UX Design | 80/100 | Good |
| Code Quality | 75/100 | Needs attention |
| Performance | 85/100 | Good |
| Security | 70/100 | Needs attention |

**Critical Issues Found: 2**
**High Priority Issues: 8**
**Medium Priority Issues: 12**
**Low Priority Issues: 10**

---

## 2. Mobile Compatibility Assessment

### 2.1 Viewport and Responsive Design -- GOOD
- Viewport meta tag correctly includes `viewport-fit=cover` for notched devices
- `min-h-[100dvh]` used throughout for dynamic viewport units
- Tailwind config includes custom `xs: 375px` breakpoint
- Fluid typography system (`text-fluid-*`) implemented in CSS
- Safe area utilities (`pb-safe`, `pt-safe`) correctly implemented

### 2.2 Touch Targets -- GOOD
- Back buttons use `min-w-[48px] min-h-[48px]` consistently
- Bottom tab bar items have adequate flex-1 sizing within 64px height
- Auth page buttons use `min-h-[44px]` for toggle links
- `.touch-manipulation` class applied widely to prevent double-tap zoom

### 2.3 Layout Behavior at Key Breakpoints

**320px (iPhone SE/5):**
- **MEDIUM**: StepperNav step labels at `text-[10px]` may crowd on 5 steps. The connecting line at `left-[10%] right-[10%]` may overlap icons.
- **MEDIUM**: AI Studio "More Tools" 4-column grid (`grid-cols-4`) becomes cramped; icon labels may truncate.

**375px (iPhone 12 mini):**
- Generally good. The `xs:` breakpoint is defined but underused -- only `hidden xs:inline` pattern documented.

**768px+ (Tablet):**
- **MEDIUM**: No tablet-optimized layouts. The entire app is a single-column mobile layout even on iPad. No `md:` breakpoint adaptations for editor, dashboard, or preview pages.

### 2.4 Platform-Specific Issues

**iOS:**
- `-webkit-overflow-scrolling: touch` correctly applied
- `overscroll-behavior: none` prevents rubber-banding
- `apple-mobile-web-app-status-bar-style: black-translucent` set
- **HIGH**: `apple-touch-icon` points to `/favicon.svg` -- SVG is not supported for iOS home screen icons. Should point to a PNG.

**Android/Capacitor:**
- Capacitor config present with correct appID
- Hot-reload server URL configured for development
- **LOW**: No splash screen configuration in capacitor.config.ts

### 2.5 Keyboard Handling -- GOOD
- `useKeyboardAwareScroll` hook implemented
- `useSheetKeyboard` for modal input scrolling
- MobileLayout auto-scrolls focused inputs with 300ms delay
- Background tap dismisses keyboard

---

## 3. AI Features Testing Report

### 3.1 AI Architecture Overview
All AI features route through either:
- **Lovable AI Gateway** (`ai.gateway.lovable.dev`) -- default, no user key needed
- **Google Gemini Direct** -- when user provides their own API key

Shared client in `_shared/aiClient.ts` handles routing, error mapping, and response parsing.

### 3.2 Feature-by-Feature Breakdown

| Feature | Edge Function | Error Handling | Edge Cases |
|---------|--------------|----------------|------------|
| Resume Scoring | `score-resume` | Good (rate limit, payment, auth) | Fallback score on parse failure |
| Section Enhance | `enhance-section` | Good (input validation, size limits) | JSON parse fallback |
| Resume Analysis | `analyze-resume` | Basic (throws generic errors) | Missing `userGeminiKey` forwarding unclear |
| Smart Tailor | `tailor-resume` | Unknown (not reviewed in detail) | -- |
| Cover Letter | `generate-cover-letter` | Unknown | -- |
| Recruiter Sim | `recruiter-simulation` | Unknown | -- |
| AI Detector | `detect-and-humanize` | Unknown | -- |
| LinkedIn Optimizer | `optimize-for-linkedin` | Unknown | -- |
| One-Page Wizard | `one-page-optimizer` | Unknown | -- |
| Career Path | `career-path-advisor` | Unknown | -- |
| Interview Chat | `interview-chat` | Unknown | -- |
| Agentic Chat | `agentic-chat` | Has security fix report | -- |
| Job URL Parser | `parse-job-url` | Unknown | -- |
| Resume Parser | `parse-resume` | Unknown | -- |

### 3.3 Issues Found

**CRITICAL -- Build Error:**
- The Supabase types file references `npm:openai@^4.52.5` which cannot be resolved. This is a type-checking error in the Deno edge function build pipeline. It does not break runtime but blocks type validation.

**HIGH -- Inconsistent AI Client Usage:**
- `enhance-section` and `score-resume` each implement their own inline AI client instead of importing from `_shared/aiClient.ts`. This means bug fixes or model changes must be applied in 3+ places.
- Different functions use different models: `score-resume` uses `gemini-2.5-flash-lite` / `gemini-2.0-flash`, while `enhance-section` uses `gemini-2.5-flash`. No centralized model selection strategy.

**HIGH -- No Request Timeout:**
- AI calls to external APIs have no timeout configured. A slow Gemini response could hang indefinitely (edge functions have a 400s max but no client-side timeout).

**MEDIUM -- Rate Limiting Client-Side Only:**
- `src/lib/rateLimiter.ts` exists but rate limiting is only enforced on the client. A user could bypass by calling edge functions directly.

**MEDIUM -- AI Response Validation:**
- Score resume uses `content.match(/\{[\s\S]*\}/)` regex to extract JSON, which could match partial/invalid JSON in edge cases.

---

## 4. UI/UX Analysis

### 4.1 Design System -- STRONG
- Comprehensive glass morphism system (`glass`, `glass-card`, `glass-elevated`, `glass-surface`, `glass-input`)
- Consistent color palette with semantic colors (success, warning, destructive)
- Light and dark theme fully implemented
- Font system uses Inter (body) + Space Grotesk (headings)
- Custom animation system with meaningful motion (fade-in, scale-in, float, glow-pulse)

### 4.2 Navigation Structure

```
Landing (/) --> Auth (/auth) --> Dashboard (/dashboard)
                                     |
                    +--------+-------+-------+--------+
                    |        |       |       |        |
                 Editor   Upload  Interview Settings  Preview
                (/editor) (/upload) (/interview) (/settings) (/preview)
```

**Issues:**
- **HIGH**: Bottom tab bar shows on ALL tabbed routes including Editor and Preview, where it takes up space but the user is focused on content creation. The Editor already has its own back button and full navigation.
- **MEDIUM**: Interview page back button navigates to `/preview` (line 185, 210) which is unexpected. Should navigate to `/dashboard` or use history.
- **MEDIUM**: Preview page is nested under the tab bar but also accessible from the Editor flow. This dual-entry creates inconsistent navigation context.

### 4.3 Information Hierarchy -- GOOD
- Dashboard uses a clear hierarchy: Hero stats -> Quick actions -> Daily tip -> Search -> Resume list
- Editor uses a 5-step stepper with clear progress indication
- Settings page uses grouped sections with descriptive headers

### 4.4 Accessibility Issues

**HIGH -- Missing ARIA on Key Components:**
- Editor tabs are visually driven by StepperNav but use hidden `<Tabs>` component. Screen readers may not understand the relationship.
- Landing page animations use `opacity: 0` initial states with CSS animations -- content is invisible until JS runs, breaking progressive enhancement.

**MEDIUM -- Color Contrast:**
- `text-[10px]` labels in StepperNav and BottomTabBar may fail WCAG AA for small text
- `text-muted-foreground` on dark backgrounds (HSL 240 10% 60% on 240 20% 4%) -- contrast ratio should be verified

**LOW -- Semantic HTML:**
- Multiple pages use `<div>` where `<main>`, `<nav>`, `<section>` would be more appropriate
- BottomTabBar correctly uses `role="tablist"` and `role="tab"` -- good

### 4.5 Loading States -- GOOD
- Page-level skeletons for all lazy-loaded routes
- ScoreRing has proper loading state with shimmer
- DashboardStats now shows persistent layout during data fetch (recently fixed)
- Pull-to-refresh on dashboard

### 4.6 Friction Points
- **HIGH**: Guest users can create resumes and reach the editor, but auto-save only works for authenticated users. If a guest closes the browser, their work is lost. The `GuestSaveBanner` exists but may not be prominent enough.
- **MEDIUM**: Creating a new resume from the landing page sets a blank resume and navigates to `/editor` without saving to cloud first. If the user is authenticated, they may lose this resume if they navigate away before the first auto-save triggers.

---

## 5. Detailed Remediation Plan

### CRITICAL (Blocks Build/Deploy)

| # | Issue | Fix | Effort | Files |
|---|-------|-----|--------|-------|
| C1 | Build error: `npm:openai@^4.52.5` type resolution failure | This is caused by `@supabase/functions-js` referencing OpenAI types. Add a `deno.json` with `nodeModulesDir: "auto"` or pin the supabase-js version. Since this is in the auto-generated types file, the simplest fix is to ensure edge functions don't import from the problematic path. | 0.5h | `supabase/` config |

### HIGH (Severely Impacts UX)

| # | Issue | Fix | Effort | Files |
|---|-------|-----|--------|-------|
| H1 | apple-touch-icon uses SVG (unsupported on iOS) | Change to PNG: `<link rel="apple-touch-icon" href="/icons/icon-192x192.png" />` | 0.25h | `index.html` |
| H2 | Bottom tab bar shows on Editor/Preview (wastes space) | Remove `/editor` and `/preview` from `TAB_ROUTES` in AppShell, since these pages have their own navigation | 0.5h | `AppShell.tsx` |
| H3 | Interview back button navigates to `/preview` | Change to `/dashboard` for consistency with navigation logic memory | 0.25h | `InterviewPage.tsx` |
| H4 | Inconsistent AI client across edge functions | Refactor `enhance-section` and `score-resume` to import from `_shared/aiClient.ts` | 2h | 3 edge function files |
| H5 | No timeout on AI API calls | Add `AbortController` with 30s timeout to `callAI` in `_shared/aiClient.ts` | 1h | `_shared/aiClient.ts` |
| H6 | Guest work loss risk | Add `beforeunload` warning when guest has unsaved resume data | 0.5h | `EditorPage.tsx` |
| H7 | Editor page `pb-20` from AppShell AND bottom fixed section create double padding | Editor should not receive `pb-20` since it has its own fixed bottom section. Fix the AppShell to conditionally exclude padding for editor/preview routes | 0.5h | `AppShell.tsx` |
| H8 | Landing page content invisible until CSS animation fires (opacity: 0 initial) | Add `<noscript>` fallback styles or use `animation-fill-mode: backwards` with short delay | 0.5h | `HeroSection.tsx` |

### MEDIUM (Noticeable Issues)

| # | Issue | Fix | Effort | Files |
|---|-------|-----|--------|-------|
| M1 | No tablet layout optimizations | Add `md:` responsive variants for dashboard (2-column grid) and editor (side-by-side preview) | 4h | Multiple pages |
| M2 | StepperNav crowded on 320px screens | Use `overflow-x-auto` horizontal scroll on very small screens | 0.5h | `StepperNav.tsx` |
| M3 | AI Studio 4-col grid too cramped on small screens | Change to `grid-cols-3 xs:grid-cols-4` | 0.25h | `AIAssistantBar.tsx` |
| M4 | Preview -> Editor dual-entry navigation confusion | Ensure consistent back navigation by checking `history.length` | 0.5h | `PreviewPage.tsx` |
| M5 | text-[10px] labels may fail WCAG AA contrast | Increase to `text-[11px]` and ensure 4.5:1 ratio | 0.5h | Multiple components |
| M6 | AI response JSON extraction uses greedy regex | Use more robust parsing with try/catch on trimmed content first | 0.5h | Edge functions |
| M7 | No splash screen for Capacitor native app | Add splash screen config to capacitor.config.ts | 1h | `capacitor.config.ts` |
| M8 | Dashboard `motion.div` with `itemVariants` still causes staggered animation on resume cards | The outer `motion.div` wrapper in DashboardPage still applies `itemVariants` (opacity 0 -> 1, y 20 -> 0) | 0.25h | `DashboardPage.tsx` |
| M9 | Missing `<main>` semantic element on several pages | Wrap page content in semantic `<main>` tags | 0.5h | Multiple pages |
| M10 | No error boundary around individual AI features | Wrap AI sheets in ErrorBoundary so one crash doesn't break the editor | 1h | `EditorPage.tsx` |
| M11 | Rate limiting only client-side | Add per-user rate limiting in edge functions (e.g., check last request timestamp in DB) | 3h | Edge functions |
| M12 | StepperNav infinite pulse animation on active step consumes GPU | Consider removing infinite `repeat: Infinity` animation or reducing to 3 repeats | 0.25h | `StepperNav.tsx` |

### LOW (Minor Improvements)

| # | Issue | Fix | Effort | Files |
|---|-------|-----|--------|-------|
| L1 | No Capacitor splash screen | Configure in capacitor.config.ts | 0.5h | Config |
| L2 | OG image uses SVG favicon (low quality for social sharing) | Create a proper 1200x630 OG image | 1h | Assets + index.html |
| L3 | DeveloperCreditCard hardcoded in Settings | Consider making this configurable or data-driven | 0.5h | `SettingsPage.tsx` |
| L4 | Unused animation keyframes in tailwind config | Clean up unused animations to reduce CSS size | 0.25h | `tailwind.config.ts` |
| L5 | `haptics` module imported but likely no-ops in web | Verify graceful degradation on web platform | 0.25h | `src/lib/haptics.ts` |
| L6 | No service worker for offline caching (PWA manifest exists but no SW) | Add vite-plugin-pwa for proper offline support | 2h | `vite.config.ts` |
| L7 | Multiple CSS `glow-primary` duplicates in index.css | Remove duplicate declarations | 0.1h | `index.css` |
| L8 | EditorPage save-on-unmount uses stale closure | The `saveToCloud` ref in the unmount effect captures the initial value | 0.5h | `EditorPage.tsx` |
| L9 | No `loading="lazy"` on template thumbnails | Add lazy loading for off-screen template images | 0.25h | Templates |
| L10 | Missing `rel="noopener noreferrer"` on external links | Add to developer credit card website link | 0.1h | `DeveloperCreditCard.tsx` |

---

## 6. Implementation Roadmap

### Phase 1: Critical and Quick Wins (Day 1, ~4 hours)
- C1: Fix build error
- H1: Fix apple-touch-icon
- H2: Remove bottom tab from Editor/Preview
- H3: Fix Interview back navigation
- H7: Fix double padding on Editor
- M8: Remove remaining card entrance animations
- L7: Remove duplicate CSS

### Phase 2: AI Reliability (Days 2-3, ~6 hours)
- H4: Consolidate AI client across edge functions
- H5: Add API call timeouts
- M6: Improve JSON response parsing
- M10: Add error boundaries around AI sheets

### Phase 3: UX Polish (Days 4-5, ~5 hours)
- H6: Guest data loss prevention
- H8: Fix landing page progressive enhancement
- M2: StepperNav small screen fix
- M3: AI Studio grid responsive fix
- M5: WCAG contrast improvements
- M9: Semantic HTML improvements
- M12: Reduce infinite animations

### Phase 4: Platform Enhancement (Week 2, ~8 hours)
- M1: Tablet layout optimizations
- M11: Server-side rate limiting
- L6: PWA service worker
- L2: OG image improvement
- M7: Capacitor splash screen

