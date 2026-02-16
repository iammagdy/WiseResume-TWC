

## Settings Page Full Redesign

### Issues Identified and Fixes

**1. Scrolling broken**
The SettingsPage creates its own scroll container (`ref={scrollRef}` with `overflow-y-auto` on line 381) but AppShell also wraps everything in an `overflow-y-auto` div (line 40). Two nested scroll containers fight each other. Fix: remove the inner scroll container from SettingsPage and let AppShell handle scrolling. The `scrollRef` and `scrollToTop` FAB will reference the AppShell container via a parent ref or `document.querySelector`.

**2. Invalid footer links**
- GitHub URL is `https://github.com/magdysaber` -- change to `https://github.com/iammagdy`
- Remove LinkedIn and Twitter icon buttons entirely
- Remove Privacy and Terms links (lines 1005-1008)

**3. "Made in EG" enhancement**
Replace plain text with a branded footer strip: WiseResume logo (small icon) + version + GitHub icon, styled as a cohesive glass card.

**4. Remove duplicate section navigation**
Both the horizontal scrolling chip bar AND the hamburger menu "Jump to Section" sheet duplicate the bottom tab bar sections concept. Remove both entirely per your choice.

**5. Account stats wired to real data**
Query `cover_letters` and `job_applications` tables (both have `user_id` column) to get actual counts instead of showing dashes.

**6. Developer Credit Card**
Kept as-is per your choice.

---

### Full Redesign Structure

The new settings page removes visual clutter, simplifies the hierarchy, and gives it a world-class mobile app feel:

```text
+------------------------------------------+
| [<- Back]  Settings                      |  <- clean header, no hamburger
+------------------------------------------+
| [Avatar] Name / Job Title                |
| [Provider badge] [Progress bar if <100%] |  <- profile card (tap to edit)
+------------------------------------------+
|                                          |
| APPEARANCE                               |
| [Theme toggle]  [Language: English]      |
|                                          |
| AI & VOICE                               |
| [AI Provider: WiseResume AI]             |
| [ElevenLabs: Connect/Manage]            |
|                                          |
| EDITOR & EXPORT                          |
| [PDF Settings (collapsible)]             |
| [Export Resumes (collapsible)]           |
|                                          |
| NOTIFICATIONS                            |
| [Push] [Auto-save] [AI Tips] [Quiet Hrs] |
|                                          |
| PRIVACY & SECURITY                       |
| [Biometric] [Local-Only] [Analytics]     |
|                                          |
| ACCOUNT                                  |
| [3 | 2 | 5]  Resumes | Letters | Apps   |
| [Change Password] [Sign Out] [Delete]   |
|                                          |
| ABOUT                                    |
| [Take Tour] [Rate] [Share] [Get Help]   |
|                                          |
| [Developer Credit Card]                 |
|                                          |
| [WiseResume icon] v1.6.0  [GitHub icon] |  <- branded footer
| Crafted in Cairo, Egypt                  |
+------------------------------------------+
```

---

### Detailed Changes

#### File: `src/pages/SettingsPage.tsx` (major rewrite)

**Scrolling fix:**
- Remove `ref={scrollRef}` and `onScroll={handleScroll}` from the inner div
- Remove the `overflow-y-auto` class from it -- let AppShell's wrapper handle scroll
- Update the scroll-to-top FAB to use `document.querySelector` or remove it (since AppShell handles scroll)
- Alternatively, keep the scroll-to-top button but attach it to the window scroll

**Remove section navigation (lines 138-146, 348-406):**
- Delete the `SECTIONS` array
- Delete the hamburger button in the header
- Delete the `Sheet` for "Jump to Section"
- Delete the horizontal chip bar
- Delete `activeSection`, `showJumpSheet` state
- Delete `scrollToSection` and related `IntersectionObserver` logic
- Delete `SectionJumpButton` component at bottom of file

**Fix footer (lines 996-1025):**
- Remove Privacy and Terms links
- Remove Twitter and LinkedIn buttons
- Change GitHub URL from `https://github.com/magdysaber` to `https://github.com/iammagdy`
- Replace "Made in EG" with branded footer: small AppIcon + "WiseResume v1.6.0" + GitHub icon, plus a subtle "Crafted in Cairo, Egypt" line with a small flag emoji

**Wire account stats:**
- Import `useCoverLetters` and `useJobApplications` hooks
- Replace the hardcoded dashes with `coverLetters.length` and `applications.length`

**Clean up unused imports:**
- Remove `Menu`, `Twitter`, `Linkedin` from lucide imports
- Remove `ArrowUp` if scroll-to-top is removed
- Remove `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle` if jump sheet is removed

---

### Files Summary

| File | Action |
|------|--------|
| `src/pages/SettingsPage.tsx` | Major rewrite: fix scrolling, remove section nav, fix footer, wire stats |

### No New Files Needed

All changes are within the existing SettingsPage. The hooks for cover letters and job applications already exist (`useCoverLetters`, `useJobApplications`).

