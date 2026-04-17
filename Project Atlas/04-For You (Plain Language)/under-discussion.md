# What's Just an Idea Right Now

**Last verified:** 2026-04-17
**Audience:** you (the owner). No code, no jargon, no technical paths.
**Sources (governance — supreme):**
- `project-governance/ARCHITECTURE.md` (especially Rule B — no AI in the resume scorer; Rule C — orphan code retention)
- `project-governance/DECISIONS.md` (especially Decision #4 — implicit OAuth carve-out; Decision #5 — soft-delete default; Decision #8 — desktop-first WiseHire carve-out)
- `replit.md` (working notes — server-side LinkedIn importer quota section)
- `docs/issues/interview-feature-issues.md`, `docs/issues/portfolio-feature-issues.md` (issue backlogs that surface several of the items below)

---

These are things we have **thought about** but **not committed to**. There is no spec, no roadmap entry, no plan. They live here so they don't get lost.

1. **Pull GitHub repos into the public portfolio.** A backend helper for this exists already but no UI is wired up to it. Listed as "intentionally retained" — meaning we're not deleting it, but we're not finishing it either, until we decide.

2. **Replace the deterministic resume scorer with an AI scorer.** The current scorer is a hand-tuned formula (no AI, no cost per use). Switching to AI would cost credits per scoring call and would have to be voted in by an explicit governance change.

3. **Make WiseHire mobile-friendly.** Phases 1 and 2 are desktop-only on purpose (HR users work on laptops). Phase 3 plans to fix this — but until that phase opens, mobile WiseHire is just an idea.

4. **Switch the sign-in flow back to a more secure handshake (PKCE).** We use a slightly less strict flow today (implicit OAuth) because of a quirk with our auth provider's custom-domain support. When that improves, we may switch back.

5. **Hard-delete (instead of soft-delete) for compliance edge cases.** Today, deleted things go to a "soft delete" recycle bin for 30 days. For some legal cases (right to be forgotten requests, etc.) we may need to bypass the recycle bin and actually wipe the data. The policy hasn't been written.

6. **Remember LinkedIn import quotas across server restarts.** Today we limit how many LinkedIn imports a user can do, but the counter is in memory and resets if the server restarts. Making it permanent is on the team's task list but not yet scheduled.

---

If any of these turn into "yes, let's do it" with a written spec, they move from this file to "coming soon". If they're built, they move to "current features".
