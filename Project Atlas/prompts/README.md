# Project Atlas — AI Agent Prompts & System Templates

**Last Verified:** 2026-07-03
**Status:** Canonical Prompt Library
**Location:** `Project Atlas/prompts/`

---

## 1. What Belongs Here

* Reusable AI agent system prompts and role definitions.
* Standardized task initiation prompts and prompt templates.
* AI gateway provider prompt templates (e.g. CV tailoring prompts, cover letter generation prompts).
* Subagent system prompts and task delegation guidelines.

---

## 2. What Does NOT Belong Here

* Executable prompt code in backend Appwrite functions (place in `appwrite-hubs/ai-gateway/src/`).
* One-off chat queries or unstructured scratch notes (place in `Project Atlas/temp/`).

---

## 3. Usage & Structuring Guidelines

* Organize prompts by functional domain (e.g. `prompts/ai-gateway/`, `prompts/agent-roles/`).
* Document input variables, expected output formats, and temperature/sampling parameters for each prompt.
