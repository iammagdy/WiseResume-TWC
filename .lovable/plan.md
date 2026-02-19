
# Cross-Device User Journey Audit

## How the Three Users Experience This App

Before identifying issues, here is how each user naturally flows through the app:

---

### Mobile User (iPhone/Android, 375–430px)
The mobile user is the **primary intended audience**. Their journey is:

1. Opens the app → sees Dashboard with bottom tab bar
2. Taps a resume card → long-press or swipe for options (Edit, Interview, Delete)
3. Taps **Editor** tab → types in form fields with the keyboard toolbar for field-to-field navigation
4. Taps **Preview** tab inside the editor to see their resume inline
5. Goes to **AI Studio** → taps Wise AI Chat, Tailor to Job, etc. from a vertical scrolling list
6. Uses hardware back button on Android → handled by the `BACK_ROUTES` map
7. Checks **Activity** tab to track applications
8. Shares portfolio link via native share sheet

**Primary interaction pattern:** One-handed thumb scrolling, bottom tab navigation, sheet-based modals.

---

### iPad User (768–1024px)
The iPad user is currently **treated like a tall phone**. Their journey is:

1. Holds device in landscape (common) or portrait
2. Sees Dashboard content squeezed into a `max-w-3xl` centered column — good, but leaves ~30% blank grey space on both sides
3. Opens Editor → gets the **mobile layout** (single column + Editor/Preview tabs) because the `useIsMobile` hook fires at `< 768px`. At exactly 768px, they land in desktop mode. Between 768–900px (iPad portrait), the desktop layout appears with the live preview panel squeezed tightly
4. AI Studio: sees a `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` tool grid — works at 768px as `grid-cols-3`, OK
5. Bottom tab bar: shown at all widths (the `TAB_ROUTES` logic doesn't exclude tablets) — feels phone-like on a large screen
6. Applications: `max-w-3xl` keeps it readable

**Key gap: The iPad has no optimized layout — it shows a narrow phone-width experience in a large frame, with no multi-panel view at the 768–1024px range.**

---

### Desktop PC User (1024px+)
The PC user interacts primarily via mouse and keyboard:

1. Lands on dashboard with a centered `max-w-3xl` card list — adequate but uses only ~40% of wide monitor width
2. Opens Editor → gets the 2-panel side-by-side layout (Editor left + Live Preview right, resizable). This is well done
3. Keyboard shortcuts are registered: `N` to create resume, `I` to import (only when no resumes exist). No other shortcuts after the dashboard
4. The bottom tab bar still shows at all widths — this is a phone navigation pattern on a desktop. It sits at the bottom of the window with a `max-w-3xl` constraint (correct), but it's still a mobile UI pattern
5. AI Studio: shows `grid-cols-4` on large screens, good
6. Dashboard header uses a popover avatar menu for Settings/Sign Out — this works fine on desktop
7. The Editor header shows Template, Design, Live Preview, and Chat shortcuts in the `hidden md:flex` block — these are desktop-only and work well

---

## Issues Found by Device Context

### Issue 1 — iPad Portrait Shows Broken Editor Split (High Priority)

**Context:** iPad, 768px width

**Problem:** The `useIsMobile` hook threshold is `< 768px`. An iPad Mini (768px) or an iPad in Safari is exactly at the boundary. At 768px the editor renders as **desktop mode** — showing the full `ResizablePanelGroup` with the Live Preview panel. But at 768px, `defaultSize={55}` on the left panel + `defaultSize={45}` on the right panel creates a resume preview at only ~345px wide, which distorts every template.

The `md:hidden` / `hidden md:flex` toggle in the editor header also fires at 768px — so a user gets desktop-only controls (Template, Design, Live, Chat) but with a too-narrow preview. The `StepperNav` desktop layout (horizontal stepper) also fires at 768px, which leaves it very cramped.

**Evidence:** `useIsMobile` in `src/hooks/use-mobile.tsx` line 4: `const MOBILE_BREAKPOINT = 768`. The editor renders `isMobile ? <Tabs> : showPreview ? <ResizablePanelGroup>`. So iPad portrait gets the desktop path.

**Fix:** Raise the `isMobile` threshold to `900px` (matching `md` → `lg` breakpoint thinking). This ensures iPad portrait uses the mobile tabs layout and gets full-width resume preview. The desktop live-preview split only activates at ≥ 900px, where both panels have room.

---

### Issue 2 — Bottom Tab Bar Visible on Desktop (Medium Priority)

**Context:** PC, 1280px+ width

**Problem:** The bottom tab bar is always rendered for authenticated routes. On a wide desktop monitor it floats at the bottom-center of the screen (correctly constrained to `max-w-3xl`) but is visually out of place as a primary nav pattern for a desktop user who expects a sidebar or top navigation. There is no desktop-specific navigation alternative.

The tab bar labels "Home", "Editor", "Studio", "Activity", "Portfolio" are all essential — they're just in the wrong place for desktop.

**Fix:** Add a `hidden lg:block` sidebar or top nav strip on desktop (≥1024px) that renders the same 5 tab items horizontally in the header or as a slim left sidebar — and `lg:hidden` the bottom tab bar. This gives desktop users proper navigation while mobile users keep their bottom tab bar.

---

### Issue 3 — Dashboard Resume Cards Don't Use Grid on Desktop (Medium Priority)

**Context:** PC, 1280px+

**Problem:** The code at line 747 already has `lg:grid-cols-2 xl:grid-cols-3` on the resume list:
```tsx
className="space-y-4 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-4 lg:space-y-0"
```

However, this outer `max-w-3xl` container limits the grid to ~768px of actual content. At `xl:grid-cols-3` the individual cards are only ~240px wide — too narrow for the resume card content. The `max-w-3xl` constraint that correctly prevents full-bleed on small laptops actually prevents the 3-column grid from breathing properly on wide monitors.

**Fix:** On `xl` and above, expand the max-width to `max-w-5xl` or `max-w-6xl` so the 3-column grid gets adequate card width (~350px per card). This makes the desktop dashboard feel like a proper content page rather than a narrow phone view.

---

### Issue 4 — Portfolio Editor Back Button Goes to `/profile`, Not `/portfolio` Tab (Medium Priority)

**Context:** All devices

**Problem:** The Portfolio Editor header (line 534 of `PortfolioEditorPage.tsx`) has:
```tsx
<Button onClick={() => navigate('/profile')} ...>
```

But `/portfolio` is now its own primary tab in the BottomTabBar. The "back" from the Portfolio Editor should either go to `/dashboard` (since `/portfolio` IS the page) or the navigation.ts fix we applied earlier should redirect it. However, the hardcoded `navigate('/profile')` in the page header bypasses the centralized routing entirely.

**Evidence:** The Portfolio Editor is accessed from the Portfolio tab (`/portfolio`). The back button in the header navigates to `/profile` — but `/profile` is the account/profile settings page, NOT the portfolio tab. The user ends up on the wrong page.

**Fix:** Change the back button in `PortfolioEditorPage.tsx` header from `navigate('/profile')` to `navigate('/portfolio')` — or better, use `navigate(-1)` so it respects browser history and works correctly whether the user came from the Portfolio tab or the Dashboard.

---

### Issue 5 — Interview Page Has No Resume Guard Feedback for Empty State (Low-Medium Priority)

**Context:** Mobile, all devices

**Problem:** `InterviewPage.tsx` line 42:
```tsx
const hasValidResume = currentResume && currentResume.contactInfo?.fullName;
```

If a user navigates to the Interview tab from AI Studio with no resume selected, `hasValidResume` is `false`. Looking at the code, the page shows `<InterviewSetup />` regardless — and `InterviewSetup` presumably uses `currentResume` internally. The Studio tab sends users to `/interview` directly from the secondary tools list. If they have no resume loaded, the voice interview starts but has no context to generate questions from.

**Fix:** Add an explicit empty-state screen in `InterviewPage` when `!hasValidResume` that shows a clear "No resume selected" message with a CTA to go to the Dashboard and pick one. The existing check at line 42 is computed but there's no evidence it gates the `InterviewSetup` render.

---

### Issue 6 — AIStudioPage `pb-[180px]` Bottom Padding is Excessive on Desktop (Low Priority)

**Context:** Desktop/iPad

**Problem:** `AIStudioPage.tsx` line 194:
```tsx
className="flex-1 flex flex-col min-h-0 overflow-y-auto pb-[180px] sm:pb-20 pt-safe"
```

`pb-[180px]` (the default, mobile) gives 180px of empty space at the bottom of the AI Studio on mobile. This is likely to account for a sticky input bar that exists at the bottom. But `sm:pb-20` reduces this to 80px at ≥640px. On desktop (1280px+), 80px is still a full bottom-tab-bar worth of empty padding when the tab bar is at the bottom. The layout feels unfinished on desktop.

**Fix:** Add `lg:pb-6` to reduce bottom padding to a minimal value on desktop where the sticky input doesn't need to float above anything.

---

## Summary Table

| # | Issue | Devices Affected | Impact | Fix Complexity |
|---|---|---|---|---|
| 1 | iPad portrait renders editor in desktop mode (too narrow preview) | iPad | High | Low — change `MOBILE_BREAKPOINT` from 768 to 900 |
| 2 | Bottom tab bar shown on desktop (phone nav on PC) | Desktop | Medium | Medium — add lg:hidden on tab bar + desktop nav strip |
| 3 | Dashboard `max-w-3xl` prevents 3-column grid breathing at xl+ | Desktop | Medium | Low — expand max-width at xl |
| 4 | Portfolio Editor back button goes to `/profile` not `/portfolio` | All | Medium | Trivial — 1 line change |
| 5 | Interview page shows no empty state when no resume loaded | Mobile/All | Medium | Low — add guard render |
| 6 | AI Studio excess bottom padding on desktop | Desktop | Low | Trivial — add `lg:pb-6` |

---

## Files to Change

| File | Change |
|---|---|
| `src/hooks/use-mobile.tsx` | Raise `MOBILE_BREAKPOINT` from 768 → 900 |
| `src/components/layout/AppShell.tsx` | Add `lg:hidden` to BottomTabBar; add new `DesktopNav` strip rendered `hidden lg:flex` |
| `src/pages/DashboardPage.tsx` | Change `max-w-3xl` → `max-w-3xl xl:max-w-6xl` on resume grid container |
| `src/pages/PortfolioEditorPage.tsx` | Line 534: `navigate('/profile')` → `navigate(-1)` |
| `src/pages/InterviewPage.tsx` | Add early-return empty state when `!hasValidResume` after hydration |
| `src/pages/AIStudioPage.tsx` | Add `lg:pb-6` to main container padding |

No database changes. No edge functions. No new dependencies.

---

## Technical Details

### Fix 1 — `src/hooks/use-mobile.tsx`
```typescript
const MOBILE_BREAKPOINT = 900; // was 768 — now iPad portrait (768-899) uses mobile layout
```

### Fix 2 — Desktop Nav (new component in AppShell)
A slim horizontal nav strip renders above the main content on `lg:` screens:
```tsx
{/* Desktop top nav — lg and above only */}
{showBottomNav && (
  <nav className="hidden lg:flex items-center gap-1 px-6 h-12 border-b border-border glass shrink-0">
    {tabs.map(tab => (
      <Link to={tab.path} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
        isActive(tab) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
      )}>
        <tab.icon className="w-4 h-4" />
        {tab.label}
      </Link>
    ))}
  </nav>
)}
{/* Bottom tab bar — mobile and tablet only */}
{showBottomNav && <BottomTabBar className="lg:hidden" />}
```

The BottomTabBar already accepts a `className` prop, so we just add `"lg:hidden"` to it and add `"lg:pb-0"` to the main content padding override.

### Fix 3 — Dashboard `max-w` expansion at xl
```tsx
{/* Was: max-w-3xl */}
<div className="pb-safe max-w-3xl xl:max-w-5xl mx-auto w-full">
```
And for the resume grid:
```tsx
className="space-y-4 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-4 lg:space-y-0"
// stays the same — just the parent gets more room
```

### Fix 4 — Portfolio Editor back
```tsx
// Line 534 in PortfolioEditorPage.tsx
onClick={() => navigate(-1)}  // was: navigate('/profile')
```

### Fix 5 — Interview empty state
```tsx
// After hydration check in InterviewPage.tsx
if (hydrated && !hasValidResume) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 gap-4 text-center">
      <Sparkles className="w-12 h-12 text-muted-foreground opacity-40" />
      <div>
        <h2 className="font-semibold text-lg mb-1">No Resume Selected</h2>
        <p className="text-sm text-muted-foreground">Select or create a resume to start your interview practice session.</p>
      </div>
      <Button onClick={() => navigate('/dashboard')} className="gradient-primary min-h-[48px]">
        Go to Dashboard
      </Button>
    </div>
  );
}
```

### Fix 6 — AI Studio padding
```tsx
className="flex-1 flex flex-col min-h-0 overflow-y-auto pb-[180px] sm:pb-20 lg:pb-6 pt-safe"
```
