
# Add v2.2.0 Changelog Entry — Navigation & Mobile Experience Overhaul

## What We're Doing

Adding a new `v2.2.0` entry to `public/changelog.json` that documents the three rounds of navigation fixes and mobile keyboard improvements we just shipped. The entry will be positioned as a **major quality-of-life release** that shows we listen and care deeply about the experience — even when the underlying changes are technical.

The tone will be warm, customer-first, and results-focused. Every fix will be framed around what the user *feels*, not what we changed in code.

---

## New Entry — `v2.2.0` (dated 2026-02-19)

The old `v2.1.0` entry will have `"latest": true` removed (set to `false`), and the new entry will carry `"latest": true`.

### Items to include (framed as customer wins):

| What actually changed | How we'll present it |
|---|---|
| Dashboard "Edit" button went to read-only detail page | "One tap to edit — we removed the extra step that was getting in your way" |
| ATS "Improve" button didn't load the right resume | "ATS Improve now always opens YOUR resume, never a blank slate" |
| All 4 QuickAction cards sent everyone to login regardless of auth | "Every shortcut card now takes you exactly where it says — no more wrong turns" |
| Bottom tab Editor button went to detail, not editor | "The Editor tab now opens your resume editor instantly — no detours" |
| Template "Use This" with no resume silently broke | "Applying a template now guides you through the right steps if you don't have a resume yet" |
| Sign Out went to login page instead of home | "Signing out returns you to the home screen, where you belong" |
| Mobile keyboards: phone shows numpad, URL shows URL keyboard, etc. | "Your keyboard now matches what you're typing — numeric for phone, URL for links, email for addresses" |
| Textarea/Input spellcheck & autocomplete fixes | "Word suggestions and autocorrect now work everywhere you type in the app" |

### Summary line for the release:
> "We went through every button, every form, and every tap in WiseResume and fixed what wasn't working the way it should. This release is for everyone who noticed something felt slightly off — we heard you."

---

## Technical Change

**Only one file changes:** `public/changelog.json`

- Set `v2.1.0`'s `"latest": true` → `"latest": false`
- Insert new `v2.2.0` object at position `[0]` (top of array) with `"latest": true`
- Date: `"2026-02-19"`

No code changes, no database changes, no edge functions — just the JSON file that the changelog dialog and badge system reads at runtime.
