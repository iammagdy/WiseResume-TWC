

## About & Trust — Enhancements

### Current State
- The **About & Help** section already has a `DeveloperCreditCard` (with contact email and website link), "Take Tour Again", "Rate WiseResume", and "Share WiseResume" rows, plus a version info block and "Need help?" area.
- The **Privacy & Security** section only has Biometric Lock settings with a brief subtitle.

### Changes

**File: `src/pages/SettingsPage.tsx`**

#### 1. Add privacy reassurance line to Privacy & Security section

Update the subtitle text on line 468 from:
```
"Biometric lock and data protection"
```
to:
```
"Biometric lock and data protection"
```
And insert a reassurance card **after** the biometric settings card (after line 499), before the closing `</div>`:

```tsx
<p className="text-xs text-muted-foreground mt-3 px-1 leading-relaxed">
  Your resumes are stored securely and never sold to third parties.{' '}
  <a
    href="https://magdysaber.com/privacy"
    target="_blank"
    rel="noopener noreferrer"
    className="text-primary underline underline-offset-2"
  >
    Privacy Policy
  </a>
</p>
```

This adds a trust-building line directly within the Privacy section with a link to the privacy policy.

#### 2. Enhance "Rate WiseResume" and "Share WiseResume" descriptions

These rows already exist (lines 564-578). Update their descriptions to be slightly more informative:
- "Rate WiseResume" description: change from `"Help us grow ⭐"` to `"Love WiseResume? Leave a rating to help others find it"`
- "Share WiseResume" description: change from `"Tell your friends"` to `"Send a link to a friend or colleague"`

#### 3. Add clickable contact email and website below the DeveloperCreditCard

The `DeveloperCreditCard` already renders an email button and website link, so these are covered. However, for clarity and accessibility, add small text links directly below the card (after line 544) that are visible even without hovering the 3D card:

```tsx
<div className="flex items-center justify-center gap-4 mt-2">
  <a
    href="mailto:contact@magdysaber.com"
    className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
  >
    <Mail className="w-3 h-3" />
    contact@magdysaber.com
  </a>
  <a
    href="https://magdysaber.com"
    target="_blank"
    rel="noopener noreferrer"
    className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
  >
    <Globe className="w-3 h-3" />
    magdysaber.com
  </a>
</div>
```

### Summary of Edits

All in `src/pages/SettingsPage.tsx`:

1. **Line ~499** — Insert privacy reassurance text with Privacy Policy link after the biometric card
2. **Line ~544** — Insert plain-text contact email and website links below the DeveloperCreditCard
3. **Line ~567** — Update "Rate WiseResume" description
4. **Line ~575** — Update "Share WiseResume" description

### No new imports or dependencies needed
All icons (`Mail`, `Globe`, `Shield`) are already imported. No new components required.

