# Skill: Safe AI Gateway Changes

**Skill ID:** `ai-gateway-safe-change`
**Location:** `Project Atlas/skills/ai-gateway-safe-change.md`

---

## AI Gateway Rules

* **Single AI Gateway**: All AI requests route through `appwrite-hubs/ai-gateway/src/main.js`.
* **Provider Routing Policy**: AI changes must follow the current Appwrite `ai-gateway` implementation and the provider routing documented in current living Project Atlas architecture docs. Do not invent, reorder, add, remove, or hardcode providers without explicit owner approval and validation.
* **Schema Fallbacks**: Fall back gracefully if optional attributes are omitted in payload or schema.
* **No Direct Provider Calls in Browser**: Browser code MUST call `ai-gateway`, not external AI endpoints directly.
