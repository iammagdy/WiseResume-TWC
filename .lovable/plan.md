
# Fix: LinkedIn Profile Link Opening Wrong Profile

## Problem
When clicking "Open LinkedIn Profile" in the LinkedIn Import sheet, it opens a random person's profile (Anna Smith) instead of the user's own profile. This happens because:

1. The code uses a placeholder URL `https://linkedin.com/in/yourprofile` when no username is set
2. This placeholder is actually a real LinkedIn profile belonging to someone else

## Solution
Only show the "Open LinkedIn Profile" link when the user has actually entered their LinkedIn username. Otherwise, link to the generic LinkedIn homepage so users can navigate to their own profile.

## Changes Required

### File: `src/components/settings/LinkedInImportSheet.tsx`

**Current code (lines 89-91):**
```typescript
const linkedinUrl = linkedinUsername 
  ? `https://linkedin.com/in/${linkedinUsername}`
  : 'https://linkedin.com/in/yourprofile';  // Problem: fake profile URL
```

**Updated approach:**
```typescript
const linkedinUrl = linkedinUsername 
  ? `https://linkedin.com/in/${linkedinUsername}`
  : null;  // No profile link if username not set
```

**Updated UI (lines 248-256):**
- If `linkedinUsername` exists: Show "Open LinkedIn Profile" linking to their profile
- If no username: Show "Go to LinkedIn" linking to `https://linkedin.com` with helper text

```tsx
{linkedinUsername ? (
  <a 
    href={`https://linkedin.com/in/${linkedinUsername}`}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
  >
    <ExternalLink className="w-3.5 h-3.5" />
    Open Your LinkedIn Profile
  </a>
) : (
  <a 
    href="https://linkedin.com"
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
  >
    <ExternalLink className="w-3.5 h-3.5" />
    Go to LinkedIn
  </a>
)}
```

## User Experience

| Scenario | Current Behavior | Fixed Behavior |
|----------|-----------------|----------------|
| No LinkedIn username set | Opens random profile (Anna Smith) | Opens linkedin.com homepage |
| LinkedIn username entered | Opens correct profile | Opens correct profile (no change) |

## Files to Modify

| File | Change |
|------|--------|
| `src/components/settings/LinkedInImportSheet.tsx` | Update link logic to handle missing username properly |
