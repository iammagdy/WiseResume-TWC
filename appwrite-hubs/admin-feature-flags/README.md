# admin-feature-flags

Appwrite Function that serves **FeatureFlagsPanel** with full CRUD for feature flags stored in Appwrite Databases.

## Actions

| `action` | Description | Returns |
|---|---|---|
| `list` | Returns all flags, sorted by name | `{ flags: FeatureFlag[] }` |
| `upsert` | Create or update a flag by `name` slug | `{ flag: FeatureFlag }` |
| `delete` | Delete a flag by `name` | `{ deleted: string }` |

## FeatureFlag shape

```ts
interface FeatureFlag {
  id: string;                      // Appwrite document $id
  name: string;                    // slug (lowercase, underscores)
  description: string;
  enabled_globally: boolean;       // on for every user
  enabled_plans: string[];         // ["free", "pro", "trial", "premium"]
  enabled_user_ids: string[];      // per-user overrides
  percentage_rollout: number;      // 0–100; deterministic hash
  kill_switch_function: string | null; // Appwrite Function name to block
  updated_by: string;              // admin identifier
  updated_at: string;              // ISO timestamp
}
```

## Request examples

### list
```json
{ "action": "list" }
```

### upsert (create or update)
```json
{
  "action": "upsert",
  "name": "dark_mode_v2",
  "description": "Enables the new dark mode palette",
  "enabled_globally": false,
  "enabled_plans": ["pro", "premium"],
  "enabled_user_ids": ["user_abc", "user_def"],
  "percentage_rollout": 25,
  "kill_switch_function": null
}
```

Returns: `{ "success": true, "flag": { ...FeatureFlag } }`

**Note:** `name` is automatically slugified (lowercased, non-alphanumeric → underscore).

### delete
```json
{ "action": "delete", "name": "dark_mode_v2" }
```

Returns: `{ "success": true, "deleted": "dark_mode_v2" }`

## Deploy

### Appwrite Console

1. Project → Functions → Create Function
2. Name: `admin-feature-flags`
3. Function ID: `admin-feature-flags`
4. Runtime: Node.js 18
5. Entry point: `src/main.js`
6. Set Function Variables (see below)
7. Deploy source: upload this directory (zip `admin-feature-flags/`)

### CLI

```bash
appwrite functions createDeployment \
  --functionId admin-feature-flags \
  --entrypoint src/main.js \
  --code ./appwrite-hubs/admin-feature-flags \
  --activate true
```

## Required Function Variables

| Variable | Value |
|---|---|
| `DEVKIT_PASSWORD` | Shared secret (same across all admin-* functions) |
| `APPWRITE_API_KEY` | API key with `databases.read` + `databases.write` scope |
| `APPWRITE_ENDPOINT` | `https://fra.cloud.appwrite.io/v1` |
| `APPWRITE_PROJECT_ID` | `69fd362b001eb325a192` |

## Required Collection — `feature_flags` (database `main`)

Create this collection in the Appwrite Console before deploying. Required attributes:

| Attribute | Type | Required | Default | Notes |
|---|---|---|---|---|
| `name` | string (255) | Yes | — | Must be indexed; add a unique index on `name` |
| `description` | string (2000) | No | `""` | |
| `enabled_globally` | boolean | Yes | `false` | |
| `enabled_plans` | string[] | No | `[]` | |
| `enabled_user_ids` | string[] | No | `[]` | |
| `percentage_rollout` | integer | Yes | `0` | Range 0–100 |
| `kill_switch_function` | string (255) | No | `null` | Nullable |
| `updated_by` | string (255) | No | `""` | |
| `updated_at` | string (32) | No | — | ISO timestamp string |

**Collection permissions:** Read + write for the API key used above.

## Execute permissions

Set to **team members only** (do not allow `any` / `guests`).
