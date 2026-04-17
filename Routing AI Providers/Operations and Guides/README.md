# Operations and Guides

> **Purpose:** This folder is the second pass of documentation for the AI routing project. The parent folder (`Routing AI Providers/`) describes **what** we're building and **why**. This folder describes **how to run it, how to test it, what it costs, what to tell users, and what happens when something breaks**.
>
> **Verified against the codebase and parent docs on:** April 17, 2026.

---

## Who each document is written for

Documents in this folder are split by audience. The "Audience" column tells you whether a doc is written in **plain language for non-technical readers (you, the founder)** or in **precise technical language for engineers / AI agents that will implement the work**.

| # | Document | Audience | Purpose |
|---|---|---|---|
| 01 | [Provider Sign-Up Walkthrough](./01-provider-signup-walkthrough.md) | **You (non-technical)** | Step-by-step instructions for creating accounts and API keys with Gemini, Groq, and OpenRouter, and where each key gets stored. Click-by-click. |
| 02 | [Operational Runbooks](./02-operational-runbooks.md) | Engineer / AI agent | Exact procedures for incidents: a provider goes down, a key needs rotation, the dashboard shows red, the cache needs purging. Step-by-step with the precise SQL / commands to run. |
| 03 | [Edge-Function Migration Checklist](./03-edge-function-migration-checklist.md) | Engineer / AI agent | The before/after template, applied function by function, for migrating each of the 30 existing AI edge functions onto the new `callAIForFeature()` API. The single most important doc for the implementation phase. |
| 04 | [Test Plan](./04-test-plan.md) | Engineer / AI agent (with a "what you'll see" section for you) | What to smoke-test after each phase: sample inputs, expected provider, expected behavior on forced failover. |
| 05 | [Cost & Capacity Model](./05-cost-and-capacity-model.md) | Mixed | A back-of-the-envelope calculator: at N daily users, how many calls per provider per day, when each free tier breaks, and what billing toggle to flip first. |
| 06 | [Privacy & Compliance Notes](./06-privacy-and-compliance.md) | **You (non-technical)** | Plain-language summary of what data leaves the platform per provider, what their terms say about using your data, and what you should put in your user-facing privacy policy. |
| 07 | [Glossary & FAQ](./07-glossary-and-faq.md) | **You (non-technical)** | One-page reference defining every term used in the routing docs in plain English. Read this first if any other doc confuses you. |

---

## Read order

If you only have 15 minutes, read these in this order:

1. **07 — Glossary & FAQ** (5 min) — gets you the vocabulary.
2. **01 — Provider Sign-Up Walkthrough** (5 min) — concrete and hands-on; nothing makes the project feel real like creating the actual keys.
3. **06 — Privacy & Compliance** (5 min) — so you know what you're agreeing to before launch.

If you have an hour, add:

4. **05 — Cost & Capacity Model** — to feel comfortable with the numbers.
5. **02 — Operational Runbooks** — skim the headers so you know help exists when something breaks.

The engineer / AI agent who eventually implements this should read all 7, in order, plus the parent folder's docs first.

---

## Ground rules for this folder

1. **Accuracy over comprehensiveness.** Every command, SQL query, secret name, model slug, and edge-function name in these docs is copied verbatim from the parent docs (`01-current-state.md`, `03-providers-and-models.md`, `04-feature-routing-map.md`) or directly from the codebase. If a number or name appears anywhere in this folder, it is real.
2. **No code is written.** Like the parent folder, this is documentation only. No `.ts`, no `.sql` migrations are committed.
3. **Cross-references are explicit.** When a doc here depends on a parent doc, it links to the file and the section by name. Never "see the other doc" with no pointer.
4. **Plain-language docs are jargon-free.** When a technical term is unavoidable in a user-facing doc (01, 06, 07), it's defined inline the first time it appears, and also lives in the Glossary (07).
5. **Technical docs are runnable.** When a runbook says "run this query", the query is copy-pasteable and tested against the existing schema documented in `01-current-state.md`.

---

## What this folder does NOT cover

- **Architecture, design rationale, decision log** — those live in the parent folder (`02-target-architecture.md`, `09-decisions-log.md`, etc.).
- **The phased implementation plan** — that's `05-implementation-plan.md` in the parent folder.
- **The dashboard spec** — that's `08-admin-dashboard-spec.md` in the parent folder.
- **Anything that locks a new product decision.** All decisions are already locked in `09-decisions-log.md` (D1–D14). This folder only operationalizes them.
