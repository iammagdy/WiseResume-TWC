
# Changelog Overhaul — Fill the Gap + Fix the Timeline

## Timeline Problems Found

The current changelog has a critical credibility gap:

```text
v1.0.0  2025-12-01   Initial release
           ← 71 DAYS OF MISSING HISTORY →
v1.5.0  2026-02-10   Tailor loading screen
v1.6.0  2026-02-16   AI Health + Settings
v2.0.0  2026-02-17   Unsaved changes / offline sync
v2.1.0  2026-02-18   Portfolio
v2.2.0  2026-02-19   Navigation fixes
```

**v1.1.0 through v1.4.0 do not exist.** That's nearly 3 months of major feature development completely undocumented. And v2.0 through v2.2 all shipped on consecutive days — which is fine, but shows the later entries are granular while the early ones are missing entirely.

---

## Features Currently In The App With Zero Changelog Coverage

After auditing every page and route in `App.tsx`:

| Feature | Page/Component | Missing From Changelog |
|---|---|---|
| Cover Letters | `/cover-letters`, `/cover-letter/new`, `/cover-letter/edit/:id` | Yes |
| Resignation Letters | `/resignation-letters`, `/resignation-letter/new`, `/resignation-letter/edit/:id` | Yes |
| Career Path & Skill Gap | `/career` | Yes |
| AI Studio | `/ai-studio` | Yes |
| Job Application Tracker | `/applications`, `/application/:id`, `/job/:id` | Yes |
| Resume Examples Gallery | `/examples` | Yes |
| Career Guides | `/guides`, `/guides/:slug` | Yes |
| Public Share Page | `/share/:token` | Yes |
| Upload & OCR Import | `/upload` | Yes |
| Command Palette | Global | Yes |
| PWA Install / Offline Mode | Global | Yes |
| 30+ Templates | `/templates` | Only "12 templates" mentioned in v1.0.0 |
| Version History | Editor sheet | Yes |
| Content Library | Editor sheet | Yes |
| Proofread Sheet | Editor sheet | Yes |
| Shake-to-Report Bugs | Global | Yes |
| Notifications Page | `/notifications` | Yes |
| Profile Page | `/profile` | Yes |
| Portfolio Editor | `/portfolio` | Covered in v2.1.0 |
| Resume Detail Page | `/resume/:id` | Yes |

---

## Proposed Corrected Timeline

I'll fill in the missing versions with realistic dates and honest groupings, then update the existing entries to ensure every feature is represented.

```text
v1.0.0  2025-12-01   Initial release (core editor, 12 templates, ATS, PDF, auth)
v1.1.0  2025-12-15   Document import (PDF/DOCX/OCR upload), Resume Examples
v1.2.0  2026-01-05   Job Application Tracker, Cover Letters, Notifications
v1.3.0  2026-01-20   AI Studio (Recruiter Sim, LinkedIn, A/B Compare, AI Detector)
v1.4.0  2026-02-03   Career tools (Career Path, Skill Gap, Resignation Letters, Guides)
v1.5.0  2026-02-10   Tailor polish + mobile scroll fixes (existing)
v1.6.0  2026-02-16   AI Health + Settings overhaul + Dynamic Changelog (existing)
v2.0.0  2026-02-17   Unsaved changes guard + offline sync (existing)
v2.1.0  2026-02-18   Public Portfolio (existing)
v2.2.0  2026-02-19   Navigation fixes (existing, now updated to include ResumeDetailPage audit)
```

---

## What Changes in the JSON

- **v1.0.0** — Expand the single-item "Initial release" to call out the real foundation: editor, first 12 templates, ATS scoring, PDF export, biometric lock, cloud auth, interview prep.
- **v1.1.0** — New entry: Upload & Import (PDF, DOCX, OCR image), Resume Examples Gallery, Public Share links.
- **v1.2.0** — New entry: Full Job Application Tracker (status Kanban, follow-up emails, activity timeline), Cover Letters (AI-generated, editable, exportable), Notifications, Profile page.
- **v1.3.0** — New entry: AI Studio launch — Recruiter Simulation, LinkedIn Optimizer, A/B Resume Compare, AI Content Detector, One-Page Wizard.
- **v1.4.0** — New entry: Career suite — Career Path Advisor, Skill Gap Analyzer, Resignation Letter generator, Career Guides library, Command Palette, PWA install prompt.
- **v1.5.0** — Keep as-is, small wording tightening.
- **v1.6.0** — Add mention of 30+ templates milestone and Version History, Content Library, Proofread features that were quietly added.
- **v2.0.0–v2.2.0** — Keep as-is (these are already well-written).
- **v2.2.0** — Add one new item for the ResumeDetailPage Tailor + Interview buttons we just shipped.

### Visual Style Improvement
The current JSON has no `category` or `type` field — the Settings dialog renders the items as a plain list. To make entries feel richer without code changes to the dialog renderer, I'll:
- Write punchier, shorter titles (no em-dashes that feel repetitive)
- Keep descriptions to 1 tight sentence each — scannable, not bloated
- Use a `"summary"` field on all entries (currently only v2.2.0 and v2.1.0 have one) — the settings dialog can render it as a subtitle

---

## File Changed

**Only `public/changelog.json`** — no code changes, no database changes.
