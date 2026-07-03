# Risk Register - WiseResume Security + Cleanup Audit 2026-06-14

**Purpose:** Prioritized list of all risks identified during audit  
**Format:** ID, Risk, Severity, Likelihood, Impact, Owner, Mitigation, Status

---

## Critical Risks (Immediate Action Required)

None identified.

---

## High Risks (Action Required Within 1 Week)

| ID | Risk | Area | Severity | Likelihood | Impact | Mitigation | Status |
|----|------|------|----------|------------|--------|------------|--------|
| R-H1 | Workflow uses stale FRONTEND_URL domain | CI/CD | High | High | Medium | Update to wiseresume.app | Open |
| R-H2 | Console.log may leak PII to browser console | Frontend | High | Medium | High | Audit and remove debug logs | Open |
| R-H3 | Email rate limit resets on cold start | Backend | High | Low | Medium | Implement persistent rate limit | Deferred |
| R-H4 | Plan cache stored unencrypted in localStorage | Frontend | High | Low | Low | Acceptable risk - revalidated server-side | Accepted |
| R-H5 | Non-atomic credit deduction race condition | Backend | High | Low | High | Idempotency + rate limiting | Mitigated |

---

## Medium Risks (Action Required Within 1 Month)

| ID | Risk | Area | Severity | Likelihood | Impact | Mitigation | Status |
|----|------|------|----------|------------|--------|------------|--------|
| R-M1 | 167 Supabase/Kinde references confuse developers | Documentation | Medium | High | Low | Gradual cleanup of test mocks | Open |
| R-M2 | Old domain in test files may cause false positives | Tests | Medium | Medium | Low | Update test expectations | Open |
| R-M3 | Idempotency cache grows indefinitely | Database | Medium | Low | Medium | Add cleanup job | Open |
| R-M4 | Unused dependencies increase attack surface | Dependencies | Medium | Medium | Low | Run depcheck and remove | Open |
| R-M5 | Mobile app code may be unmaintained | Mobile | Medium | Medium | Medium | Product decision needed | Open |
| R-M6 | AI request logs may contain PII | Privacy | Medium | Low | High | Verify sanitizeAiPayload coverage | Open |
| R-M7 | Test files use stale Supabase mocks | Tests | Medium | High | Low | Update to Appwrite patterns | Open |
| R-M8 | drizzle-orm/pg may be unused | Dependencies | Medium | Medium | Low | Verify and remove if unused | Open |

---

## Low Risks (Monitor or Address When Convenient)

| ID | Risk | Area | Severity | Likelihood | Impact | Mitigation | Status |
|----|------|------|----------|------------|--------|------------|--------|
| R-L1 | revenuecat-webhook folder empty but present | Cleanup | Low | N/A | None | Delete folder | Open |
| R-L2 | Replit config files may be unused | Cleanup | Low | N/A | None | Verify and remove | Open |
| R-L3 | CHANGELOG.md very large | Documentation | Low | N/A | None | Archive old entries | Open |
| R-L4 | Duplicate docs in two locations | Documentation | Low | N/A | None | Consolidate | Open |
| R-L5 | @testing-library/dom in wrong category | Dependencies | Low | N/A | None | Move to devDeps | Open |

---

## Accepted Risks (Known and Documented)

| ID | Risk | Area | Rationale |
|----|------|------|-----------|
| R-A1 | In-memory rate limiter for email | Backend | Known limitation, Phase 5 deferred per CHANGELOG |
| R-A2 | APPWRITE_API_KEY used for internal tokens | Backend | Short-lived tokens reduce exposure |
| R-A3 | Functions use 'any' execute permission | Backend | Functions self-authenticate with JWT |
| R-A4 | Startup validation logs to console | Backend | No secrets logged, only presence indicators |
| R-A5 | Supabase references in error messages | UX | Gradual migration acceptable |

---

## Risk Matrix

```
Impact
  High |  R-H3   R-H5  |  R-H2   R-H4
       |  R-H1   R-M3  |  R-M6
       |---------------|------------
       |  R-M8         |  R-M1  R-M7
       |               |  R-M2  R-M4
  Low  |  R-L1-L5      |  
       |_______________|____________
            Low              High
                  Likelihood
```

---

## Risk Owners and Next Actions

### DevOps/CI-CD Owner

| Risk | Action | Due |
|------|--------|-----|
| R-H1 | Update FRONTEND_URL in workflow | 2026-06-21 |
| R-L1 | Delete empty revenuecat-webhook folder | 2026-06-21 |

### Frontend Owner

| Risk | Action | Due |
|------|--------|-----|
| R-H2 | Audit and remove console.log statements | 2026-06-21 |
| R-H4 | Document plan cache security model | 2026-06-21 |
| R-M7 | Update test mocks to Appwrite | 2026-07-14 |

### Backend Owner

| Risk | Action | Due |
|------|--------|-----|
| R-H3 | Implement persistent email rate limit | 2026-07-14 |
| R-H5 | Document credit race condition mitigation | 2026-06-21 |
| R-M3 | Add idempotency cache cleanup job | 2026-07-14 |
| R-M6 | Verify AI log sanitization | 2026-06-21 |

### Product Owner

| Risk | Action | Due |
|------|--------|-----|
| R-M5 | Decision on mobile app code | 2026-07-14 |
| R-L3 | Decision on CHANGELOG archiving | 2026-07-14 |

### Technical Debt Owner

| Risk | Action | Due |
|------|--------|-----|
| R-M1 | Cleanup Supabase references | 2026-07-14 |
| R-M2 | Update old domain references | 2026-07-14 |
| R-M4 | Run depcheck and remove unused deps | 2026-06-21 |
| R-M8 | Verify drizzle-orm/pg usage | 2026-06-21 |
| R-L2 | Verify Replit config usage | 2026-06-21 |
| R-L4 | Consolidate duplicate docs | 2026-07-14 |

---

## Risk Trending

### Decreasing (Recently Mitigated)

| Risk | Mitigation | Date |
|------|------------|------|
| AI prompt injection | Phase 1 hardening | 2026-06-05 |
| Credit bypass | Idempotency + rate limits | 2026-06-05 |
| Impersonation credit charging | X-Impersonating-User-Id header | 2026-06-03 |
| XSS in contact email | HTML escaping | 2026-06-05 |

### Stable (Under Control)

| Risk | Control |
|------|---------|
| Appwrite function auth | Self-authentication pattern |
| JWT handling | validateUserSession() in all functions |
| AI payload sanitization | sanitizeAiPayload() strips sensitive keys |

### Increasing (Monitor)

| Risk | Reason |
|------|--------|
| Idempotency cache size | No cleanup implemented |
| Test file staleness | Accumulating legacy mocks |
| Documentation sprawl | Multiple locations for docs |

---

## Risk Acceptance Criteria

A risk may be ACCEPTED if:
1. Documented in this register
2. Risk owner acknowledges
3. Mitigation alternatives evaluated
4. Review date set

A risk must be TREATED if:
1. Likelihood = High AND Impact >= Medium
2. Impact = High AND Likelihood >= Medium
3. Regulatory or compliance requirement
4. Customer-facing security concern

---

## Review Schedule

| Review | Date | Focus |
|--------|------|-------|
| Weekly | Every Monday | High risks |
| Monthly | First Monday | All open risks |
| Quarterly | Start of quarter | Full register review |

---

*Last updated: 2026-06-14*
