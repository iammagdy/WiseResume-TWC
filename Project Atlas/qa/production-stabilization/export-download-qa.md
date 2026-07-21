# Phase 5 — Export / Download QA Report

**Date:** 2026-07-05
**Status:** Tailoring Result export production browser verification completed; broader Arabic/mobile export coverage remains pending.
**Auditor:** AI Agent
**Production URL:** `https://wiseresume.app`

---

## 1. Export Architecture

### 1.1 Export Endpoints

| Endpoint | Method | Auth Required | Status |
|----------|--------|---------------|--------|
| `/api/export/pdf-native` | POST | JWT (`X-Appwrite-JWT`) | ✓ Returns 401 unauthenticated, 405 on GET |

**Export flow:**
1. Client renders resume template to HTML in the browser
2. HTML is serialized and sent to Vercel serverless function
3. Server spins up Puppeteer/Chromium, renders HTML, generates PDF
4. PDF buffer returned to client as arraybuffer
5. Client triggers browser download via `downloadFile()` utility

### 1.2 Download Utility (`src/lib/downloadUtils.ts`)

| Feature | Status | Notes |
|---------|--------|-------|
| Platform detection | ✓ | iOS share sheet, Android anchor, Desktop anchor |
| Empty blob rejection | ✓ | Returns `{ success: false, outcome: 'failed' }` |
| PDF validation | ✓ | `validatePdfBlob`: checks size >= 64 bytes, signature `%PDF-` |
| DOCX validation | ✓ | `validateDocxBlob`: checks ZIP signature, required entries |
| Memory cleanup | ✓ | `URL.revokeObjectURL` after 5 minutes |
| Retry for iOS share | ✓ | Up to `maxRetries` (default 1) |

### 1.3 Export Types

| Type | File Extension | Generation Method |
|------|---------------|-------------------|
| Designed PDF | `.pdf` | Puppeteer (Vercel serverless) — full layout |
| ATS PDF | `.pdf` | Puppeteer — simplified ATS-friendly layout |
| DOCX | `.docx` | Client-side JSZip generation |

---

## 2. Export Endpoint Verification

### 2.1 Endpoint Availability

| Test | Method | Expected | Actual | Verdict |
|------|--------|----------|--------|---------|
| GET `/api/export/pdf-native` | GET | 405 | 405 | ✓ Correct |
| POST `/api/export/pdf-native` (no auth) | POST | 401 | 401 | ✓ Correct |
| POST `/api/export/pdf-native` (with valid JWT) | POST | 200/pdf | UNTESTED | Needs browser session |

### 2.2 Auth Check

The PDF export endpoint requires `X-Appwrite-JWT` header. Verification:
- Line 663-690: `verifyAppwriteSession()` resolves JWT against Appwrite `/account`
- Rejects unauthenticated requests with 401

**Verdict**: PASS — auth is enforced server-side.

### 2.3 SSRF Protection

| Guard | Implementation | Verdict |
|-------|---------------|--------|
| Puppeteer request interception | `installPuppeteerRequestGuard()` (line 507) | ✓ |
| URL allowlist | `isPuppeteerRequestUrlAllowed()` — only `about:blank` and `data:` URIs | ✓ |
| Private IP rejection | `isPrivateOrLocalIpAddress()` IPv4 + IPv6 | ✓ |
| Hostname validation | `isPrivateOrLocalHostname()` — localhost, *.local | ✓ |

**Verdict**: PASS — dual-layer SSRF protection.

---

## 3. File Validation

### 3.1 PDF Validation

| Check | Implementation | Status |
|-------|---------------|--------|
| Size > 0 | `blob.size === 0` — rejected | ✓ |
| Minimum size | `blob.size < 64` — too small | ✓ |
| PDF signature | First 5 bytes must be `%PDF-` | ✓ |
| Empty/malformed rejection | Returns `{ success: false, outcome: 'failed' }` | ✓ |

### 3.2 DOCX Validation

| Check | Implementation | Status |
|-------|---------------|--------|
| Size > 0 | `blob.size === 0` — rejected | ✓ |
| ZIP signature | First 2 bytes must be PK (`0x50, 0x4b`) | ✓ |
| Required entries | `[Content_Types].xml` and `word/document.xml` must exist | ✓ |
| JSZip parsing | Full archive read on validation | ✓ |

---

## 4. Preview URL Actions

| URL Pattern | Action | Implementation |
|------------|--------|---------------|
| `/preview?id=<id>&action=download` | Designed PDF download | `initialAutoExportAction` captures at mount |
| `/preview?id=<id>&action=ats-pdf` | ATS PDF download | Same pattern |
| `/preview?id=<id>&action=docx` | DOCX download | Same pattern |
| `/preview?action=download` (no id) | Relies on Zustand store | Used by `ResumeDetailPage.tsx` |

**Key Architecture Detail** (PreviewPage.tsx lines 92-97):
```typescript
const initialAutoExportAction = useRef<string | null>(
  (() => {
    const a = searchParams.get('action');
    return ['download', 'ats-pdf', 'docx'].includes(a ?? '') ? a : null;
  })()
);
```

**Finding EXP-01**: Action is captured once at mount via `useRef` and never re-read. This prevents action loss during URL cleanup but means URL manipulation after load won't trigger export.

**Severity**: False positive — correct design.

### 4.1 Resume Bootstrap Flow

| Step | Implementation | Status |
|------|---------------|--------|
| Read `?id=` from URL | searchParams.get('id') | ✓ |
| Fetch resume from Appwrite | `useResume(resumeIdFromUrl)` | ✓ |
| Bootstraps once per resume | `bootstrappedResumeIdRef` comparison | ✓ |
| After 800ms timer shows fallback CTA | `setTimeout` cleanup in effect | ✓ |
| URL param cleanup | `setSearchParams` removes action/id after bootstrap | ✓ |

**Verdict**: PASS — correct resume bootstrap prevents stale data issues.

---

## 5. Historical Export Evidence (from CHANGELOG.md)

| Date | Evidence | Size | Verdict |
|------|----------|------|---------|
| 2026-07-21 | Tailoring Result Designed PDF production browser download (`Job.pdf`) | 22,156 bytes | PASS - `%PDF-1.4`, parsed as 1 page, tailored QA resume text present, no source marker |
| 2026-07-21 | Tailoring Result ATS PDF production browser download (`Job_Resume_ATS.pdf`) | 22,228 bytes | PASS - `%PDF-1.4`, parsed as 1 page, ATS export path verified, tailored QA resume text present, no source marker |
| 2026-07-21 | Tailoring Result DOCX production browser download (`QA_Manual_User_Resume.docx`) | 8,303 bytes | PASS - valid DOCX ZIP package with 20 entries, `word/document.xml`, tailored QA resume text present, no source marker |
| 2026-07-21 | Tailoring Result Designed PDF local browser download (`Job.pdf`) | 54,571 bytes | PASS - `%PDF-1.4`, parsed as 1 page, contained tailored QA resume text, no source marker |
| 2026-07-21 | Tailoring Result ATS PDF local browser download (`Job_Resume_ATS.pdf`) | 49,291 bytes | PASS - `%PDF-1.4`, parsed as 1 page, ATS result-page path verified, tailored QA resume text, no source marker |
| 2026-07-21 | Tailoring Result DOCX local browser download (`QA_Manual_User_Resume.docx`) | 8,303 bytes | PASS - valid DOCX ZIP package with 20 entries, `word/document.xml`, tailored QA resume text, no source marker |
| 2026-07-02 | Designed PDF (English) | 28,441 bytes | Visually verified, one page |
| 2026-07-02 | ATS PDF (English) | 29,165 bytes | ATS-friendly layout |
| 2026-07-02 | DOCX (English) | 8,277 bytes | Valid 20-entry package |
| 2026-07-01 | Designed PDF (Arabic) | 101,012 bytes | Connected Arabic glyphs |
| 2026-07-01 | ATS PDF (Arabic) | 25,367 bytes | RTL correctly rendered |
| 2026-07-01 | DOCX (Arabic) | 8,109 bytes | RTL markup + entries |
| 2026-07-01 | Designed PDF (Arabic) | 158,029 bytes | PDF glyphs correct |
| 2026-07-01 | ATS PDF (Arabic) | 54,984 bytes | Checked |
| 2026-07-01 | DOCX (Arabic) | 8,109 bytes | RTL package entries |
| 2026-06-30 | PDF Native runtime fix | — | Chromium bundled in Vercel function |

---

## 6. Issues Found

| # | Issue | Severity | Evidence |
|---|-------|----------|----------|
| EXP-01 | Action captured once at mount (by design) | False positive | Intentional — prevents URL cleanup race |
| EXP-02 | `/preview?action=download` (no `?id=`) relies on Zustand store | **MEDIUM** | `ResumeDetailPage.tsx` line 146 does not pass `?id=` param; if store is stale, wrong resume could export |
| EXP-03 | Server cannot verify client-provided HTML matches resume owner | MEDIUM | Server trusts pre-rendered HTML from any authenticated session |
| EXP-04 | 15+ `console.log` in production PDF export (timing, buffer sizes) | LOW | Verbose but no PII |
| EXP-05 | `execPath.slice(-50)` logged in production | LOW | Partial executable path |
| EXP-06 | Tailoring Result ATS PDF and DOCX production verification pending after deploy | RESOLVED | Product commit `29e8eec89c72de8eba60d77e401814482c16bf97` deployed via Vercel `dpl_8W6Dbf7G2G9EALDLx1pPQU4kfN9x`; production artifacts verified 2026-07-21 |

---

## 7. What Requires Browser Verification

| Test | Description | Priority |
|------|-------------|----------|
| Designed PDF download | Create resume → export → verify file opens correctly | P1 |
| ATS PDF download | Same flow with ATS export option | P1 |
| DOCX download | Same flow with DOCX export | P1 |
| Arabic exports | Test with Arabic resume content | P2 |
| Preview URL actions | `/preview?id=<id>&action=download` direct access | P1 |
| Preview refresh | Navigate to preview, refresh, confirm export still works | P2 |
| Mobile download | Test on iOS/Android share sheet | P3 |
| Large resume pagination | Resume with many entries — verify correct page count | P2 |

---

## 8. Summary

| Category | Verdict |
|----------|---------|
| Export endpoint availability | PASS — endpoint responds correctly with/without auth |
| Auth enforcement | PASS — 401 on unauthenticated requests |
| SSRF protection | PASS — dual-layer guards |
| File validation | PASS — PDF signature, DOCX ZIP + entries checked |
| Resume ID bootstrap | PASS — `?id=` param correctly hydrates store |
| Historical file evidence | PASS — multiple verified export artifacts exist |
| Tailoring Result local file downloads | PASS - Designed PDF, ATS PDF, and DOCX artifacts downloaded and parsed locally on 2026-07-21 |
| Production Tailoring Result file downloads | PASS - Designed PDF, ATS PDF, and DOCX artifacts downloaded and parsed on production on 2026-07-21 |
| Arabic export rendering | **UNVERIFIED** — requires visual inspection |

---

*End of Phase 5 Export/Download QA Report*
