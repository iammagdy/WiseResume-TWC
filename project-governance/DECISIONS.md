# Architectural Decision Records (ADR)

This file logs all major technical decisions for the WiseResume repository. Every major technical decision MUST be logged here to provide context for future development and system architecture.

## Decision #1: Centralized Governance Documents
* **Context**: Need a single, cohesive set of instructions that override legacy AI planning files and create strict boundaries for engineering and behavior.
* **Decision**: Implemented `project-governance/` to serve as the supreme source of documentation truth, guiding all agent workflows, design principles, architecture validations, and deployments.
* **Consequences**: Future agents must adhere to the workflows defined herein, and documentation must be kept in sync alongside codebase evolution. Legacy markdown files must no longer be treated as binding truth.

## Decision #2: Kinde to Supabase Token Bridge
* **Context**: Need robust authentication spanning external services and internal databases.
* **Decision**: Implemented a specialized Kinde → Supabase Token Bridge. Replaced Clerk and standalone Supabase Auth.
* **Consequences**: `token-exchange` edge function verifies tokens; `supabaseBridge.ts` handles lifecycle. Deterministic UUID v5 generated from Kinde ID.

## Decision #3: 3D Animated Background
* **Context**: The product demands a high-quality, premium aesthetic environment that doesn't compromise performance blindly.
* **Decision**: Implemented `SkyWallpaper` using React Three Fiber (R3F) and GSAP instead of basic CSS.
* **Consequences**: Desktop has a full 3D interactive layer. Mobile receives a fallback plain background with a noise texture to save overhead. It MUST be retained as a core branding asset.

## Decision #4: Implicit OAuth Flow for Custom Domains
* **Context**: Fixing OAuth 404 origin mismatches during Kinde routing.
* **Decision**: Switched from PKCE to an implicit OAuth flow.
* **Consequences**: Resolved callback hash token forwarding on custom domains securely.

## Decision #5: Soft vs. Hard Delete Policy
* **Context**: Need to decide how user data deletion is handled across the application, especially for compliance and referential integrity (Audit FR-006).
* **Decision**: Adopted a soft-delete default policy. The `is_deleted` flag is flipped on profiles and messages. Associated child records are preserved unless they hold sensitive data, in which case they may be hard deleted or scrubbed.
* **Consequences**: Queries for active data must explicitly filter `is_deleted = false` (e.g., `get_public_portfolio`).

## Decision #6: Fail-Closed Rate Limiting
* **Context**: The AI Gateway rate limiter (`_shared/rateLimiter.ts`) previously failed open on database query errors, allowing potential billing abuse if the database went down.
* **Decision**: Aligned `rateLimiter.ts` to fail closed, matching the strict behavior of `creditUtils.ts`.
* **Consequences**: If the `ai_usage_logs` table is unreachable, AI endpoints (`ai-health`, `ai-test`, `ask-portfolio`) will block requests, ensuring cost control at the expense of temporary availability during DB outages.

---

## Decision #7: WiseHire Same-Codebase Expansion
* **Context**: Adding an HR product to the existing WiseResume platform. Options considered: (a) separate codebase/repo, (b) separate subdomain with shared auth, (c) same codebase with account type flag.
* **Decision**: Build WiseHire within the same codebase, same Supabase instance, same Kinde auth, same Replit environment. Users are differentiated by a permanent `account_type` column (`job_seeker` | `hr`) on the `profiles` table, set at sign-up and never changeable. WiseHire routes use the `/wisehire/*` prefix. The landing page uses a toggle (`/?for=companies`) to switch content and theme without a page load.
* **Rationale**: Shared infrastructure eliminates operational overhead (one deployment, one database, one billing system, one admin dev kit). The unified admin tooling covers both user types. Future cross-product features (Talent Pool, portfolio view notifications) are architecturally simpler with a shared DB.
* **Consequences**: Every new WiseHire feature must enforce `account_type = 'hr'` at the route and edge function level. Job seeker routes must reject HR accounts, and vice versa. The `account_type` field must be present in dev kit user views. All new WiseHire Supabase tables need RLS policies restricting access to the owning HR user's data.

## Decision #8: WiseHire Desktop-First Exception (Phase 1 & 2)
* **Context**: `PRODUCT.md` mandates mobile-first quality for the platform. However, WiseHire Phase 1 and 2 target HR professionals and recruiters who work primarily on desktop computers. Building a full mobile-responsive WiseHire from day 1 would significantly slow Phase 1 delivery.
* **Decision**: WiseHire Phase 1 and 2 are explicitly **desktop-first**. Mobile responsive support is deferred to Phase 3. This is a documented, time-limited exception — not a permanent override of the mobile-first rule.
* **Consequences**: WiseHire Phase 1/2 may have suboptimal mobile layouts. Mobile support MUST be tracked as a planned task for Phase 3 and MUST NOT be forgotten. When Phase 3 mobile work begins, it should bring WiseHire to the same `xs`/375px baseline as WiseResume.
