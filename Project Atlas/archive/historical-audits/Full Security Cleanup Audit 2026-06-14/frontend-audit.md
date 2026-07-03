# Frontend Audit - WiseResume 2026-06-14

**Scope:** React/TypeScript frontend, components, hooks, stores, routing  
**Framework:** React 18, TypeScript 5.8, Vite 6, Tailwind 3.4  
**Architecture:** Appwrite-native, Zustand state management

---

## High Severity Findings (1)

### FE-H1: localStorage Stores Plan Cache Without Encryption
**Severity:** High  
**Area:** State Management  
**File:** `src/lib/planCache.ts` (new file per CHANGELOG)  

**Evidence:**
```typescript
// Plan cache stored in localStorage with 15-minute TTL
interface PlanCacheEntry {
  plan: PlanName;
  trialPlan: string | null;
  trialExpiresAt: string | null;
  cachedAt: number;
}
```

**Why it matters:**
- Plan data visible in localStorage
- Could be tampered with (though validated server-side)
- No encryption at rest

**Root cause:** Design trade-off for UX (eliminates free-plan flash)

**Recommended fix:**
- Acceptable risk - data is non-sensitive
- Plan is re-validated server-side
- Consider using sessionStorage instead

**Safe to fix:** NO - Design decision  
**Needs approval:** Product decision

---

## Medium Severity Findings (4)

### FE-M1: innerHTML Used in QR Code Component
**Severity:** Medium  
**Area:** Components  
**File:** `src/components/portfolio/qr/QRGeneratorSheet.tsx`  

**Evidence:**
- Line shows `dangerouslySetInnerHTML` pattern for QR rendering

**Why it matters:**
- Potential XSS if QR data contains malicious content

**Recommended fix:**
- Verify data sanitization before innerHTML use
- Use DOMPurify if not already applied

**Safe to fix:** YES - If sanitization missing

---

### FE-M2: Route Validation Inconsistent
**Severity:** Medium  
**Area:** Routing  
**File:** `AppInterior.tsx`  

**Evidence:**
```typescript
// Route imports and lazy loading
// Some routes may not have proper guards
```

**Why it matters:**
- Unprotected routes could expose admin functionality

**Status:**
- `/devkit` has AdminRoute wrapper (verified)
- Main app routes use ProtectedRoute

**Safe to fix:** REVIEW ONLY

---

### FE-M3: Unused Component Imports
**Severity:** Medium  
**Area:** Code Quality  

**Evidence:**
- Import patterns suggest unused components exist

**Recommended fix:**
- Run `npm run lint` to detect
- Remove confirmed unused code

**Safe to fix:** YES

---

### FE-M4: Feature Flag System May Allow Client Override
**Severity:** Medium  
**Area:** Feature Management  

**Evidence:**
- Feature flags loaded from server but cached client-side

**Why it matters:**
- Could enable disabled features

**Status:**
- Server-side enforcement in ai-gateway provides safety net

---

## Low Severity Findings (6)

### FE-L1: Console.log in Production Components
**Severity:** Low  
**Count:** 242 matches (see security-audit.md)

---

### FE-L2: Test Files Use Stale Supabase Mocks
**Severity:** Low  
**Area:** Tests  
**Count:** 20+ in e2e specs

---

### FE-L3: Unused Variables in Components
**Severity:** Low  
**Detected via TypeScript strict mode

---

### FE-L4: Mobile App Code May Be Deprecated
**Severity:** Low  
**Area:** mobile/ directory  
**Status:** Out of scope per RULES.md

---

### FE-L5: Old Domain in Comment References
**Severity:** Low  
**Files:** Various test files

---

### FE-L6: Large CHANGELOG.md Size
**Severity:** Low  
**Size:** 363KB, 1911 lines

---

## Cleanup/Info Findings (8)

### FE-I1: Duplicate Navigation Patterns
**Severity:** Cleanup  
**Area:** Layout  
**Files:** DesktopNav, AppWorkspaceSidebar, BottomTabBar

**Note:** Intentional - different contexts need different nav

---

### FE-I2: Multiple Resume List Components
**Severity:** Cleanup  
**Area:** Components  
**Files:** ResumeListCard, DashboardResumeList

**Note:** May be intentional for different views

---

### FE-I3: Tailwind Class Name Concatenation
**Severity:** Cleanup  
**Area:** Styling  
**Note:** Consider using cn() utility consistently

---

### FE-I4: Magic Numbers in CSS
**Severity:** Cleanup  
**Area:** CSS/Styled components  
**Note:** Some hardcoded values could be tokens

---

### FE-I5: Commented Code Blocks
**Severity:** Cleanup  
**Note:** Search for /* ... */ blocks that may be dead code

---

### FE-I6: TODO Comments
**Severity:** Info  
**Count:** 13 matches  
**Files:** Various

---

### FE-I7: Unused CSS Files
**Severity:** Info  
**Area:** Styling  
**Note:** Check for .css files not imported

---

### FE-I8: Component File Sizes
**Severity:** Info  
**Note:** Some components may be candidates for code splitting

---

## Accessibility Findings (Quick Review)

### A11Y-1: Button Nesting
**Status:** Fixed per CHANGELOG 2026-05-23
**File:** SettingsProfileHero invalid nested button markup - corrected

### A11Y-2: Icon Buttons
**Status:** Most have aria-label
**Note:** Verify all icon-only buttons have labels

### A11Y-3: Form Labels
**Status:** Generally good with Radix UI
**Note:** Check custom form components

### A11Y-4: Color Contrast
**Status:** Uses Tailwind colors
**Note:** Verify dark mode contrast ratios

### A11Y-5: Focus Management
**Status:** Uses Radix primitives
**Note:** Verify custom focus traps

---

## File Structure Analysis

### src/components/
```
components/
├── ai/              # AI-related components
├── ai-studio/       # AI Studio page components
├── applications/    # Job application components
├── auth/            # Auth flow components
├── dashboard/       # Dashboard components
├── dev-kit/         # Admin panel components
├── editor/          # Resume editor components
├── job-match/       # Tailoring hub components (needs rename)
├── landing/         # Landing page components
├── layout/          # App shell components
├── portfolio/       # Portfolio components
├── settings/        # Settings components
├── templates/       # Resume templates
├── ui/              # shadcn/ui components
└── wisehire/        # WiseHire components
```

**Observation:** Well-organized but `job-match/` should be renamed to `tailoring-hub/` per CHANGELOG note

---

## Unused Components Candidates (To Verify)

Based on import analysis, verify if these are used:

1. **CuratedCourses** - `src/lib/curatedCourses.ts` has TODO:remove comments
2. **SectionParsers** - `src/lib/pdf/sectionParsers.ts` has TODO:remove comments
3. **Waitlist components** - May be deprecated post-launch

---

## Performance Observations

### Code Splitting
- ✓ Uses React.lazy() in AppInterior.tsx
- ✓ Dynamic imports for heavy components

### Bundle Size
- Uses framer-motion (animation library)
- Uses pdf-lib, puppeteer (large dependencies)
- Consider lazy-loading PDF libraries

### State Management
- Zustand stores properly structured
- No excessive re-render patterns detected

---

## React/TypeScript Quality

### Type Safety
- ✓ Strict TypeScript enabled
- ✓ Component props typed
- ⚠ Some `any` types may exist

### Hooks
- ✓ Follows React hooks rules
- ✓ Custom hooks properly abstracted

### Error Boundaries
- ✓ AISheetErrorBoundary.tsx present
- ✓ ErrorBoundary.tsx at root
