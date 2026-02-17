

## Settings Page Fixes

### 1. Move GitHub Button Inside Developer Card

**Current**: The GitHub icon sits in the branded footer below the card.
**Change**: Move it inside the `DeveloperCreditCard` component, next to the Contact Me button. Both buttons will sit side-by-side in a row — Contact Me takes most of the space, and GitHub gets a compact icon button.

**Files changed:**
- `src/components/settings/DeveloperCreditCard.tsx` — Add a `githubUrl` prop. Render two buttons side by side: Contact Me (flex-1) and a square GitHub icon button.
- `src/components/settings/DeveloperCreditCard.css` — Add a `.dev-btn-row` flex container and `.dev-github-btn` styled like the contact button but square/icon-only.
- `src/pages/SettingsPage.tsx` — Pass `githubUrl="https://github.com/iammagdy"` to the DeveloperCreditCard. Remove the GitHub icon button from the branded footer section.

### 2. Fix Version Showing v1.5.0 by Default

**Current**: The changelog data only fetches when the user opens the changelog dialog (`if (!changelogOpen) return;` on line 153). Until then, `changelogData` is empty, so `appVersion` falls back to `'v1.5.0'`.

**Fix**: Fetch `changelog.json` on component mount (remove the `changelogOpen` guard for initial load). This way the footer immediately shows the correct version (v2.0.0) without needing to open the changelog first.

**File changed:**
- `src/pages/SettingsPage.tsx` — Split into two effects: one that fetches on mount to populate version, and one that re-fetches when changelog dialog opens (for freshness). The fallback string will also change from `'v1.5.0'` to `'loading...'` briefly, then resolve to the real version.

### Technical Summary

```text
DeveloperCreditCard.tsx:
  + githubUrl?: string prop
  + Side-by-side button layout: [Contact Me (flex-1)] [GitHub (icon)]

DeveloperCreditCard.css:
  + .dev-btn-row { display: flex; gap: 0.5rem; width: 100%; }
  + .dev-github-btn { same glass style as contact btn, but fixed width }

SettingsPage.tsx:
  - Remove GitHub button from footer (lines 904-910)
  + Pass githubUrl to DeveloperCreditCard
  - Remove "if (!changelogOpen) return" guard so version loads on mount
  - Change fallback from 'v1.5.0' to 'v2.0.0' as a safer default
```
