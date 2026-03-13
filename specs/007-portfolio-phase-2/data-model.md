# Data Model: Portfolio Phase 2 & 3

## Overview
This feature phase refactors the existing `portfolioExtras` and `portfolioSections` data structures used in the `profiles` table. It does not introduce new database columns but adds structure to the existing JSONB `portfolioExtras` field.

## profiles Table (JSONB Fields)

### `portfolioSections` (Object Mapping)
| Field | Type | Description |
|-------|------|-------------|
| `experience` | boolean | Toggle Work Experience section |
| `education` | boolean | Toggle Education section |
| `skills` | boolean | Toggle Skills section |
| `projects` | boolean | Toggle Projects section |
| `githubProjects`| boolean | Toggle GitHub integration section |
| `certifications`| boolean | Toggle Certifications section |
| `awards` | boolean | Toggle Awards section |
| `publications` | boolean | Toggle Publications section |
| `volunteering` | boolean | Toggle Volunteering section |

### `portfolioExtras` (JSONB Object Structure)
This object stores custom portfolio content that doesn't fit in the standard resume schema.

| Field | Type | Phase | Description |
|-------|------|-------|-------------|
| `caseStudies` | Array<CaseStudy> | P2 | Custom case studies |
| `services` | Array<Service> | P2 | Offered services |
| `testimonials`| Array<Testimonial>| P2 | User testimonials |
| `highlights` | Array<Highlight> | P2 | Career highlights (Stats) |
| `portfolioSummary`| string | P3 | Introductory tagline/summary |

## Entity Definitions (TypeScript Context)

### CaseStudy
```typescript
interface CaseStudy {
  id: string;
  title: string;
  challenge: string;
  outcome: string;
  imageUrl?: string;
}
```

### Testimonial
```typescript
interface Testimonial {
  id: string;
  quote: string;
  authorName: string;
  authorTitle: string;
  authorAvatar?: string;
}
```

### Highlight
```typescript
interface Highlight {
  id: string;
  value: string;
  label: string;
  icon?: string;
}
```

## State Transitions & Validation
- **Portfolio Strength Logic**: 
  - Valid: `Avatar`, `Bio` (>= 50 chars), `Username`, `Contact Link`, `Meta SEO`.
  - Advisory: `Publish Status` (Excluded from percentage calculation).
- **Social URLs**:
  - Normalize: Prefix with `https://` if protocol missing.
  - Frequency: On blur or on save.
