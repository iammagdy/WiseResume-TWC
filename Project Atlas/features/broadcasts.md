# Feature Specification: Authenticated Workspace Broadcasts

**Last Verified:** 2026-07-24
**Status:** Active Production Feature - Empty Collection
**Location:** `Project Atlas/features/broadcasts.md`

---

## 1. User Goal

Shows dismissible platform announcements to signed-in WiseResume workspace users without exposing admin-controlled records directly to browsers or public routes.

## 2. Delivery Flow

```txt
DevKit owner publishes
  -> admin-devkit-data writes the server-only broadcasts collection
  -> authenticated workspace creates a short-lived Appwrite JWT
  -> GET /api/broadcasts validates the Appwrite account
  -> server filters and sanitizes visible records
  -> BroadcastBanner renders records not dismissed in this browser session
```

## 3. Canonical Model

* `title`: required string, maximum 256 characters.
* `body`: required string, maximum 4,096 characters.
* `severity`: `info`, `warning`, or `critical`; defaults to `info`.
* `active`: canonical status boolean; defaults to `false` at the schema boundary and is set to `true` only by the owner publish action.
* `created_by`: owner/admin Appwrite user ID.
* `created_at`: creation timestamp.
* `expires_at`: optional expiry timestamp.
* Start-time scheduling and audience segmentation are not part of the current approved contract.

## 4. Visibility Rules

* Request only on authenticated, non-public workspace routes after auth readiness and a user ID.
* Render only records with `active === true`.
* Hide records at or after `expires_at`.
* Fail closed for missing IDs, blank required text, or malformed expiry values.
* Return at most 20 visible records, newest first.
* Session dismissal uses `wiseresume_dismissed_broadcasts`.
* Logout or disabled route policy clears loaded Broadcast state.

## 5. Security Model

* Appwrite collection: `main/broadcasts`.
* Collection permissions: empty.
* `documentSecurity`: `false`.
* Browser direct collection reads and all normal-user mutations are prohibited.
* `GET /api/broadcasts` validates `X-Appwrite-JWT` through Appwrite `/account` and returns only `id`, `title`, `body`, and `severity`.
* DevKit mutations require its signed owner session and run through `admin-devkit-data`.
* Public standalone routes must not call the Broadcast endpoint.

## 6. Admin Behavior

* `list-broadcasts`: returns owner-visible records.
* `publish-broadcast`: validates text/severity/expiry, writes `active: true`, and records content-free audit metadata.
* `expire-broadcast`: writes `active: false`.
* No delete action is exposed; historical records are preserved.

## 7. Deployment and Schema

* Idempotent helper: `scripts/setup_broadcasts_schema.cjs`.
* Targeted workflow: `.github/workflows/deploy-appwrite-hubs.yml` with target `admin-devkit-data`.
* Latest verified function deployment: `6a629b8351abe36cd0c3`.
* Latest source hash: `21a8df1890e76655c36e403fc8c17813de11db4e22d6b77ecaba8a2539e97e02`.
* Current collection count: zero documents. No production announcement content was created during verification.

## 8. Evidence

* [`../qa/production-stabilization/broadcast-schema-production-verification-2026-07-24.md`](../qa/production-stabilization/broadcast-schema-production-verification-2026-07-24.md)
