

## Dynamic Changelog from `changelog.json`

### Approach

Create a static `public/changelog.json` file that the app fetches at runtime. This is the simplest, most maintainable approach: no database table needed, no edge function, no authentication required. You just edit a JSON file and redeploy (or even hot-swap it via CDN).

---

### New File: `public/changelog.json`

A JSON array of release entries:

```text
[
  {
    "version": "v1.5.0",
    "date": "2026-02-10",
    "latest": true,
    "items": [
      {
        "title": "Polished Tailor Loading Screen",
        "description": "Smooth real-feel progress animation with cubic ease-out curve, animated percentage counter, glowing progress bar, estimated time remaining, and fun facts carousel."
      },
      {
        "title": "Mobile Scroll Fixes",
        "description": "Fixed non-scrollable pages on mobile for Job Details, Application Details, Cover Letters, and Notifications pages."
      },
      ...
    ]
  },
  {
    "version": "v1.0.0",
    "date": "2025-12-01",
    "items": [
      {
        "title": "Initial Release",
        "description": "AI writing assistant, 12 templates, ATS scoring, PDF export, cloud sync, biometric lock, interview prep."
      }
    ]
  }
]
```

### Changes to `src/pages/SettingsPage.tsx`

1. Add a `useEffect` that fetches `/changelog.json` when `changelogOpen` becomes `true` (lazy load -- no fetch until user opens the dialog).
2. Store results in local state: `changelogData` array + `changelogLoading` boolean.
3. Replace the hardcoded JSX (lines 1122-1153) with a `.map()` over the fetched data, rendering each version with its items dynamically.
4. Show a skeleton loader while fetching.
5. Show a "Could not load changelog" fallback on fetch error.
6. The version shown in the footer ("v1.5.0 -- WiseResume") will also read from the first entry's `version` field.

### How to Update the Changelog

After implementation, updating is simple:

1. Open `public/changelog.json` in any text editor
2. Add a new entry at the **top** of the array with `"latest": true`
3. Remove `"latest": true` from the previous entry
4. Deploy -- the app will show the new changelog immediately

No code changes, no database migrations, no edge functions. Just edit JSON and push.

---

### Files to Modify

| File | Change |
|------|--------|
| `public/changelog.json` | New file -- structured changelog data |
| `src/pages/SettingsPage.tsx` | Fetch changelog.json on dialog open, render dynamically, show skeleton while loading |

