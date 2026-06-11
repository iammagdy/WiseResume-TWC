# admin-moderation

Appwrite Function serving **ModerationPanel** in the WiseResume DevKit.

## Actions

| Action | Request body | Response |
|---|---|---|
| `list_bug_reports` | `{ action, status_filter?, page?, per_page? }` | `{ bug_reports: BugReport[], total }` |
| `update_bug_report` | `{ action, report_id, status?, private_note? }` | `{ ok: true }` |
| `list_blocklist` | `{ action }` | `{ entries: BlocklistEntry[] }` |
| `add_blocklist` | `{ action, type, value, reason? }` | `{ ok: true, id }` |
| `remove_blocklist` | `{ action, entry_id }` | `{ ok: true }` |
| `list_moderation_queue` | `{ action, status_filter?, page?, per_page? }` | `{ items: QueueItem[], total }` |
| `review_queue_item` | `{ action, item_id, decision, suspend_user? }` | `{ ok: true, decision }` |

`status_filter` for bug reports: `open` \| `in-progress` \| `resolved` \| `wont-fix` \| `all`  
`status_filter` for queue: `pending` \| `approved` \| `removed` \| `all`  
`decision` for review: `approved` \| `removed`  
`type` for blocklist: `email` \| `user_id` \| `pattern`

`suspend_user: true` calls the Appwrite Users API to disable the reported user's account.

## Auth

All requests must include:
```
Authorization: Bearer <DEVKIT_PASSWORD>
```

## Required Function Variables

| Variable | Description |
|---|---|
| `DEVKIT_PASSWORD` | Shared secret matching the frontend DevKit token |
| `APPWRITE_API_KEY` | API key with `databases.read`, `databases.write`, `users.write` scopes |
| `APPWRITE_ENDPOINT` | `https://fra.cloud.appwrite.io/v1` |
| `APPWRITE_PROJECT_ID` | `69fd362b001eb325a192` |

## Database collections (Database ID: `main`)

### `moderation_bugs` (replaces legacy `bug_reports`)
| Attribute | Type | Required | Notes |
|---|---|---|---|
| `user_email` | string(320) | no | |
| `error_message` | string(2000) | yes | |
| `error_stack` | string(8000) | no | |
| `component_stack` | string(8000) | no | |
| `additional_context` | string(4000) | no | |
| `session_id` | string(100) | no | |
| `user_agent` | string(500) | no | |
| `route` | string(500) | no | |
| `status` | string(50) | yes | default: `open` |
| `private_note` | string(2000) | no | |
| `app_version` | string(50) | no | |

Indexes: `status` (key), `$createdAt` (key, desc)

### `blocklist`
| Attribute | Type | Required | Notes |
|---|---|---|---|
| `type` | string(50) | yes | `email` \| `user_id` \| `pattern` |
| `value` | string(500) | yes | |
| `reason` | string(500) | no | |
| `added_by` | string(100) | no | reserved for future use |

Indexes: `type` (key), `$createdAt` (key, desc)

### `moderation_queue`
| Attribute | Type | Required | Notes |
|---|---|---|---|
| `content_type` | string(100) | yes | e.g. `portfolio`, `resume`, `comment` |
| `content_id` | string(100) | no | |
| `snippet` | string(2000) | no | preview of flagged content |
| `reporter_user_id` | string(100) | no | Appwrite user `$id` |
| `status` | string(50) | yes | default: `pending` (Appwrite: use optional attribute + default, not required+default) |
| `reviewed_by` | string(100) | no | |
| `reviewed_at` | string(30) | no | ISO-8601 timestamp |

Indexes: `status` (key), `$createdAt` (key, desc)

## Deploy

### Appwrite Console
1. Functions → Create function → Node.js 18
2. Name: `admin-moderation`
3. Upload zip of this directory (include `node_modules` or use build step)
4. Set all Function Variables listed above
5. Deploy

### CLI
```bash
appwrite functions createDeployment \
  --functionId=admin-moderation \
  --code=. \
  --activate=true \
  --entrypoint="src/main.js"
```
