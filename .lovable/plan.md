

# Fix Public Portfolio Issues

## Issue 1: Splash Screen, Loading Spinner, and "What's New" Pop-up on Public Portfolio

The public portfolio page (`/p/:username`) is meant to be a standalone website visitors see -- not part of the app experience. However, three app-only UI elements leak into it:

1. **Splash screen** (`AnimatedSplash`) -- Renders for ALL routes on first visit (line 146 in App.tsx). When someone visits `/p/username` for the first time, they see the full app splash animation before the portfolio loads.

2. **"What's New" dialog** (`WhatsNewDialog`) -- Rendered globally at line 215, outside any route guard. Every visitor to any route (including `/p/username`) sees this changelog pop-up.

3. **Install PWA prompt** (`InstallPrompt`) -- Rendered globally at line 242. Portfolio visitors get prompted to install the app.

### Fix

In `src/App.tsx`, wrap the splash screen, WhatsNewDialog, and InstallPrompt logic to skip when the current route is a public page (`/p/`, `/share/`, `/l/`).

**Splash screen**: Move the `hasSeenSplash` check inside the Routes, so `/p/:username`, `/share/:token`, and `/l/:linkId` bypass it entirely. The simplest approach: check if the current URL path starts with `/p/`, `/share/`, or `/l/` before showing the splash.

**WhatsNewDialog**: Wrap in a small component that checks `useLocation()` and returns `null` for public routes.

**InstallPrompt**: Already has logic to hide on `/p/` routes (line 52 of InstallPrompt.tsx), but we should verify it works. If not, add the same guard.

### Changes in `src/App.tsx`

- Add a `useLocation()` check at the top of `AppRoutes` to detect public routes
- Skip `AnimatedSplash` when on public routes (`/p/`, `/share/`, `/l/`)
- Skip `WhatsNewDialog` when on public routes
- Skip `InstallPrompt` when on public routes (backup guard)

## Issue 2: Portfolio Only Shows Name and Photo

After investigating the database, the RPC `get_public_portfolio` IS returning all data correctly (bio, skills, experience, education, etc.). The user's resume data has:
- 14 skills (populated)
- Bio text (populated)
- Location (populated)
- 2 experience entries (but with empty `position` and `company` fields)
- 1 education entry (but with empty `institution`, `degree`, and `field` fields)

The portfolio page correctly renders all sections that have data. The experience and education cards appear but look empty because the underlying resume fields (company, position, institution, degree) were never filled in by the user. Skills and bio should be visible.

However, there may be a rendering issue where empty-string fields cause cards to render as blank. The fix is to add better empty-state filtering: skip experience entries where both `company` and `position` are empty, and skip education entries where `institution` and `degree` are both empty.

### Changes in `src/pages/PublicPortfolioPage.tsx`

- Filter out experience entries where both `position` and `company` are empty/whitespace
- Filter out education entries where both `institution` and `degree` are empty/whitespace
- This prevents "ghost cards" from appearing with no visible content

## Technical Details

| File | Changes |
|------|---------|
| `src/App.tsx` | Add public route detection; conditionally skip AnimatedSplash, WhatsNewDialog, InstallPrompt for `/p/`, `/share/`, `/l/` routes |
| `src/pages/PublicPortfolioPage.tsx` | Filter out experience/education entries with all-empty fields before rendering |

### App.tsx approach

```text
function AppRoutes() {
  // ... existing hooks ...
  
  // Detect public standalone routes that should skip app chrome
  const isPublicStandalone = window.location.pathname.startsWith('/p/')
    || window.location.pathname.startsWith('/share/')
    || window.location.pathname.startsWith('/l/');

  // Skip splash for public routes
  if (!hasSeenSplash && !isPublicStandalone) {
    return <AnimatedSplash onComplete={() => setHasSeenSplash(true)} />;
  }

  // ... routes ...
  
  // Only show WhatsNewDialog for non-public routes
  {!isPublicStandalone && <WhatsNewDialog />}
}
```

### PublicPortfolioPage.tsx filtering

```text
// Filter ghost entries before computing hasExperience/hasEducation
const validExperience = resume.experience?.filter(
  e => (e.position?.trim() || e.company?.trim())
) || [];
const validEducation = resume.education?.filter(
  e => (e.institution?.trim() || e.degree?.trim())
) || [];

const hasExperience = show('experience') && validExperience.length > 0;
const hasEducation = show('education') && validEducation.length > 0;
```

Then use `validExperience` and `validEducation` in the render loops instead of `resume.experience` and `resume.education`.

