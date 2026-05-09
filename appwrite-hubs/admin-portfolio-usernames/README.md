# admin-portfolio-usernames

Appwrite Function serving **PortfolioUsernamesPanel** in the WiseResume DevKit.

## Sections & Actions

### Directory
| Action | Request body | Response |
|---|---|---|
| `directory_list` | `{ action, search?, sort?, page?, per_page? }` | `{ rows: DirectoryRow[], total }` |
| `directory_rename` | `{ action, user_id, new_username }` | `{ ok: true, username }` |
| `directory_toggle_enabled` | `{ action, user_id, enabled }` | `{ ok: true, portfolio_enabled }` |
| `directory_release` | `{ action, user_id? }` or `{ action, user_ids? }` | `{ ok: true, released }` |
| `directory_bulk_disable` | `{ action, user_ids: string[] }` | `{ ok: true, disabled }` |

`sort` values: `newest` \| `oldest` \| `username_asc` \| `username_desc`

### Rules
| Action | Request body | Response |
|---|---|---|
| `rules_get` | `{ action }` | `{ rules: Rules, overrides: OverrideRow[] }` |
| `rules_update` | `{ action, min_length?, max_length?, allow_hyphens? }` | `{ rules: Rules }` |
| `rules_override_upsert` | `{ action, user_id, min_length?, max_length?, allow_hyphens?, note? }` | `{ ok: true }` |
| `rules_override_delete` | `{ action, user_id }` | `{ ok: true }` |

### Reserved
| Action | Request body | Response |
|---|---|---|
| `reserved_list` | `{ action }` | `{ rows: ReservedRow[] }` |
| `reserved_add` | `{ action, username, reason? }` | `{ ok: true, username }` |
| `reserved_delete` | `{ action, username }` | `{ ok: true }` |

### Exclusive
| Action | Request body | Response |
|---|---|---|
| `exclusive_list` | `{ action }` | `{ rows: ExclusiveRow[] }` |
| `exclusive_add` | `{ action, username, user_id, note? }` | `{ ok: true, username }` |
| `exclusive_delete` | `{ action, username }` | `{ ok: true }` |

### Premium
| Action | Request body | Response |
|---|---|---|
| `premium_list` | `{ action }` | `{ rows: PremiumRow[] }` |
| `premium_add` | `{ action, username, price_cents, currency, note? }` | `{ ok: true, username }` |
| `premium_delete` | `{ action, username }` | `{ ok: true }` |
| `premium_assign` | `{ action, username, user_id, note? }` | `{ ok: true, username, assigned_to_user_id }` |

`premium_assign` also sets the username on the user's `profiles` doc and enables their portfolio.

### Shared
| Action | Request body | Response |
|---|---|---|
| `user_search` | `{ action, query }` | `{ rows: UserSearchResult[] }` |

`query` must be ≥ 2 characters. Searches `email`, `full_name`, and `username` (requires full-text indexes on those attributes).

## Response shapes

```ts
DirectoryRow  = { user_id, username, full_name, email, portfolio_enabled, created_at, updated_at }
Rules         = { id: 1, min_length, max_length, allow_hyphens }
OverrideRow   = { user_id, min_length, max_length, allow_hyphens, note, updated_at, profile }
ReservedRow   = { username, reason, created_at }
ExclusiveRow  = { username, user_id, note, created_at, profile }
PremiumRow    = { username, price_cents, currency, status, assigned_to_user_id, assigned_at, note, created_at, updated_at, profile }
UserSearchResult = { user_id, email, full_name, username }
profile       = { email, full_name, username }
```

## Auth

All requests must include:
```
Authorization: Bearer <DEVKIT_PASSWORD>
```

## Required Function Variables

| Variable | Description |
|---|---|
| `DEVKIT_PASSWORD` | Shared secret matching the frontend DevKit token |
| `APPWRITE_API_KEY` | API key with `databases.read` and `databases.write` scopes |
| `APPWRITE_ENDPOINT` | `https://fra.cloud.appwrite.io/v1` |
| `APPWRITE_PROJECT_ID` | `69fd362b001eb325a192` |

## Database collections (Database ID: `main`)

### `profiles` (existing)
Existing collection. Attributes used by this function:

| Attribute | Type | Notes |
|---|---|---|
| `$id` | string | Appwrite user `$id` |
| `username` | string(50) | nullable, unique index required |
| `portfolio_enabled` | boolean | nullable |
| `full_name` | string(200) | nullable |
| `email` | string(320) | nullable |

Full-text indexes required on `email`, `full_name`, `username` for `user_search` and `directory_list` search.

### `username_rules`
Single-row config document (`$id = "global"`).

| Attribute | Type | Default |
|---|---|---|
| `min_length` | integer | 3 |
| `max_length` | integer | 30 |
| `allow_hyphens` | boolean | true |

### `username_rules_overrides`
`$id` = user's Appwrite `$id`.

| Attribute | Type | Notes |
|---|---|---|
| `min_length` | integer | nullable |
| `max_length` | integer | nullable |
| `allow_hyphens` | boolean | nullable |
| `note` | string(500) | nullable |

### `username_reserved`
`$id` = the reserved username (lowercase).

| Attribute | Type | Notes |
|---|---|---|
| `reason` | string(500) | nullable |

### `username_exclusive`
`$id` = the reserved username (lowercase).

| Attribute | Type | Notes |
|---|---|---|
| `user_id` | string(100) | Appwrite user `$id` of the exclusive holder |
| `note` | string(500) | nullable |

### `username_premium`
`$id` = the premium username (lowercase).

| Attribute | Type | Notes |
|---|---|---|
| `price_cents` | integer | price in smallest currency unit |
| `currency` | string(10) | e.g. `usd` |
| `status` | string(20) | `available` \| `pending` \| `assigned` |
| `assigned_to_user_id` | string(100) | nullable |
| `assigned_at` | string(30) | nullable, ISO-8601 |
| `note` | string(500) | nullable |

Indexes: `status` (key), `$createdAt` (key, desc)

## Deploy

### Appwrite Console
1. Functions → Create function → Node.js 18
2. Name: `admin-portfolio-usernames`
3. Upload zip of this directory
4. Set all Function Variables listed above
5. Deploy

### CLI
```bash
appwrite functions createDeployment \
  --functionId=admin-portfolio-usernames \
  --code=. \
  --activate=true \
  --entrypoint="src/main.js"
```
