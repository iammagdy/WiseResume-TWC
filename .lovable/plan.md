

## Make GitHub Button Match Contact Button

### What Changes

The GitHub button will be expanded from an icon-only square button to a full-width button matching the Contact button style. It will show the GitHub logo icon followed by the text "GitHub", just like the Contact button shows a mail icon followed by "Contact".

Both buttons will be equal width (each taking 50% of the row).

### File: `src/components/settings/DeveloperCreditCard.tsx`
- Change the GitHub button from icon-only to icon + text layout
- Use the same `dev-contact-btn` base class so both buttons look identical
- Add "GitHub" text next to the logo image

### File: `src/components/settings/DeveloperCreditCard.css`
- Update `.dev-btn-row` so both children share equal width (`flex: 1` on both)
- Remove the fixed-width `.dev-github-btn` style and instead make it use the same style as the contact button

### Result
```
[ (mail-icon) Contact ] [ (github-logo) GitHub ]
   ---- 50% ----          ---- 50% ----
```

Both buttons will have the same glass background, glow animation, padding, and font styling.
