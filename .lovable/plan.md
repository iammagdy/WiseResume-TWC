

# User Profile Improvements

## Overview

After reviewing the profile system (`useProfile`, `EditProfileSheet`, `ProfilePage`, `SettingsPage`), here are targeted improvements to make profiles more complete, useful, and polished.

---

## 1. Smarter Profile Completion Calculation

**Problem:** `calculateProfileCompletion` only checks 7 basic fields (name, avatar, job title, industry, career level, location, LinkedIn). It ignores phone number, portfolio setup, and resume content -- giving users 100% even with a mostly empty profile.

**Fix:** Weight the calculation to include phone number and portfolio bio, and add a "bonus" tier for portfolio setup:

```text
Core fields (70%): fullName, avatarUrl, jobTitle, industry, careerLevel, location, linkedinUrl
Extended fields (30%): phoneNumber, portfolioBio, contactEmail
```

**File:** `src/hooks/useProfile.ts` -- update `calculateProfileCompletion`

---

## 2. Auto-Save on Edit Profile Sheet

**Problem:** Users must manually tap "Save Changes" after editing. If they swipe the sheet closed, changes are lost silently.

**Fix:** Add debounced auto-save (1.5s after last change) with a subtle "Saved" indicator, matching the pattern already used for avatar uploads. Keep the explicit Save button as a "save and close" action.

**File:** `src/components/settings/EditProfileSheet.tsx`

---

## 3. Profile Page -- Show Job Title and Location

**Problem:** The Profile Page (`ProfilePage.tsx`) shows the user's name and email but not their job title or location, even though these are stored in the profile.

**Fix:** Add job title below the name and location as a subtle badge with a MapPin icon.

**File:** `src/pages/ProfilePage.tsx`

---

## 4. Actionable Completion Tips

**Problem:** When profile completion is below 100%, the message is generic ("Complete your profile to unlock more features"). Users don't know which specific field to fill.

**Fix:** Show the next missing field as a specific, tappable hint:
- "Add your job title to get better AI suggestions" (taps to focus the field)
- "Upload a photo to personalize your profile"

**Files:** `src/components/settings/EditProfileSheet.tsx`, `src/pages/ProfilePage.tsx`

---

## 5. Profile Export / Summary Card

**Problem:** No way to quickly share or view a summary of profile data outside the portfolio.

**Fix:** Add a "Copy Profile Summary" action on the Profile Page that copies a formatted text block:
```
Jane Doe -- Senior Software Engineer
Location: San Francisco, CA
Industry: Technology
LinkedIn: linkedin.com/in/janedoe
```

**File:** `src/pages/ProfilePage.tsx`

---

## 6. Validate LinkedIn URL Format

**Problem:** The LinkedIn field in EditProfileSheet prepends `https://linkedin.com/in/` but doesn't validate the username portion (allows spaces via `.replace(/\s/g, '')` but not other invalid characters).

**Fix:** Add regex validation to reject special characters and show an inline error for invalid usernames.

**File:** `src/components/settings/EditProfileSheet.tsx`

---

## 7. Profile Last Updated Timestamp

**Problem:** Users can't see when their profile was last modified. The `updated_at` column exists in the database but isn't surfaced.

**Fix:** Show "Last updated 3 days ago" on the Profile Page using the `updated_at` field from the profiles table. Requires adding `updated_at` to the `fetchProfile` select query and the `Profile` interface.

**Files:** `src/hooks/useProfile.ts`, `src/pages/ProfilePage.tsx`

---

## Summary

| # | Improvement | Files | Effort |
|---|------------|-------|--------|
| 1 | Smarter completion calculation | `useProfile.ts` | Low |
| 2 | Auto-save on edit sheet | `EditProfileSheet.tsx` | Medium |
| 3 | Show job title/location on profile page | `ProfilePage.tsx` | Low |
| 4 | Actionable completion tips | `EditProfileSheet.tsx`, `ProfilePage.tsx` | Low |
| 5 | Copy profile summary | `ProfilePage.tsx` | Low |
| 6 | LinkedIn URL validation | `EditProfileSheet.tsx` | Low |
| 7 | Last updated timestamp | `useProfile.ts`, `ProfilePage.tsx` | Low |

No database migrations needed -- all fields already exist. No new dependencies.

