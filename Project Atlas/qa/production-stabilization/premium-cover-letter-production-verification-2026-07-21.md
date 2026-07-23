# Premium Cover Letter Production Verification - Reconciled Evidence

**Original verification date:** 2026-07-21
**Reconciled:** 2026-07-23
**Production:** `https://wiseresume.app`
**Verdict:** `PASS_WITH_EVIDENCE_LIMITATION`

## Scope

The approved Premium flow was:

```txt
Generate -> Save -> Reopen -> Edit -> Save again -> Refresh -> Reopen
```

The original task was audit-only. It changed no product code, schema, permissions, environment variables, or deployment settings.

## Durable Production Evidence

The current Appwrite state preserves enough evidence to close the prior `BLOCKED_EXTERNAL_ACCESS` status:

* One owner-scoped Cover Letter document exists with ID `6a5f71a60017426ede6b`.
* It was created at `2026-07-21T13:18:28.380Z` and updated at `2026-07-21T13:25:12.087Z`.
* The persisted content is non-empty (`1,749` characters).
* Safe initial-save and later-edit markers are both present in the durable content.
* The document remains linked to the intended QA resume.
* Document permissions are owner-only read, update, and delete.
* AI request log `6a5f7191002f6cedd8f3` records one `generate-cover-letter` call through DeepSeek `deepseek-chat`, `4,863 ms` provider latency, and one two-credit charge.
* No second provider charge is present for the verified generation.

No account identifier, credentials, complete letter content, complete job description, prompt, token, or provider response is recorded here.

## Result Matrix

| Check | Result | Evidence |
|---|---|---|
| Premium access | `PASS` | Production document and request log belong to the Premium QA flow |
| Non-empty relevant output | `PASS` | Durable generated content is non-empty; full content intentionally not retained in this report |
| Save | `PASS` | Owner-scoped document created |
| Edit and save again | `PASS` | Later update timestamp and update marker persisted |
| Correct ownership | `PASS` | Owner-only read/update/delete permissions |
| One AI charge | `PASS` | One request log, two credits |
| Original live reopen observation | `UNKNOWN` | The original browser trace was not retained |
| Original live refresh observation | `UNKNOWN` | Durable persistence is proven, but the exact browser refresh trace was not retained |

## Classification

This flow is no longer `BLOCKED_EXTERNAL_ACCESS`. Generation, save, update, durable persistence, ownership, and single-charge behavior are proven. The exact original browser refresh/reopen observations remain `UNKNOWN`, so this reconciled record does not overclaim `VERIFIED_READY`.
