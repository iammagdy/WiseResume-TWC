# Urgent by MEGZ

This file tracks critical technical debt, infrastructure updates, and manual verification tasks that require coordinated action or specific manual testing by MEGZ.

## Branding & Infrastructure (Technical Debt)

### 1. Rename `LOVABLE_API_KEY` Environment Variable
- **Status**: Deferred (Planned for later)
- **Risk**: High (Breaking)
- **Description**: The environment variable `LOVABLE_API_KEY` is currently used across all Supabase Edge Functions.
- **Action Required**: 
    1. Rename variable in Supabase Dashboard (Project Settings -> Edge Functions).
    2. Synchronously update `supabase/functions/_shared/aiClient.ts` to use the new name (e.g., `WISE_AI_GATEWAY_KEY`).

### 2. Unified Infrastructure Migration (Unity Project)
- **Status**: Deferred (Planned for later)
- **Risk**: Moderate
- **Description**: Currently, the app uses a **Split Architecture**. The database resides on project `jnsfmk...`, while AI Edge Functions reside on project `hjnnam...` (The Wise Cloud).
- **Goal**: Consolidate both data and functions into your single primary project.
- **Action Required**: 
    1. Deploy all functions from `supabase/functions/` to the primary project `jnsfmk...`.
    2. Update `src/lib/supabaseConstants.ts` to point `EDGE_FUNCTIONS_URL` to your own project URL.
    3. Verify Service Role keys and secrets are synced across the unified project.

### 3. Provider Mapping Key Migration
- **Status**: ✅ RESOLVED
- **Risk**: Low (Phase 1 complete)
- **Description**: Internal `providerUsed` strings have been renamed to `wiseresume`.
- **Note**: Decoupled from infra; frontend now displays "WiseResume AI" consistently.

---

## Manual Verification (To be performed by MEGZ)

### 1. Visual Audit: Sample Data
- **Goal**: Confirm "Wise Universe" is completely gone and replaced by "The Wise Cloud" or "WiseResume".
- **Location**: Portfolio Editor (Sample Resume loading).
- **Target Email**: Verify it is now `contact@thewise.cloud`.
- **Status**: [/] Ready for check

### 2. Visual Audit: AI Health Status
- **Goal**: Confirm the AI Settings Sheet displays "WiseResume AI" for the built-in provider and not legacy names.
- **Location**: AI Settings Sheet -> Health Check.
- **Status**: [/] Ready for check

### 3. Link Verification: Public Portfolio
- **Goal**: Confirm that existing public links or primary routing correctly reflects the `resume.thewise.cloud` branding.
- **Status**: [/] Ready for check
