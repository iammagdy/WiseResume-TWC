# Storage Buckets

**Last verified:** 2026-04-17
**Type:** deep dive
**Sources:**
- `project-governance/ARCHITECTURE.md` §6 (Supabase Storage Buckets)
- `replit.md` (Security Audit — avatar bucket policy)
- `supabase/migrations/20260417000000_security_audit_rls_and_hardening.sql`

**Canonical owner:** `project-governance/ARCHITECTURE.md` §6.

---

## Inventory (5 buckets)

| Bucket | Contents | Access | Notes |
|---|---|---|---|
| `avatars` | User profile photos | Owner read/write, public read | Server-side enforces `image/*` MIME and 5 MB cap (added 2026-04-17 — `replit.md` Security Audit) |
| `resumes` | Generated resume PDF/DOCX exports | Owner only | |
| `portfolios` | Portfolio-specific assets | Owner write, public read | Used by public `/p/:username` pages |
| `temp` | Transient processing files | Owner only, auto-purged | |
| `candidate-resumes` | HR candidate PDF uploads | Owning HR user only | Path layout: `{hr_user_id}/{candidate_id}/{filename}.pdf`. INSERT/SELECT/DELETE enforced by path prefix RLS. → Architecture §6 |

## Lifecycle rules

- WiseHire candidate data is **deleted after the 30-day post-cancellation window**. → `project-governance/CONSTITUTION.md` §7.5.
- `temp` bucket is auto-purged.
- Soft-deleted user content stays in storage until `hard-purge` (admin-only, `requireAdminAuth`) runs. → `replit.md` Security Audit.

## Files that touch storage

| Surface | File / function |
|---|---|
| Avatar upload | `src/components/profile/`, `manage-api-keys` is unrelated; check `src/pages/ProfilePage.tsx` |
| Resume export | `src/lib/pdfExport.ts` (and similar), `src/pages/EditorPage.tsx` |
| Portfolio assets | `src/pages/PortfolioEditorPage.tsx`, `src/pages/PublicPortfolioPage.tsx` |
| Candidate CV upload | WiseHire pipeline / brief flows — `src/pages/wisehire/PipelinePage.tsx`, `src/pages/wisehire/BriefGeneratorPage.tsx` |
| OG image | `supabase/functions/og-image/` |

> ⚠️ The exact frontend upload helpers were not exhaustively grepped during this verification — needs a targeted check of `src/lib/` if precise call sites are required.
