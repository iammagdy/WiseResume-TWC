# Project Atlas — AI Agent Skills System

**Last Verified:** 2026-07-03
**Status:** Canonical AI Agent Skills Library
**Location:** `Project Atlas/skills/`

---

## 1. Executive Summary & Governance

The **Project Atlas Skills System** equips AI coding agents with standardized, modular execution playbooks.

Every AI agent working on WiseResume must follow the skill execution rules below:

* **Mandatory First Step**: The [`agent-bootstrap.md`](./agent-bootstrap.md) skill is **MANDATORY** for every AI agent turn before inspecting code or proposing fixes.
* **Skill Selection**: Consult [`SKILLS_INDEX.md`](./SKILLS_INDEX.md) to select task-specific skill playbooks matching your assignment.
* **WiseResume Source of Truth**: `Project Atlas/` is the single source of truth. External skill frameworks (e.g. `awesome-agent-skills`, `SkillKit`) are optional inspiration tools only.
* **No Unapproved Tooling**: Do NOT install automated skill tools unless explicitly authorized by the project owner (see [`skillkit-optional-setup.md`](./skillkit-optional-setup.md)).

---

## 2. Skill Categories

* **Bootstrap**: [`agent-bootstrap.md`](./agent-bootstrap.md) (Mandatory initial reading and workspace safety check)
* **Code Quality**: [`new-code-quality.md`](./new-code-quality.md) (TypeScript, linting, formatting rules)
* **Feature Development**: [`feature-implementation.md`](./feature-implementation.md) (End-to-end feature workflow)
* **UI & Design System**: [`ui-visual-implementation.md`](./ui-visual-implementation.md) (Tailwind CSS, Radix UI, visual standards)
* **Appwrite Backend**: [`appwrite-safe-change.md`](./appwrite-safe-change.md) (Database, storage, and serverless function rules)
* **AI Routing**: [`ai-gateway-safe-change.md`](./ai-gateway-safe-change.md) (AI gateway provider routing and fallback safety)
* **QA & Testing**: [`qa-validation.md`](./qa-validation.md) (Vitest unit tests and Playwright E2E verification)
* **Security & Auth**: [`security-review.md`](./security-review.md) (Appwrite Auth, document security, Turnstile, secret protection)
* **Documentation & Closeout**: [`documentation-closeout.md`](./documentation-closeout.md) (Atlas updates, changelogs, handover state)
* **Tooling Optional Setup**: [`skillkit-optional-setup.md`](./skillkit-optional-setup.md) (Optional SkillKit setup instructions)
