# WiseHire Phases 2–4

**Status:** Phase 1 shipped 2026-04-15 (live, invite-only). Phases 2–4 planned.
**Last verified:** 2026-04-17
**Sources:**
- `specs/001-wisehire-hr-platform/spec.md`
- `project-governance/PRODUCT.md` §3
- `project-governance/CONSTITUTION.md` §7 (WiseHire Governance)
- `project-governance/DECISIONS.md` Decision #7 + #8

**Canonical owner:** `specs/001-wisehire-hr-platform/spec.md`.

---

## Phase 2 — Pipeline depth (planned)

- Bulk Screen at scale (already in Phase 1 surface but expanding to async background jobs)
- Bias Reduction Mode (Candidate Masking) — UI polish + audit log
- Reusable scorecard templates per role family
- Outreach email drip sequences (Resend-backed)
- Calendar integration (Google + Outlook) for interview scheduling

## Phase 3 — Talent pool + analytics + mobile (planned)

- Opt-in Talent Pool from WiseResume job seekers (current `talent_pool_profiles` table)
- Hiring funnel + time-to-offer analytics dashboard (depth beyond Phase 1)
- **Mobile responsive** — explicit lift of the desktop-first carve-out (Decision #8)

## Phase 4 — Multi-seat + Enterprise (planned)

- Per-tier seat counts: Starter 1, Pro 3, Business 10, Enterprise unlimited
- Role-based access control inside an HR company
- SSO (SAML/OIDC), SCIM provisioning
- Custom AI configuration per company
- 99.9% uptime SLA
- White-label option

## Hard constraints (carry forward from Phase 1)

- `account_type` immutable post-signup. Every `/wisehire/*` route gated by `WiseHireGuard`. → Constitution §7.4.
- No free tier. Post-trial = "Contact Us" (no degraded mode). → Constitution §7.2.
- Candidate data owned by HR uploader, deleted 30 days post-cancellation. → Constitution §7.5.
- Fail-closed AI rate limits. → Architecture §8.

## Pricing (already defined)

| Tier | Price | Roles | Briefs/day | Seats |
|---|---|---|---|---|
| Starter | $49/mo | 3 | 5 (BYOK) | 1 |
| Professional | $149/mo | ∞ | 50 | 3 |
| Business | $399/mo | ∞ | ∞ | 10 |
| Enterprise | Custom | ∞ | ∞ | ∞ |

→ `project-governance/PRODUCT.md` §3.
