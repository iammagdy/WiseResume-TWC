# Tailor Tool Quality Backlog

**Status:** Planned improvement track
**Atlas role:** Durable summary of the useful findings from the former Tailor Tool backlog and health audit. The old external document was removed because Atlas is now the only documentation source of truth.

## Product Goal

The Tailor tool should feel reliable, transparent, and fast: users paste a job description, receive a stronger targeted resume, understand what changed, preview before committing, and move directly to download or application tracking.

## Bugs and Flow Gaps to Recheck

Before implementation, verify each item against the live code because the old backlog referenced historical Supabase/Replit paths.

- Refund credits when section regeneration or AI scoring fails after a charge.
- Retry only temporary failures and avoid conditions that skip retry by mistake.
- Send full project and education data to the AI when regenerating those sections.
- Avoid duplicate rate-limit checks for the same request.
- Let score retry recalculate only the score instead of charging for a full re-tailor.
- Render change summaries as text, not raw objects.
- Include all tailored sections in plain-text copy/export.
- Do not pass long job descriptions through URLs; store them in app state or persistence.
- Preserve section toggles when re-tailoring.
- Avoid unnecessary progress animation re-renders.

## UX Improvements to Recheck

- Intensity choices should have clear labels, not only icons.
- Section regeneration needs per-card loading feedback.
- Cached result restore should identify the related job and avoid restoring irrelevant results.
- Skill suggestions should modify the tailored draft, not the original resume, until the user commits.
- Keep preview/review flow explicit; avoid redundant auto-navigation.
- Add formatted resume preview before applying tailored changes.
- After applying, show persistent next actions such as opening the new resume and downloading it.
- Compare view must always use the correct original baseline, including restored cached results.

## Future Enhancements

1. Reveal tailored sections as they complete.
2. Re-score live as sections are toggled.
3. Allow inline bullet editing with keyword highlighting.
4. Add saved job descriptions.
5. Add optional ATS targeting, such as Workday, Greenhouse, Lever, iCIMS, or other.
6. Show a transparent score breakdown.
7. Offer one-click application tracker creation after applying.
8. Add a resume picker inside the Tailor flow.
9. Keep named Tailor history snapshots.
10. Show a "still missing" gap card for real skills/requirements the user cannot honestly claim.
11. Allow direct PDF export from Tailor results.

## Backend Health Items to Revalidate

- Confirm the canonical database and server architecture in live code before acting.
- Check whether any deployed functions have no source in the repo.
- Check whether orphan endpoints still exist.
- Verify cover letter and resignation letter persistence before changing related flows.
- Avoid widening admin or data access during Tailor work.
