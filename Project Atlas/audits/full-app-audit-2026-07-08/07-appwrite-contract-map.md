# Appwrite Contract Map

| Frontend surface | Function/API | Auth boundary | Main data | Audit state |
|---|---|---|---|---|
| Generic AI features | `ai-gateway` via `appwriteFunctions` feature mapping | Appwrite JWT | credits, subscriptions, logs, routing | Code present; live UNKNOWN |
| Editor section AI | `resume-section-ai` | JWT validated by `Account.get` | credits, idempotency | Separate policy path |
| Job URL import | `job-import` | JWT; server derives user | jobs, credits, idempotency | Separate policy path; SSRF review needed |
| Public portfolio | `portfolio-gate`, `get-public-portfolio`, Vercel API | public/password token | profiles, portfolios, resumes | sanitization present; live UNKNOWN |
| Portfolio password | `verify-portfolio-password`, `portfolio-settings` | public rate limit / owner JWT | portfolio security | live UNKNOWN |
| Portfolio interest/contact | Vercel API / gateway contact feature | public + bot controls | interactions, notifications, email | Turnstile/env UNKNOWN |
| Visitor tracking | Vercel API, `track-visitor-event` | public | visits/events/notifications | unbound completion ID finding |
| Auth email/reset | `email-service` | mixed public/session/internal HMAC | OTPs, users, email | live delivery UNKNOWN |
| Public share | `public-share` | mixed public/auth | share tokens/resumes | live UNKNOWN |
| Remote jobs | `get-remote-jobs`, `track-job-action`, sync hub | mixed | remote jobs/actions | `/jobs` smoke UNKNOWN |
| DevKit | `admin-devkit-data` and admin hubs | admin/session/HMAC | cross-user/admin collections | console permissions UNKNOWN |
| Act As | `admin-impersonate` | signed HMAC + server collection | impersonation sessions/audit | live lifecycle UNKNOWN |
| Vercel PDF | `/api/export/pdf-native` | Appwrite identity contract | resumes/export | download/ownership UNKNOWN |
| URL upload | `/api/fetch-url` | none implemented | n/a | BROKEN: endpoint absent |

## Contract rules to verify manually

For each hub: deployed ID/name, execute roles, runtime, timeout, env variables, API key scopes, CORS/origin behavior, request/response schema, source hash, and failure status. For each collection: attributes, indexes, `documentSecurity`, create/read/update/delete permissions, owner field consistency (`user_id` vs `$id`), and server-only enforcement.

