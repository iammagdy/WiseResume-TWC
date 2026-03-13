# Data Model: Portfolio Phase 3

## Overview
This phase utilizes the `portfolioExtras` JSONB field in the `profiles` table to store and retrieve the `portfolioSummary`. It also introduces logic-level normalization for social media links.

## profiles Table (JSONB Fields)

### `portfolioExtras` (Updated)
| Field | Type | Description |
|-------|------|-------------|
| `portfolioSummary`| string | A short, high-impact introductory tagline displayed right after the Hero section. |

## Normalization Logic
Social media URLs are normalized before storage (in `PortfolioEditorPage.tsx` or as a utility).

| Platform | Input Example | Normalized Output |
|----------|---------------|-------------------|
| General | `linkedin.com/in/user` | `https://linkedin.com/in/user` |
| General | `github.com/user` | `https://github.com/user` |
| General | `http://mysite.com` | `http://mysite.com` (No change) |
| General | `https://x.com/user` | `https://x.com/user` (No change) |

## PDF Export Metadata
| Attribute | Scope | Purpose |
|-----------|-------|---------|
| `data-pdf-exclude` | Element | Element will be removed from the PDF (e.g., "Save as PDF" button). |
| `data-pdf-force-layout`| Container| Used to trigger specific CSS overrides in `print-safe.css`. |
