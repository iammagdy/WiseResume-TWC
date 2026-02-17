

## Update to v2.0.0 with Professional Changelog

### What Changes

**Single file update: `public/changelog.json`**

Add a new v2.0.0 entry at the top of the array (with `"latest": true`) and remove the `"latest"` flag from the old v1.6.0 entry. The version displayed in the Settings footer automatically picks up the first entry, so no code changes are needed.

### New v2.0.0 Changelog Entry

Date: 2026-02-17

The following items will be listed, covering all recent fixes implemented across the last several sessions:

1. **Unsaved Changes Navigation Guard** -- "Never lose your work again. The editor now detects unsaved changes and prompts you to Save, Discard, or Cancel before navigating away -- including Android hardware back button support."

2. **Offline Sync Conflict Detection** -- "Smart conflict resolution when syncing offline edits. If a resume was updated on another device, a clear dialog lets you choose between the server version or your local changes."

3. **Improved Touch Targets** -- "All interactive elements in the editor and application tracker now meet the 44px accessibility standard, reducing accidental taps on mobile devices."

4. **Mobile Delete Confirmation** -- "Deleting a job application on mobile now opens a thumb-friendly bottom drawer for confirmation instead of triggering immediately."

5. **Editor Section Accessibility** -- "AI action buttons in resume section headers are now properly sized for comfortable one-handed use on all screen sizes."

### Files Changed

- `public/changelog.json` -- add v2.0.0 entry at top, move `latest` flag

### How the Version Appears

The Settings page footer reads `WiseResume {appVersion}` where `appVersion` is derived from the first changelog entry:

```text
const appVersion = changelogData[0]?.version || 'v1.5.0';
```

So updating the JSON is all that is needed to display "WiseResume v2.0.0" across the app.

