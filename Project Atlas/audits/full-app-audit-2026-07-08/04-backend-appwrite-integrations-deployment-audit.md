# Backend, Appwrite, Integrations, and Deployment Audit

## Finding P1-DEP-01 — Manual hub workflow defaults to forbidden all-target deployment

Severity: P1  
Area: Deployment workflow  
Evidence: `.github/workflows/deploy-appwrite-hubs.yml:6-9` makes `target` optional with default `all`; lines 236-241 deploy all hubs without `--only`. Many schema scripts also run for `all`. Atlas explicitly says never use `target=all`.  
Impact: A routine manual action can redeploy every hub and mutate many schemas, creating broad outage/drift risk.  
Reproduction: Open workflow dispatch without changing target; UI selects `all`. Do not execute.  
Recommended fix: Require a non-empty comma-separated allowlisted target; fail closed on blank/`all`; run only schemas mapped to selected hubs; add workflow contract tests.  
Fix class: Deployment workflow.  
Deployment required: No application deployment, but workflow change must merge before next run.  
Manual Appwrite action: No.  
Browser QA required: No.

## Finding P2-BE-02 — AI policy is duplicated across hubs

Severity: P2  
Area: AI/backend contracts  
Evidence: `resume-section-ai` and `job-import` each implement JWT validation, plan lookup, credits, idempotency, rate limiting, and provider pools outside `ai-gateway`. Atlas simultaneously claims all AI calls use the gateway and documents these exceptions inconsistently.  
Impact: Provider, pricing, retry, logging, and abuse policies can diverge.  
Recommended fix: Either consolidate behind the gateway or formally define a shared policy module and explicit exceptions with parity tests.  
Fix class: Appwrite function/documentation.  
Deployment required: Appwrite for code consolidation.  
Manual Appwrite action: Possibly environment cleanup.  
Browser QA required: Yes for affected flows.

## Finding P2-BE-03 — Credit counters are not concurrency-safe

Severity: P2  
Area: Credits/plan limits  
Evidence: `resume-section-ai` and `job-import` load `daily_usage`, then later update it to `currentUsage + cost`. Concurrent requests can read the same value and overwrite each other. Idempotency prevents identical-content duplicates but not different simultaneous actions.  
Impact: Under-counting, quota bypass, inconsistent totals.  
Recommended fix: Use an atomic ledger/unique charge record plus aggregate, or an Appwrite transaction/compare-and-retry mechanism if supported.  
Fix class: Appwrite schema/function.  
Deployment required: Appwrite.  
Manual Appwrite action: Likely schema/index.  
Browser QA required: No; concurrency integration test.

## Contract/deployment unknowns

- Live function IDs, execute permissions, runtime versions, environment variables, and source hashes.
- Required attributes/indexes for `ai_credits`, `idempotency_cache`, portfolio security, notifications, visits, jobs, and routing config.
- Vercel env values and API function credentials.
- Resend domain/delivery, Turnstile keys, Sentry DSN/token, and provider-key slots.

Classification summary: frontend contract bug (`/api/fetch-url`); deployment workflow issue (default all); documentation/stale-source issue (workflow/route/function specs); schema/permission/environment items (`UNKNOWN`, manual verification needed).

