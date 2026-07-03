# parse-resume

**Last verified:** 2026-05-13
**Type:** reference card
**Sources:**
- `src/lib/appwrite-bridge.ts`
- `src/lib/appwrite-functions.ts`
- `src/lib/pdfParser.ts`
- `appwrite-hubs/ai-gateway/src/main.js`

**Canonical owner:** this file

---

**What it does:** Parses extracted resume text into structured `ResumeData`.

## Current architecture truth

`parse-resume` is **not** a standalone Appwrite Function.

It is a feature route handled inside the consolidated Appwrite `ai-gateway` function. The frontend calls `parse-resume`, `appwrite-bridge` routes it through `ai-gateway`, and the gateway now has a dedicated `parse-resume` branch.

## Request contract

Frontend sends:

```ts
{
  text: string;
  fileType?: string;
}
```

`text` is already extracted plain text from PDF, DOCX, HTML, image OCR, or URL import.

## Response contract

Successful responses return actual `ResumeData`, not a generic chat envelope payload.

Important behavior:

- The gateway validates and normalizes provider output into the app's resume schema.
- Malformed or empty AI responses are treated as parser failures.
- The frontend validates the returned shape again and falls back to local parsing if the payload is still unusable.

## Why this card changed

This Atlas card used to describe an old Supabase edge function path. That was no longer true.

The verified 2026-05-13 root cause for cross-device CV parsing failures was not only backend drift. The browser-side PDF.js worker bootstrap was also broken, so some uploads failed before `parse-resume` was ever called. Once the browser could read the PDF again, `parse-resume` also needed its dedicated structured route inside `ai-gateway` so the returned payload matched `ResumeData`.

## Related

- `Project Atlas/01-Currently Implemented/pages/upload.md`
- `Project Atlas/01-Currently Implemented/stability-fixes/cross-device-cv-parsing-stabilization.md`
