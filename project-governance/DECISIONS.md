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
