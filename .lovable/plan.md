
# Mobile Keyboard & Autocomplete Fix — Full App Audit

## Root Causes

There are **two distinct problems** affecting mobile input experience across the app:

### Problem 1 — Wrong keyboard types on mobile
The HTML `type` and `inputMode` attributes control which soft keyboard the OS shows. Currently:
- Phone fields in `AuthPage` signup have `type="tel"` but no `inputMode="tel"` — on some Android browsers this falls back to a full keyboard
- Salary, GPA, and year fields use plain `type="text"` with no `inputMode` — shows a full QWERTY keyboard instead of numeric
- URL fields in `SaveJobSheet`, `AddApplicationSheet`, and `PortfolioEditorPage` social links have no `type="url"` or `inputMode="url"` — the keyboard shows no `.com` shortcut
- Email fields in various sheets have no `type="email"` — no `@` shortcut on keyboard
- Date-text fields (Start Date, End Date in Experience/Education — which store free text like "Jan 2020") have no `inputMode` set

### Problem 2 — Autocomplete/spellcheck/suggestions broken
The HTML `autocomplete`, `spellcheck`, and `autocorrect` attributes control:
- **Word suggestions**: appear in the keyboard suggestion bar on iOS/Android when `autocomplete="on"` or `autocomplete="off"` is set explicitly for the field type
- **Spellcheck**: the red underline and keyboard correction suggestions — `Textarea` has no `spellcheck="true"` — autocorrect won't fire on long-form text fields like bio, summary, cover letter description
- **Form autofill**: the browser/OS fills in previously used values — name, email, phone fields need proper `autoComplete` values in `InputFormField` instances that don't currently set them

Currently, `<Textarea>` in `src/components/ui/textarea.tsx` has **no `spellCheck`, `autoCorrect`, or `autoCapitalize` attributes at all** — this is why suggestions don't work on the bio, summary, and description fields.

The base `<Input>` in `src/components/ui/input.tsx` also has **no default `autoCorrect` or `autoCapitalize`** — every field inherits no correction behavior.

---

## The Fix Strategy

**Two-level approach:**

1. **Base components** (`Input` and `Textarea`): Add smart defaults that work for most cases — this fixes autocomplete/suggestions across the entire app with zero changes to individual usage sites
2. **Call sites** (specific screens/sheets): Add the correct `type`, `inputMode`, `autoComplete` where they are contextually required — this fixes keyboard type selection

---

## Changes Required

### Change 1 — `src/components/ui/textarea.tsx` (highest impact, fixes all long-text fields globally)

Add `spellCheck`, `autoCorrect`, `autoCapitalize` defaults so word suggestions and spellcheck work everywhere a `<Textarea>` is used (bio, summary, descriptions, cover letters, resignation letters, notes):

```tsx
// BEFORE:
<textarea
  className={cn(...)}
  ref={ref}
  {...props}
/>

// AFTER:
<textarea
  spellCheck={true}
  autoCorrect="on"
  autoCapitalize="sentences"
  className={cn(...)}
  ref={ref}
  {...props}
/>
```

`spellCheck={true}` enables the OS keyboard's spell-check and word suggestion bar. `autoCapitalize="sentences"` auto-capitalizes the first word of each sentence. These are overridable per-usage since `...props` is spread after.

---

### Change 2 — `src/components/ui/input.tsx` (fixes suggestions for single-line text fields globally)

Add `autoCapitalize="on"` and `autoCorrect="on"` as defaults, but keep them overridable. This fixes the keyboard suggestion bar for name, company, position, institution, and other free-text inputs:

```tsx
// AFTER:
<input
  autoCapitalize="words"
  autoCorrect="on"
  spellCheck={true}
  type={type}
  className={cn(...)}
  ref={ref}
  {...props}
/>
```

`autoCapitalize="words"` is the right default for an input that typically holds names, places, job titles. This can be overridden per-field (e.g., `autoCapitalize="none"` for username, email, URL fields).

---

### Change 3 — `src/components/applications/SaveJobSheet.tsx`

Fix 5 inputs that use plain `<Input>` with no keyboard hints:

| Field | Fix |
|---|---|
| Job Title | Add `autoCapitalize="words"` (already inherited from Change 2, but add `autoComplete="organization-title"`) |
| Company | Add `autoComplete="organization"` |
| Location | Add `autoComplete="address-level2"` |
| Salary Range | Add `inputMode="text"` (salary is like "$80k-$100k", not pure numeric) |
| Source URL | Add `type="url"` + `inputMode="url"` + `autoCapitalize="none"` + `autoCorrect="off"` + `spellCheck={false}` |

---

### Change 4 — `src/components/applications/AddApplicationSheet.tsx`

Fix 3 bare `<Input>` elements:

| Field | Fix |
|---|---|
| Job URL | Add `inputMode="url"` + `autoCapitalize="none"` + `autoCorrect="off"` + `spellCheck={false}` (already has `type="url"`) |
| Job Title | Add `autoComplete="organization-title"` |
| Company | Add `autoComplete="organization"` |

---

### Change 5 — `src/pages/AuthPage.tsx`

Phone field in signup has `type="tel"` but missing `inputMode="tel"` which some Android browsers need:

```tsx
// Phone Number field in signup:
<InputFormField
  id="phoneNumber"
  type="tel"
  inputMode="tel"   // ← Add this
  autoComplete="tel"
  ...
/>
```

---

### Change 6 — `src/components/editor/ExperienceSection.tsx`

Fix bare `<Input>` elements for dates and descriptions:

| Field | Fix |
|---|---|
| Start Date | Add `inputMode="text"` + `autoComplete="off"` + `autoCapitalize="words"` (stores "Jan 2020") |
| End Date | Same as Start Date |
| Position | Add `autoComplete="organization-title"` |
| Company | Add `autoComplete="organization"` |

The `<Textarea>` for description gets fixed automatically by Change 1.

---

### Change 7 — `src/components/editor/EducationSection.tsx`

| Field | Fix |
|---|---|
| Institution | Add `autoComplete="organization"` |
| Degree | Add `autoCapitalize="words"` (already default from Change 2) |
| GPA | Add `inputMode="decimal"` (shows numeric pad with decimal point) |
| Start/End Date | Add `autoComplete="off"` |

---

### Change 8 — `src/pages/PortfolioEditorPage.tsx`

Fix 7 bare `<Input>` elements across the social links and identity sections:

| Field | Fix |
|---|---|
| Username | Add `autoCapitalize="none"` + `autoCorrect="off"` + `spellCheck={false}` + `inputMode="url"` |
| Availability Headline | Add `autoCapitalize="sentences"` |
| GitHub URL | Add `type="url"` + `inputMode="url"` + `autoCapitalize="none"` + `autoCorrect="off"` + `spellCheck={false}` |
| Personal Website | Same as GitHub |
| X (Twitter) URL | Same as GitHub |
| Contact Email | Already has `type="email"`, add `autoComplete="email"` + `autoCapitalize="none"` |

---

### Change 9 — `src/components/settings/EditProfileSheet.tsx`

Fix bare `<Input>` elements:

| Field | Fix |
|---|---|
| Display Name | Add `autoComplete="name"` |
| Location | Add `autoComplete="address-level2"` |
| LinkedIn username | Add `autoCapitalize="none"` + `autoCorrect="off"` + `spellCheck={false}` |
| Job Title | Add `autoComplete="organization-title"` |

---

### Change 10 — `src/pages/ResignationLetterNewPage.tsx`

Fix bare `<Input>` elements in Step 1:

| Field | Fix |
|---|---|
| Your Name | Add `autoComplete="name"` |
| Your Position | Add `autoComplete="organization-title"` |
| Company Name | Add `autoComplete="organization"` |
| Manager's Name | Add `autoComplete="off"` |

---

## Files to Change (Summary)

| # | File | What Changes |
|---|---|---|
| 1 | `src/components/ui/textarea.tsx` | Add `spellCheck`, `autoCorrect`, `autoCapitalize` defaults |
| 2 | `src/components/ui/input.tsx` | Add `autoCapitalize`, `autoCorrect`, `spellCheck` defaults |
| 3 | `src/components/applications/SaveJobSheet.tsx` | Add `type`, `inputMode`, `autoComplete` per field |
| 4 | `src/components/applications/AddApplicationSheet.tsx` | Add `inputMode`, `autoComplete`, `autoCorrect` per field |
| 5 | `src/pages/AuthPage.tsx` | Add `inputMode="tel"` to phone field |
| 6 | `src/components/editor/ExperienceSection.tsx` | Add `autoComplete`, `inputMode` per field |
| 7 | `src/components/editor/EducationSection.tsx` | Add `inputMode="decimal"` for GPA, `autoComplete` per field |
| 8 | `src/pages/PortfolioEditorPage.tsx` | Add `type`, `inputMode`, `autoCapitalize`, `autoCorrect` to all 7 inputs |
| 9 | `src/components/settings/EditProfileSheet.tsx` | Add `autoComplete`, `autoCapitalize` per field |
| 10 | `src/pages/ResignationLetterNewPage.tsx` | Add `autoComplete` per field |

**Changes 1 and 2 (base components) have the highest leverage** — they fix spellcheck and word suggestions for every `<Input>` and `<Textarea>` across the entire app in one edit. Changes 3–10 add contextual keyboard type selection where the generic default is wrong.

No new dependencies, no schema changes, no hook changes.
