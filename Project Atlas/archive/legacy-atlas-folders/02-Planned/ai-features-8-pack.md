# AI Features 8-Pack (designed, not built)

**Status:** designed; not built.
**Last verified:** 2026-04-17
**Sources:**
- `docs/ai_features_design.md`

**Canonical owner:** `docs/ai_features_design.md`.

---

The eight features are listed in the design doc. They are **not** in any of the live edge functions today (verified against `supabase/functions/` listing of 93 functions, 2026-04-15). High-level summary (re-read the doc for full requirements):

1. Cover Letter v2 — multi-tone, multi-length, side-by-side variant compare
2. Real-time ATS suggestions panel (live as user types, not on demand)
3. Interview performance dashboard (post-mock-interview retro analytics)
4. Skill gap analyzer with curated learning path output
5. Public portfolio chat personalisation (recruiter-side adaptive greetings)
6. Bulk section booster (one-click rewrite all bullets at once)
7. AI job match scoring with confidence + reason breakdown
8. Interview question bank — custom practice mode

**Hard constraints** (carry forward):
- Each feature must wire the four-layer security stack (critical-system 09).
- Each AI call deducts via `atomic_attempt_and_deduct_credit` unless explicitly Rule-B'd in governance.
- Tool outputs that benefit from caching should use the `tool_cache` table pattern.
