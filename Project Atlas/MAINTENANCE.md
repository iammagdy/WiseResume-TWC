# Project Atlas - Maintenance Protocol

**Last verified:** 2026-05-12
**Type:** governance
**Sources:**
- `Project Atlas/README.md`
- `Project Atlas/GOVERNANCE.md`
- `Project Atlas/RULES.md`
- `Project Atlas/CHANGELOG.md`
**Canonical owner:** this file

---

This file defines how the Atlas is kept honest. Everyone editing the Atlas, human or agent, must follow it.

## The Core Rule

`Project Atlas/` is the only documentation source of truth.

Do not create new project documentation outside `Project Atlas/`. Do not treat root Markdown files, old governance folders, external planning folders, template docs, or stale specs as authoritative.

If useful context is found outside the Atlas:

1. verify it against the current codebase and live architecture;
2. move or summarize the durable truth into the correct Atlas file;
3. delete the outside document;
4. record the cleanup in `Project Atlas/CHANGELOG.md`.

## Documentation Surfaces

For accepted project changes, update the relevant Atlas surfaces:

- engineering or operational reference: the matching file under `Project Atlas/`;
- owner-facing explanation: `Project Atlas/04-For You (Plain Language)/` when the owner needs to know what changed;
- changelog: `Project Atlas/CHANGELOG.md`.

The in-app user-facing What's New page is not an engineering documentation surface and should only be updated when a product release calls for it.

## Hard Rules

### Rule 1 - Cite Or Do Not Claim
Every factual statement in an Atlas doc must trace back to a current source: code, config, workflow, Appwrite Function source, deployment guide, or another Atlas file.

If a fact cannot be verified, mark it explicitly as unverified and name what must be checked.

### Rule 2 - Header Required
Every Atlas doc starts with:

```text
# <Title>

**Last verified:** YYYY-MM-DD
**Type:** <reference card | deep dive | overview | plain language | index | governance | changelog>
**Sources:**
- <path to source file 1>
- <path to source file 2>
**Canonical owner:** <the Atlas file or code path that owns this topic>
```

### Rule 3 - Last Verified Means Re-Read
Only bump `Last verified` after re-reading the cited sources.

### Rule 4 - Current Beats Historical
The current codebase, Appwrite state, deployment workflows, and Atlas state beat historical notes. Do not preserve stale Kinde, Supabase, Replit, or legacy deploy claims as current truth.

### Rule 5 - No Invented Features
If a feature, behavior, collection, route, or function is not in the codebase or live platform, do not document it as implemented. Put planned work under `02-Planned/` or record uncertainty clearly.

## Update Mapping

| If you change... | Re-verify... |
|---|---|
| Appwrite client/auth/data code | `GOVERNANCE.md`, related implementation card, and relevant migration/Appwrite notes |
| `appwrite-hubs/<function>/` | matching function card under `01-Currently Implemented/` and `MASTER_HANDOVER_2026.md` if state changes |
| Admin DevKit panels | DevKit reference cards and owner-facing stability notes when visible |
| AI gateway routing or provider behavior | `02-Planned/ai-routing-rollout.md` or the implemented AI routing card, plus `MASTER_HANDOVER_2026.md` if active state changes |
| Deployment workflows or Hostinger paths | `DEPLOYMENT_GUIDE.md` and `MASTER_HANDOVER_2026.md` |
| Project rules or documentation policy | `GOVERNANCE.md`, `RULES.md`, `README.md`, and `CHANGELOG.md` |
| Owner-visible behavior | the relevant file under `04-For You (Plain Language)/` |

## Pre-Publish Checklist

Before publishing Atlas edits:

- Header is complete.
- Sources point to real files or current platform state.
- Claims match the current Appwrite-native architecture.
- No old external doc is left as canonical truth.
- `Project Atlas/CHANGELOG.md` is updated for accepted changes.
- Plain-language notes are added when the owner needs to understand the impact.

## Automated Checks

`scripts/atlas-sync-check.ts` may still help with inventory checks, but it does not replace manual verification. If the script itself references legacy Supabase-only assumptions, update the script or its Atlas card before relying on it.
