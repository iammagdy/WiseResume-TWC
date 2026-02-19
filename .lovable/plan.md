

# Polish Developer Credit Card

## Changes

### 1. Move website link inside the card
The website link currently renders **outside** the glass card, appearing disconnected and shifted down. Move it inside `dev-card` so it sits naturally below the button row, within the card's glass surface.

### 2. Make the website URL dynamic
The link text is hardcoded as `"magdysaber.com"`. Change it to dynamically extract the hostname from the `websiteUrl` prop so it always matches.

### 3. Style the website link inline
Update the website link styling in the CSS to look like a subtle inline element within the card rather than a floating pill below it.

---

## Technical Details

### File: `src/components/settings/DeveloperCreditCard.tsx`

- Move the website `<button>` block (lines 110-118) from outside `dev-card` to inside `dev-card-content`, below `dev-btn-row`
- Replace hardcoded `"magdysaber.com"` with dynamic hostname extraction:
  ```tsx
  new URL(websiteUrl).hostname.replace('www.', '')
  ```
- Keep all existing click handlers, haptics, and `openExternal` calls unchanged

### File: `src/components/settings/DeveloperCreditCard.css`

- Update `.dev-website-link` styles to work as an inline element inside the card (add top margin, adjust alignment)
- Remove the `gap: 1rem` from `.dev-card-wrapper` since the website link will no longer be a separate element below the card

### No changes to:
- SettingsPage.tsx (props stay the same)
- Any animations, sparkles, particles, orbit, or holographic effects
- Contact/GitHub button functionality
- Any haptics or external link behavior

| File | Change |
|---|---|
| `src/components/settings/DeveloperCreditCard.tsx` | Move website link inside card; dynamic URL text |
| `src/components/settings/DeveloperCreditCard.css` | Adjust `.dev-website-link` positioning for inside-card layout |

