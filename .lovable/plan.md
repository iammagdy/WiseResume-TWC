

## Add Section Descriptions to Settings Page

### What Changes

Each section heading currently shows only an uppercase label (e.g., "APPEARANCE"). The request is to add a short 1-line description beneath each section title to help users understand what that group controls at a glance.

### File: `src/pages/SettingsPage.tsx`

Add a `<p className="text-xs text-muted-foreground mb-3 px-1">` line directly after each `<h2>` section header. No new components or dependencies needed.

### Section Descriptions

| Section | Description |
|---|---|
| Appearance | Theme, language, and display preferences |
| AI & Voice | Choose your AI engine and voice settings |
| Editor & Export | PDF output and resume backup options |
| Notifications | Control alerts and suggestion prompts |
| Privacy & Security | Biometric lock and data protection |
| Account | Sign out or delete your data |
| About & Help | App info, onboarding, and sharing |

### Technical Detail

Each section block currently follows this pattern:

```text
<div>
  <h2 ...>Section Title</h2>        // uppercase label
  <div className="rounded-2xl ...">  // glass card
```

It will become:

```text
<div>
  <h2 ...>Section Title</h2>        // unchanged
  <p className="text-xs text-muted-foreground mb-3 px-1">
    One-line description here
  </p>
  <div className="rounded-2xl ...">  // unchanged
```

This adds 7 single-line `<p>` tags across the file. No logic, state, or component changes.

