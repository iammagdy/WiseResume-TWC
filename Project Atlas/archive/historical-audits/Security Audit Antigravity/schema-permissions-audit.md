# Appwrite Schema / Permissions Audit — WiseResume-TWC

**Date:** 2026-06-09 | **Audited commit:** `main` @ `96beb3ec`  
**Files:** `scripts/setup_*.cjs`, `appwrite.json`

---

## Overview

WiseResume uses a single Appwrite database (`DB_ID = 'main'`). Collections are created/maintained by `setup_*.cjs` scripts run in the GHA deploy pipeline. Each script is designed to be idempotent (safe to run multiple times).

---

## Per-Collection Permissions

### `ai_request_logs` (setup_observability_schema.cjs)

```
setup_observability_schema.cjs line 98-100:
// No public permissions: this collection is accessed only via server API key.
'✅ collection created (no public permissions — server-only)'
```

**Permissions:** Server-only (no user or guest access) ✅  
**Risk:** Low. Used for rate limiting and analytics. Accessed only via function API key.

---

### `app_settings` (setup_app_settings_schema.cjs)

```
'✅ collection created (server-only permissions)'
```

**Permissions:** Server-only ✅  
**Risk:** Low. Stores system-wide configuration (maintenance mode, announcements, etc.).

---

### `idempotency_cache` (setup_idempotency_schema.cjs)

```
'✅ collection created (server-only permissions)'
```

**Permissions:** Server-only ✅  
**Risk:** Low. 5-minute TTL deduplication cache for AI requests.

---

### `ai_credits` (referenced in ai-gateway, no dedicated setup script found)

**Permissions:** From code analysis of ai-gateway — users can read their own credit document, server writes.

ai-gateway `loadCreditState()` fetches with the function API key (server context), not the user JWT. This means:
- Users cannot directly read their credit count via Appwrite client SDK (unless the collection has user-read permissions)
- Frontend reads credit info via authenticated ai-gateway responses

**STATUS: UNKNOWN** — the setup script for `ai_credits` was not found in `scripts/`. Either it was created manually or via a script not in the standard `scripts/` directory. Permissions need to be verified in the Appwrite Console.

**Manual verification:**
1. Appwrite Console → Databases → main → Collections → ai_credits
2. Check Read permissions — should be `user:${userId}` per document or `users` at collection level
3. Check Write permissions — should be server-only (no user writes)

---

### `company_briefings` (setup_company_briefings_schema.cjs)

```js
const createForUsers = sdk.Permission.create(sdk.Role.users());
// + documentSecurity: true (per-document permissions)
```

**Permissions:** 
- Collection-level: `create` for any authenticated user
- Document-level security enabled: per-document read/write controlled at creation time

From `public-share` hub's document creation (ai-gateway/admin-devkit-data contexts), documents are created with `read("user:${userId}")`, `update(...)`, `delete(...)` permissions.

**Risk:** Low. Users can create their own briefings but cannot read/write others' documents. ✅

---

### `tailoring_lineage` (setup_tailoring_lineage_schema.cjs)

**Permissions:** Server-only (inferred from "✓ collection created (server-only permissions)" pattern in script)  
**Risk:** Low. Stores AI tailoring audit trail.

---

### `chat_sessions` — UNKNOWN ⚠️

**No setup script found** for `chat_sessions`. Permissions are not set by any `scripts/setup_*.cjs` file.

`public-share` creates documents in this collection:
```js
const chatSession = await db.createDocument(
  DB_ID,
  CHAT_SESSIONS_COLLECTION_ID,
  sdk.ID.unique(),
  { question_count: 0 },
  // No permissions array specified!
);
```

**Risk:** If no explicit document permissions are passed and the collection has open permissions, public visitors might be able to read all chat sessions.

**Manual verification:**
1. Appwrite Console → Databases → main → Collections → chat_sessions
2. Verify collection-level permissions
3. Verify document-level permissions (documentSecurity setting)
4. Confirm `question_count` attribute exists (related to WR-2026-008)

---

### `ai_routing_config` — UNKNOWN ⚠️

**No setup script found** for `ai_routing_config`. This collection stores per-feature AI routing overrides set via the DevKit panel.

It is referenced in `admin-devkit-data/src/main.js` and `ai-gateway/src/main.js`. Permissions and schema are UNKNOWN.

**Risk:** If this collection has overly permissive read access, any authenticated user could see admin routing overrides. Write access is admin-only in code, but if collection-level write permissions are open, a user could manipulate routing configuration.

**Manual verification:**
1. Appwrite Console → Databases → main → Collections → ai_routing_config
2. Verify read permissions are limited to authenticated users (acceptable)
3. Verify write permissions are server-only (required)

---

### `resumes` and `tailor_history` — Pre-existing Collections

These were created before the current codebase context. Permissions are inherited from the original Appwrite project setup.

**STATUS: UNKNOWN** — requires Console verification  
**Risk level:** HIGH IMPORTANCE — resumes contain user PII

**Manual verification:**
1. Verify `resumes` collection read permission = `user:${userId}` per document or `users` with documentSecurity
2. Verify `resumes` collection write permission = `user:${userId}` per document (users should not be able to read/write other users' resumes)
3. Same for `tailor_history`

---

## Schema Script Safety Assessment

All 6 setup scripts (`setup_observability_schema.cjs`, `setup_app_settings_schema.cjs`, `setup_ai_logs_schema.cjs`, `setup_idempotency_schema.cjs`, `setup_company_briefings_schema.cjs`, `setup_tailoring_lineage_schema.cjs`) follow a safe pattern:
- Check for existing collection before creating ✅
- Idempotent — safe to re-run ✅
- Use server API key (not user JWT) ✅
- No destructive operations (drop/recreate) ✅

---

## Missing Setup Scripts (Gap)

Collections used by the application but not managed by `scripts/setup_*.cjs`:
- `ai_credits` — created when?
- `chat_sessions` — created when? what permissions?
- `ai_routing_config` — created when? what permissions?
- `resumes`, `tailor_history`, `profiles` — legacy collections

**Recommendation:** Create setup scripts for all missing collections to make schema management fully code-driven and auditable. This is especially important for `chat_sessions` (permissions gap) and `ai_routing_config` (write permission risk).
