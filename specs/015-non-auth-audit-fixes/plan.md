# Implementation Plan: Non-Authentication Audit Fixes

**Branch**: `015-non-auth-audit-fixes` | **Date**: 2026-03-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/015-non-auth-audit-fixes/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

This plan addresses the critical and medium priority bugs and vulnerabilities identified in the non-authentication security audit of WiseResume. The technical approach involves robust null pointer handling in Edge Functions (`ask-portfolio`, `track-portfolio-view`), adding atomic database operations, applying DB constraints, and securing RLS policies. On the frontend, the focus is on resolving React state bugs like memory leaks from orphaned timers, stale closures in AI hooks, and out-of-sync cache invalidations.

## Technical Context

**Language/Version**: TypeScript / React 18 / Supabase  
**Primary Dependencies**: React Query, Zustand, Supabase js, Edge Functions  
**Storage**: PostgreSQL (Supabase)  
**Testing**: Vitest / Playwright / Manual Execution  
**Target Platform**: Web (Vite) / Deno Edge Runtime
**Project Type**: Full-stack web application  
**Performance Goals**: <500ms Edge Function latency, strict UI re-rendering isolation
**Constraints**: Must fail closed on rate limit exhaustion, ensure data consistency on save  
**Scale/Scope**: Impacts core AI services and public portfolio rendering

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Governance**: All changes must adhere strictly to existing tech choices (Supabase, React Query) and must not introduce new unnecessary dependencies.
- **Robustness**: Edge functions must validate all inputs and handle missing relationships gracefully.
- **Security**: Database operations from anonymous endpoints must be isolated and rate-limited.

## Project Structure

### Documentation (this feature)

```text
specs/015-non-auth-audit-fixes/
├── spec.md
├── plan.md              # This file
├── checklists/          # Checklists (e.g. requirements.md, plan.md)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── hooks/
│   ├── useNetworkStatus.ts
│   ├── useProfile.ts
│   ├── useResumes.ts
│   ├── useVoiceInterview.ts
│   ├── useEditorAutosave.ts
│   └── useWebSpeechFallback.ts
├── components/
│   └── interview/
│       └── InterviewSetup.tsx

supabase/
├── functions/
│   ├── ask-portfolio/
│   ├── track-portfolio-view/
│   ├── ai-test/
│   ├── ai-health/
│   └── _shared/
│       └── rateLimiter.ts
└── migrations/
    └── [new_migration]_non_auth_audit_fixes.sql
```

**Structure Decision**: Code modifications target existing Supabase edge functions, database migrations for schema adjustments, and frontend React hooks/components to maintain current architecture.

## Technical Details (Phase 0 & 1)

1. **Database Schema & RLS Migrations**
   - Create a new migration file to apply `NOT NULL` constraints to `messages` (`full_name`, `subject`, `status`).
   - Create a composite index on `ai_usage_logs (user_id, action_type, created_at)`.
   - Update `messages` RLS policies to check for authentic administrator roles rather than hardcoded email literals.
   - Modify the `get_public_portfolio` RPC to ensure `is_deleted = false` mapping.

2. **Edge Functions**
   - `ask-portfolio`: Check `if (!profile || !resume)` before accessing nested fields.
   - `track-portfolio-view`: Adjust to handle missing `profileRow` smoothly. Change the RPC call for click count to ensure atomic `click_count = click_count + 1`. Replace HTTP IP lookups with X-Forwarded-For securely.
   - `ai-health` / `ai-test`: Implement rate limit checks to these endpoints securely.

3. **Frontend React Hooks**
   - `useVoiceInterview`: Use a stable reference (e.g., `useRef(resumeData)`) within `analyzeRole` to eliminate stale closures. Add logic to ensure `quickPractice` naturally terminates after 5 questions.
   - `useProfile`: Remove stale closures for `userId` inside mutation callbacks.
   - `useNetworkStatus` / `useEditorAutosave` / `useWebSpeechFallback` / `InterviewSetup`: Audit and clear timeouts/intervals effectively on unmount and transitions.
   - `useResumes`: Validate that cache states natively invalidate query listeners explicitly and eliminate conflicting direct Zustand overrides when unnecessary.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A       | N/A        | N/A                                 |
