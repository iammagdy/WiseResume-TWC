# Canonical Third-Party & Infrastructure Integrations

**Last Verified:** 2026-08-26
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
| **Subscription lifecycle** | Paddle Sandbox → RevenueCat Sandbox → Appwrite `revenuecat-webhook` → WiseResume provider-state resolver | Appwrite `revenuecat-webhook` plus server-only provider-state collections | Phase 2C verified the existing non-real Sandbox Pro path end-to-end, including RevenueCat ingestion, active Pro entitlement, Appwrite ledger/provider state, effective Pro plan, and UI credits. The current Sandbox webhook route is reachable under valid strict TLS. Production provider configuration, checkout, and payment activation remain unverified/disabled. |
