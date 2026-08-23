# Canonical Third-Party & Infrastructure Integrations

**Last Verified:** 2026-07-03  
**Status:** Canonical Architecture Specification  
**Location:** `Project Atlas/architecture/integrations.md`  

---

## Integrations Index

| Integration | Provider | Location / Gateway | Purpose |
|---|---|---|---|
| **AI Gateway** | OpenRouter / OpenAI / Groq / DeepSeek | Appwrite `ai-gateway` function | Consolidated AI resume tailoring, cover letters, and chat. |
| **Bot Protection** | Cloudflare Turnstile | `PublicPortfolioPage.tsx` / `ai-gateway` | Anonymous contact form verification (`v0/siteverify`). |
| **PDF Parsing** | PDF.js | Client-side `pdfParser.ts` | Local browser-side text extraction from uploaded PDF resumes. |
| **DOCX Parsing** | Mammoth.js | Client-side `docxParser.ts` | Local browser-side text extraction from uploaded Word resumes. |
| **OCR Fallback** | Tesseract.js | Web Worker (`public/ocr/`) | Optical Character Recognition for image-only scanned PDFs. |
| **Transactional Email** | SendGrid / SMTP | Appwrite `email-service` function | Portfolio contact notifications, OTP password resets. |
| **Subscription lifecycle** | RevenueCat → future Paddle integration | Appwrite `revenuecat-webhook` plus server-only provider-state collections | Local-only Phase 1 implementation for normalized lifecycle state and durable event idempotency. No webhook, secret, schema, deployment, or payment activation is configured. |
