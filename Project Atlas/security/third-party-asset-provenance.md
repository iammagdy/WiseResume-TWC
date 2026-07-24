# Third-Party Asset and License Provenance Inventory

**Reviewed:** 2026-07-24. This is a factual inventory, not a repository-license decision.

| Asset family | Source/provenance | License/action |
|---|---|---|
| UI icons | `lucide-react` npm dependency | ISC; retain package notice/lockfile evidence. |
| Web fonts | `@fontsource/inter`, `fira-code`, `noto-sans-arabic`, `space-grotesk` | Upstream font licenses carried by package distributions; retain package metadata on redistribution review. |
| PDF rendering CMaps/fonts | `pdfjs-dist`, copied by `scripts/copy-pdf-ocr-assets.mjs` | Mozilla PDF.js distribution; retain upstream notices. |
| OCR worker/core/language data | `tesseract.js` and packaged assets, copied by the same script | Upstream Tesseract distribution; retain notices and verify language-data terms before redistribution changes. |
| Application logos/favicons/OG image | `public/` and `src/assets/` product-branded files | Treated as first-party pending owner provenance confirmation; no external stock-source claim was found. |
| Resume examples/content library | `public/data/` | Treat as product sample content; do not add real CVs or customer data. |

No repository LICENSE change was made. Before any open-source program submission, owner must verify ownership/provenance of first-party branding, examples, templates, and generated assets and make the separate license decision.
