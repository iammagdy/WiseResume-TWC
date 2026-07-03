# PublicBriefPage

**Last verified:** 2026-04-17
**Type:** reference card
**Sources:**
- `src/pages/share/PublicBriefPage.tsx`
- `src/AppInterior.tsx` (route registration)
- `project-governance/PRODUCT.md` § 3 (WiseHire candidate brief sharing)
- `project-governance/CONSTITUTION.md` § 7 (WiseHire scope)

**Canonical owner:** `project-governance/PRODUCT.md` § 3 (WiseHire candidate brief feature).

---

**What it is:** Public, token-gated share page for a WiseHire candidate brief. An HR user generates a brief, copies the share URL, and a hiring manager / interviewer / external stakeholder can view it without a WiseHire login.

**Route(s):**
- `/share/brief/:shareToken` — registered in `src/AppInterior.tsx`

**Where it lives:** `src/pages/share/PublicBriefPage.tsx`

**Related:**
- WiseHire Phase 1 deep dive: `Project Atlas/01-Currently Implemented/critical-systems/05-wisehire-phase-1.md`
- Sibling page (resumes/portfolios): `Project Atlas/01-Currently Implemented/pages/share.md`
- Pages index: `Project Atlas/01-Currently Implemented/pages/README.md`
