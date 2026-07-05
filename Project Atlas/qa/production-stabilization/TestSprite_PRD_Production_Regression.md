# TestSprite — Production Regression Test PRD

**Date:** 2026-07-05
**Status:** PRD ONLY — execution requires `TESTSPRITE_API_KEY` environment variable
**TestSprite MCP:** Configured at `.mcp.json` (server: `@testsprite/testsprite-mcp@latest`)
**Execution:** `NOT RUN — TOOL UNAVAILABLE` (API key not available in current environment)

---

## 1. Overview

This document defines the TestSprite frontend regression test plan for WiseResume production at `https://wiseresume.app`. TestSprite should only be run after the prioritized fix plan (Phase 9) has been implemented.

---

## 2. Test Execution Rules

| Rule | Setting |
|------|---------|
| Target URL | `https://wiseresume.app` |
| Framework | React SPA (Vite) — wait for client-side render |
| Authentication | Test credentials required (see QA account — do not embed in tests) |
| Skip payments | ✅ YES — billing/payments disabled |
| Skip admin/devkit | ✅ YES — no `/devkit` or `/devkit2` tests |
| Skip delete account | ✅ YES — destructive |
| Skip destructive actions | ✅ YES |
| Skip OAuth | ✅ YES — not available in automated context |
| Turnstile limitation | ⚠️ Contact form captcha will fail in headless automation |

---

## 3. Test Scenarios

### 3.1 Auth (2 scenarios)

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| A1 | Login page renders | Navigate to `/auth/login` | Login form visible; email and password inputs present; submit button enabled |
| A2 | Invalid login shows error | Enter invalid email/password, submit | Error message displayed; no redirect; form remains |

**Skip**: OAuth buttons, account creation, password reset (requires email).

### 3.2 Dashboard (2 scenarios)

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| D1 | Dashboard loads for authenticated user | Login, navigate to `/dashboard` | Dashboard renders; resume list or empty state visible |
| D2 | Create Resume action visible | On dashboard | "New Resume" or "Create Resume" button visible and clickable |

### 3.3 Resume Editor (3 scenarios)

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| E1 | Editor loads with a resume | Click existing resume or create new | Editor renders; template preview visible; sections (contact, summary, experience, education, skills) present |
| E2 | Edit summary field | Type in summary field | Text updates; autosave indicator appears |
| E3 | Template switching | Click template selector, choose different template | Preview updates; template changes persist |

### 3.4 Upload / Import (2 scenarios)

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| U1 | Upload page loads | Navigate to upload page | File upload area visible; supported formats listed |
| U2 | Upload rejected for invalid type | Try to upload .exe or unsupported | Error toast "Unsupported file type" |

**Skip**: Actual PDF/DOCX parsing (requires real files, may fail in headless).

### 3.5 Tailoring Hub (2 scenarios)

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| T1 | Tailoring Hub landing loads | Navigate to `/tailoring-hub` | Landing page with job description input visible |
| T2 | Continue to result page | If a previous result exists (test data) | Result page renders score; otherwise skip |

**Skip**: Live AI tailoring (requires real API calls, credits, and may be slow).

### 3.6 Preview / Export (2 scenarios)

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| P1 | Preview page loads with resume | Navigate to `/preview?id=<existing_resume_id>` | Preview renders resume template; export buttons visible |
| P2 | Export options available | Click download/export | Export menu shows Designed PDF, ATS PDF, DOCX options |

**Skip**: Actual file download (browser download dialogs not reliable in automation).

### 3.7 Cover Letter (1 scenario)

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| C1 | Cover letter page loads | Navigate to cover letter page | Page renders; resume picker visible; job description input visible |

**Skip**: Live AI generation (requires API call).

### 3.8 Company Briefing (1 scenario)

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| B1 | Company briefing page loads | Navigate to company briefing | Page loads; input for company name/URL visible |

### 3.9 Public Portfolio (2 scenarios)

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| PF1 | Public portfolio page loads | Navigate to `/p/<existing_username>` | Portfolio renders; visitor info visible; contact form visible |
| PF2 | Password-protected portfolio | Navigate to password-protected portfolio | Password gate shown; try incorrect password — error displayed |

**Skip**: Contact form submission (Turnstile captcha blocks automation).

### 3.10 Settings (1 scenario)

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| S1 | Settings page loads | Navigate to settings | Account information visible; plan/credits displayed |

### 3.11 Navigation / Routing (2 scenarios)

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| N1 | Landing page loads (unauthenticated) | Navigate to `/` | Landing page renders; login/signup CTAs visible |
| N2 | Public routes accessible without auth | Navigate to `/guides`, `/examples` | Content renders (may show async loading) |

---

## 4. Test Data Requirements

| Data | Status | Notes |
|------|--------|-------|
| Existing QA resume | NEEDED | TestSprite needs at least one resume in the QA account to test editor/preview |
| Public portfolio username | NEEDED | Needed for portfolio scenario |
| Job description for tailoring | TEXT | Can use any generic job description |

---

## 5. Known Failures to Ignore

| Failure | Reason | Action |
|---------|--------|--------|
| AI tool returns error | Provider may fail or credit exhausted | Verify error message is user-friendly, not crash |
| Contact form 500 | Turnstile captcha blocked in headless | Expected — skip or expect captcha error |
| Export download not triggered | Browser security blocks auto-download | Check CTA appears, not actual file |
| Feature_arabic_locale disabled | `feature_arabic_locale: false` in production | — |

---

## 6. Execution

**Status**: `NOT RUN — TOOL UNAVAILABLE`

TestSprite MCP is configured at `.mcp.json` but requires `TESTSPRITE_API_KEY` environment variable. To run:

```bash
# Set the API key:
export TESTSPRITE_API_KEY="<key>"
# Then run (in Claude Code or compatible environment):
# /testsprite
```

---

## 7. After Execution

- Review results in TestSprite dashboard
- Do not treat missing test fixture data as product bugs
- Report any UI crashes or regressions as P0/P1
- Report visual issues as P2/P3

---

*End of TestSprite PRD*
