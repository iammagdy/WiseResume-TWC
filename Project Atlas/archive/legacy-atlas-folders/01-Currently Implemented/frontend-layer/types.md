# TypeScript types (`src/types/`)

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `src/types/`.

**Canonical owner:** `src/types/` for cross-cutting domain types. Per-feature types live next to their feature.

---

| File | Purpose |
|---|---|
| `resume.ts` | Canonical `ResumeData` shape (`ContactInfo`, experiences, education, skills, certifications, projects, …). Single source of truth for the resume schema consumed by editor, templates, PDF export, and `resume_snapshots.resume_json`. |
| `resumeExamples.ts` | `ExperienceLevel`, `Industry` enums + the example-resume catalog shape used by `/examples` and the example loader. Imports `ResumeData` from `resume.ts`. |
| `aiStudio.ts` | Recruiter-simulation persona enums (`RecruiterPersona`, `RecruiterPersonaInfo`) and AI Studio tool input/output shapes. |
| `companyBriefing.ts` | `CompanySnapshot` shape returned by `company-briefing` and stored in `company_briefings.briefing` jsonb. |

## Hard rules
- `ResumeData` schema changes are breaking — must coordinate with: every template under `src/components/templates/`, the PDF export in `server/index.ts`, every edge function that reads/writes resume rows, and `resume_snapshots.resume_json` historic data.
- No `any` casts in any types file (`replit.md`).
