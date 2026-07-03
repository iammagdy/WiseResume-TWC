# Architectural Decision Records (ADR)

**Last Verified:** 2026-07-03
**Status:** Canonical Decision Directory
**Location:** `Project Atlas/decisions/`

---

## 1. Primary Decision Log Location

* **Main Decision Log**: The master Architectural Decision Record (ADR) file lives at **[`Project Atlas/DECISIONS.md`](../DECISIONS.md)** for top-level navigation and fast access.
* **Granular ADRs**: Detailed individual decision cards or deep-dive architectural trade-off specs are stored under `Project Atlas/decisions/`.

---

## 2. Decision Record Rules

* **Immutable Records**: Accepted ADRs capture point-in-time architectural choices and rationale. Do not rewrite historical ADR decision context.
* **Superceded ADRs**: If a new decision supersedes a previous ADR, mark the old decision as `SUPERSEDED BY [ADR-XXXX]` and link to the new decision card.
* **Format**: Follow standard ADR format (Title, Date, Status, Context, Decision, Consequences).
