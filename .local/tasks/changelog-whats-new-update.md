# Task: Changelog & What's New — Generic Security Language + New Landing Entry

## Objective
Three focused file changes:
1. Rewrite the `public/changelog.json` v3.3.0 entry in warm, generic language (no technical terms)
2. Add a new timeline entry to `WhatsNewPage.tsx` about the security improvements, in plain user language
3. Bump `package.json` version from `2.5.2` → `2.5.3` (patch bump)

## Files to Change

### 1. `public/changelog.json` — Rewrite v3.3.0 items

Current v3.3.0 entry talks about "User-Agent fingerprinting", "rate limiting", "Referer validation" — too technical.

Replace the 5 items with 3 softer, reassuring items like:

- **"We're always working to keep your data safe"** — Behind the scenes we've added new layers of protection across WiseResume. Everything is quietly looked after so you can focus on your job search.
- **"Your contact details stay private"** — We've made it harder for unwanted bots to collect your contact information from your public portfolio. Real visitors see everything normally — nothing changes for them.
- **"Ongoing improvements and bug fixes"** — This update includes reliability fixes and behind-the-scenes improvements that make WiseResume faster and more dependable for everyone.

Keep summary also generic: "Ongoing security improvements and reliability fixes to keep WiseResume fast, safe, and dependable."

### 2. `src/pages/WhatsNewPage.tsx` — New entry at top of `changelog` array

Add before the existing first April 2026 entry. Use the `Shield` icon (already imported). Use green/emerald colour theme (same as the March 2026 "Your Account is More Secure" entry).

```ts
{
  date: 'April 2026',
  tag: 'Security',
  tagBg: 'bg-emerald-500/10',
  tagText: 'text-emerald-600 dark:text-emerald-400',
  iconBg: 'bg-emerald-500/15',
  icon: Shield,
  title: 'Better Protection for You and Your Portfolio',
  description:
    'We've quietly upgraded the security layers across WiseResume. Your public portfolio page and your personal data are better protected than ever — and none of it changes anything about how you use the app.',
  highlights: [
    'Your contact details on your portfolio are now shielded from automated bots and scrapers',
    'New safeguards make it harder for unwanted tools to interact with your public page',
    'Continuous behind-the-scenes improvements to keep everything running safely and reliably',
  ],
},
```

### 3. `package.json` — Bump version

`"version": "2.5.2"` → `"version": "2.5.3"`

## Acceptance Criteria
- `public/changelog.json` v3.3.0 reads as warm, non-technical, reassuring — no mentions of "rate limiting", "bot guard", "fingerprinting", "referer", or any technical term
- `WhatsNewPage.tsx` shows the new Security entry at the very top of the April 2026 section, before the "Smarter AI Errors" entry
- `package.json` version is `2.5.3`
- App builds without errors
