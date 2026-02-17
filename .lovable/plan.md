

## UI Audit Report -- Identified Issues and Fixes

After a thorough analysis of the entire app across multiple pages (Landing, Dashboard, Editor, AI Studio, Activity, Cover Letters, Settings), here are the issues found and their proposed fixes:

---

### Issue 1: Install Banner Overlaps Content on Every Page (HIGH)

The PWA "Install WiseResume" banner sits at `bottom-24` and overlaps content on every single page. It covers the AI Studio chat input, the floating action button on the dashboard, and bottom content on other pages.

**Fix:** Increase the banner's bottom offset to `bottom-28` so it sits above the bottom tab bar without overlapping page content. Also reduce its z-index slightly to prevent it from covering important interactive elements like the FAB.

**File:** `src/components/pwa/InstallPrompt.tsx`

---

### Issue 2: App.css Contains Unused Vite Boilerplate (LOW)

`src/App.css` has default Vite/React template styles (`#root { max-width: 1280px; padding: 2rem; }`). While not currently imported, it is dead code that should be cleaned up.

**Fix:** Delete or empty the file contents.

**File:** `src/App.css`

---

### Issue 3: Badge Component Missing forwardRef (MEDIUM)

Console warning: "Function components cannot be given refs" for `Badge` in `ResumeListSheet`. This happens because Radix components try to pass refs to the Badge, but it is a plain function component.

**Fix:** Wrap the `Badge` component with `React.forwardRef`.

**File:** `src/components/ui/badge.tsx`

---

### Issue 4: AI Health Badge Pushes Content Down (LOW)

The "AI Online" badge renders at the top of every AI-enabled page, consuming vertical space. It adds an extra row of padding on pages that already have headers, slightly reducing usable viewport.

**Fix:** Make the AI Health Badge overlay (`absolute` positioning) rather than flow-based (`flex`), so it floats over the page header without consuming layout space.

**File:** `src/components/layout/AppShell.tsx`

---

### Issue 5: Dashboard FAB Hidden Behind Install Banner (MEDIUM)

The floating "+" button on the dashboard (bottom-right) is partially obscured by the Install WiseResume banner when both are visible.

**Fix:** Addressed by Issue 1 fix (moving the install banner higher). Additionally, ensure the FAB has a higher z-index than the banner.

**File:** `src/components/dashboard/FloatingCreateButton.tsx` (verify z-index)

---

### Technical Summary

| # | Issue | Severity | File(s) |
|---|-------|----------|---------|
| 1 | Install banner overlaps content | High | `InstallPrompt.tsx` |
| 2 | Unused App.css boilerplate | Low | `App.css` |
| 3 | Badge missing forwardRef | Medium | `badge.tsx` |
| 4 | AI Health badge consumes layout space | Low | `AppShell.tsx` |
| 5 | FAB hidden behind install banner | Medium | `FloatingCreateButton.tsx` |

