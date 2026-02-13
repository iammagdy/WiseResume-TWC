

## Settings Page Improvements: Clarity, Organization, and Guest Conversion

### Current Issues

1. **Section ordering is unintuitive** -- "Help & Support" (Take Tour) sits between "Editor Preferences" and "AI & Voice", breaking the flow. "Language" is buried inside "Account" instead of grouped with "Appearance".
2. **Guest experience is weak** -- The guest CTA card is generic ("Sign in to manage your account"). Locked sections just show "Sign in to access" with no value proposition.
3. **"Account" section mixes unrelated items** -- Language, Delete Data, and Sign Out are all lumped together.
4. **Single-item sections look sparse** -- "Editor Preferences" has only one row (PDF Export Settings), "Help & Support" has only one row (Take Tour).
5. **No visual hierarchy for most-used settings** -- Appearance and AI Provider are equally weighted despite different usage frequency.

---

### Proposed Section Reordering

```text
Current Order:              New Order:
1. Profile/Guest CTA        1. Profile/Guest CTA (enhanced)
2. Appearance                2. Appearance & Language (merged)
3. Editor Preferences        3. AI & Voice
4. Help & Support            4. Editor & Export (merged)
5. AI & Voice                5. Notifications
6. Notifications             6. Privacy & Security
7. Data & Export             7. Account (Sign Out, Delete - auth only)
8. Privacy & Security        8. About & Help (merged)
9. Account
10. About
```

---

### Changes by File

**File: `src/pages/SettingsPage.tsx`**

**1. Enhanced Guest CTA Card**
Replace the plain "Welcome, Guest" card with a more compelling conversion prompt:
- Add 3 bullet points showing what signing in unlocks: "Sync across devices", "Export & backup resumes", "AI-powered enhancements"
- Change button text from "Sign In" to "Get Started Free"
- Add a subtle gradient accent bar at the top of the card (matching the SignInPromptDialog style)

**2. Merge "Appearance" + "Language"**
- Rename section to "Appearance"
- Add the Language row below the ThemeToggle within the same glass card
- Removes the orphaned Language row from the old Account section

**3. Move "AI & Voice" up (section 3)**
- AI settings are a primary feature; they should appear higher
- No content changes, just position

**4. Merge "Editor Preferences" + "Data & Export" into "Editor & Export"**
- Combine PDF Export Settings and Export Resumes into one section
- For guests: show PDF Export Settings normally, and Export Resumes with the lock icon/description
- Removes two single-item sections in favor of one coherent group

**5. Move "Help & Support" into "About" section**
- Rename combined section to "About & Help"
- "Take Tour Again" row moves into the About section, above Rate/Share
- Removes the orphaned single-row "Help & Support" section

**6. Clean up "Account" section**
- Only render for authenticated users (contains only Sign Out and Delete Data)
- Remove Language row (moved to Appearance)
- For guests, this entire section is hidden since the Guest CTA card handles the sign-in prompt

**7. Guest-locked sections get better messaging**
- "Export Resumes" locked row: change description from "Sign in to access" to "Sign in to backup your data"
- "Privacy & Security" biometric row: already shows "Available on mobile app" when unavailable, which is fine

---

### Technical Details

All changes are in a single file: `src/pages/SettingsPage.tsx`. No new components, hooks, or dependencies needed. The restructuring is purely JSX reordering and minor text/className updates.

The section header pattern remains consistent (gradient line + uppercase label). Glass card containers (`glass-elevated rounded-2xl`) stay the same. `SettingsRow` component is reused without modification.

**Guest CTA enhancement** adds ~10 lines of JSX for the bullet list inside the existing card div. Uses `Check` icon from lucide-react (already imported indirectly via other components, needs explicit import).

**Section merges** reduce total section count from 10 to 8, making the page feel less overwhelming while keeping all functionality accessible.

