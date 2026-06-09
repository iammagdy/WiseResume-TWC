# Upload / Export / SSRF Security Audit — WiseResume-TWC

**Date:** 2026-06-09 | **Audited commit:** `main` @ `96beb3ec`  
**Files:** `appwrite-hubs/job-import/src/main.js`, `src/hooks/useOnePageExport.ts`, `package.json`

---

## 1. job-import Hub — Server-Side URL Fetch (WR-2026-017) — P2

### What it does
`appwrite-hubs/job-import/src/main.js` accepts a `{ url, userId }` body and fetches the URL server-side to extract job posting data:

```js
module.exports = async ({ req, res, log, error }) => {
  const { url, userId } = body || {};

  if (!isSafeUrl(url)) {
    return res.json({ ok: false, error: 'Invalid or blocked URL' }, 400);
  }

  const response = await axios.get(url, {
    timeout: 8000,
    maxRedirects: 5,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WiseResume/1.0...)' },
    maxContentLength: 2 * 1024 * 1024,  // 2MB cap
  });
```

### SSRF Protection Analysis
```js
const BLOCKED_RANGES = [
  /^127\./,          // loopback
  /^10\./,           // RFC1918 class A
  /^192\.168\./,     // RFC1918 class C
  /^172\.(1[6-9]|2\d|3[01])\./,  // RFC1918 class B
  /^169\.254\./,     // link-local (metadata service)
  /^::1$/,           // IPv6 loopback
  /^fd/,             // IPv6 ULA
  /^localhost$/i,    // hostname check
];
function isSafeUrl(rawUrl) {
  const parsed = new URL(rawUrl);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  const host = parsed.hostname;
  return !BLOCKED_RANGES.some(re => re.test(host));
}
```

**What the protection covers:**
- Blocks `file://`, `ftp://`, `data:` protocols ✅
- Blocks common private IP ranges ✅
- Blocks `localhost` by hostname ✅

**What it does NOT cover:**

**Gap 1 — DNS Rebinding:**
The check happens on the parsed URL hostname at request time. If an attacker controls a DNS entry that initially resolves to a public IP (passes the check), then re-resolves to a private IP during the subsequent `axios.get()` call, the block is bypassed. Cloud providers' metadata endpoints (e.g., `169.254.169.254` on AWS/GCP/Azure) are reachable via DNS rebinding.

*Mitigation:* Resolve hostname to IP at validation time and validate the IP, not the hostname string.

**Gap 2 — No Authentication:**
Any caller (authenticated or not) can invoke this function assuming platform execute permissions allow it (WR-2026-001). The `userId` field is accepted from the request body — not verified against a session token. An attacker can use this as an unauthenticated HTTP proxy for any public URL.

**Gap 3 — Cloud Metadata Endpoints:**
The `169.254.0.0/16` range blocks most metadata endpoints by IP, but specific metadata endpoints accessible via hostname (e.g., `metadata.google.internal`) may not be caught by the regex. This is environment-specific to how Appwrite's cloud infrastructure is configured.

### Impact Assessment
- Unauthenticated HTTP proxy for public URLs: likely Low risk (2MB cap, public URLs only, no private IP access if patterns hold)
- DNS rebinding to cloud metadata: Medium risk (requires DNS control + timing alignment)
- Storage DoS: Low risk (2MB cap, but unlimited calls if no auth)

### Recommended Fix
1. Add session validation at the start of the handler
2. Resolve hostname to IP before the `isSafeUrl` check and validate the resolved IP:
   ```js
   const dns = require('dns').promises;
   const addresses = await dns.resolve4(hostname);
   for (const addr of addresses) {
     if (BLOCKED_RANGES.some(re => re.test(addr))) {
       return res.json({ ok: false, error: 'Blocked URL' }, 400);
     }
   }
   ```
3. Add rate limiting on URL fetch operations

---

## 2. parse-job in ai-gateway — Text/URL Handling

`ai-gateway` `parse-job` feature: does NOT fetch URLs server-side. The AI gateway receives raw text or a URL string and passes it to the LLM as part of the prompt (the LLM extracts structure from the text). No server-side HTTP fetch.

Frontend path (`src/lib/aiTailor.ts` lines 219–226):
```typescript
export async function parseJobUrl(url: string): Promise<ParsedJobData> {
  const { data, error } = await appwriteFunctions.invoke('parse-job', {
    body: { action: 'url', url },  // URL sent as string to ai-gateway
  });
```

The `url` is passed as text to the LLM for extraction — not fetched by the server. ✅

The separate `job-import` hub handles actual URL fetching (audited above).

---

## 3. PDF Export — Client-Side

`src/hooks/useOnePageExport.ts` and `package.json`:
- **html2canvas** (`^1.4.1`): captures DOM elements to canvas in the browser
- **pdf-lib** (`^1.17.1`): client-side PDF construction
- **puppeteer-core** (`^25.0.4`): appears in dependencies — likely used for server-side rendering in a different context

**Assessment:** PDF export is client-side (html2canvas → pdf-lib). No server-side URL fetching or SSRF risk. ✅

Puppeteer is present in `devDependencies` and a setup script `scripts/ensure-puppeteer-chrome.mjs` runs in postinstall. This suggests puppeteer is used for development/testing purposes, not production PDF rendering. No puppeteer usage found in `appwrite-hubs/` code.

---

## 4. DOCX Export

Searched for DOCX generation in `src/` — no `docx`, `docxtemplater`, or `officegen` library references found in `package.json` or source files. DOCX export does not appear to be implemented.

---

## 5. File Upload Security

Searched for file upload components in `src/`. Resume upload appears to process:
- PDF text extraction: client-side or via `parse-resume` feature (text extracted and sent to AI)
- Image uploads: likely via Appwrite Storage

Appwrite Storage handles file validation at the platform level. No custom file type validation bypass was found in source code. Appwrite limits should enforce file type restrictions if configured in the Console.

**UNKNOWN:** What file types are allowed in Appwrite Storage buckets for resume/avatar uploads — requires Console verification.

---

## 6. dangerouslySetInnerHTML

```bash
$ grep -rn "dangerouslySetInnerHTML" src/ --include="*.tsx" --include="*.ts"
(no output)
```

No unsafe HTML injection points in any React component. ✅
