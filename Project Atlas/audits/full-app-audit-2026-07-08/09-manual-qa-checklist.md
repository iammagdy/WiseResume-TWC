# Manual QA Checklist

Use dedicated test accounts/data. Record URL, viewport, locale, timestamp, request ID, screenshot, downloaded-file evidence, and Appwrite execution ID. Do not perform dangerous DevKit actions.

## Auth/onboarding

- [ ] Sign up, verify email, first profile seed, onboarding completion.
- [ ] Login/logout/returning session/expired session.
- [ ] Google/GitHub/LinkedIn providers actually shown and working.
- [ ] OTP reset: expiry, attempts, reuse, invalid challenge, Arabic copy.

## Dashboard/editor/import

- [ ] Empty and populated dashboard; create/manual/upload CTAs.
- [ ] PDF, DOCX, scanned PDF, 10MB boundary, malformed/oversized file.
- [ ] URL import valid/invalid/private/redirect/timeout (after Batch 1).
- [ ] Autosave, refresh, concurrent tab, dirty navigation, add/edit/delete/reorder.
- [ ] AI summary/bullets/skills, quota exhausted, retry, unchanged/invalid output.
- [ ] Template selection and preview sync at desktop/mobile.

## Export

- [ ] PDF/ATS/DOCX/plain text where offered; verify actual file opens.
- [ ] Correct resume, selected template, Arabic RTL/fonts, page breaks.
- [ ] Tailored-result export and direct preview deep link/refresh.

## Tailoring/jobs/applications

- [ ] Paste JD and URL import; resume selection and double-click guard.
- [ ] Provider timeout/fallback/malformed JSON/unchanged output warnings.
- [ ] Result persistence, refresh, history, template switch, tracker status.
- [ ] `/jobs` direct production URL, Fast Tailor, external apply links.

## Portfolio

- [ ] Publish/unpublish and selected resume.
- [ ] Public payload contains no owner email/internal user ID/password hash.
- [ ] Password attempts, lockout, token expiry, cross-user isolation.
- [ ] Contact Turnstile success/failure, email, notification, duplicate/rate limit.
- [ ] Visitor/interest tracking, visit completion binding, analytics correctness.
- [ ] Custom-domain state matches product promise.

## Accessibility/responsive/localization

- [ ] 1440px and 390×844; 200% zoom; no clipped/stuck scrolling.
- [ ] Keyboard-only focus order, visible focus, escape, trap, focus return.
- [ ] Screen-reader names, labels, errors, live regions, non-toast confirmation.
- [ ] Light/dark/reduced motion and English/Arabic RTL on every critical flow.

## Appwrite/operations

- [ ] Function execute permissions and API key scopes.
- [ ] Collection document security, owner permissions, indexes, attributes.
- [ ] Required secrets on exact functions; no secret values recorded.
- [ ] Source hashes match deployed sources.
- [ ] Workflow refuses blank and `all` after Batch 1; targeted dry-run only.

