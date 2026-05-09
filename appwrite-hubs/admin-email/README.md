# admin-email

Appwrite Function that serves **EmailManagementPanel** (email-actions module) and **EmailAutomationsPanel** (resend-stats + resend-sync modules).

## Modules & Actions

### `resend-stats`

| `action` | Description | Returns |
|---|---|---|
| `stats` | Audience configs, contact counts, recent broadcasts | `StatsResponse` |
| `lookup` | Search a contact email across all audiences | `{ foundIn: string[] }` |
| `add` | Add a contact to an audience | `{ ok: true }` |
| `remove` | Remove a contact from an audience | `{ ok: true }` |

#### `stats` response shape

```json
{
  "success": true,
  "audiences": [
    { "key": "ALL_USERS", "label": "All Users", "configured": true, "id": "aud_xxx", "contactCount": 1234, "name": "WiseResume – All Users" }
  ],
  "checklist": [
    { "key": "ALL_USERS", "name": "All Users", "audienceKey": "RESEND_AUDIENCE_ALL_USERS", "trigger": "On signup", "emails": ["Welcome email", "Day-3 tips", "Day-7 check-in"] }
  ],
  "recentBroadcasts": [
    { "id": "bc_xxx", "name": "May newsletter", "status": "sent", "sentAt": "2026-05-01T10:00:00Z", "recipients": 800, "openRate": 0.42, "clickRate": 0.12 }
  ]
}
```

#### `lookup` request
```json
{ "module": "resend-stats", "action": "lookup", "email": "user@example.com" }
```

#### `add` / `remove` request
```json
{ "module": "resend-stats", "action": "add", "audienceKey": "RESEND_AUDIENCE_ALL_USERS", "email": "user@example.com" }
```

---

### `resend-sync`

Upserts all existing users from the `profiles` Appwrite collection into the `RESEND_AUDIENCE_ALL_USERS` audience.

```json
{ "module": "resend-sync" }
```

Returns: `{ "success": true, "total": 1200, "added": 1195, "failed": 5 }`

---

### `email-actions`

Sends a transactional email via Resend to a specific user.

| `action` | Description |
|---|---|
| `resend_confirmation` | Resend email-verification link |
| `send_magic_link` | Send passwordless sign-in link |
| `send_otp` | Send one-time verification code |
| `send_password_reset` | Send password-reset link |
| `send_custom` | Send an admin-composed custom email |

#### Request
```json
{
  "module": "email-actions",
  "action": "send_custom",
  "target_user_id": "user_abc",
  "target_email": "user@example.com",
  "custom_subject": "A note from us",
  "custom_body": "Hello! Just checking in."
}
```

Returns: `{ "success": true, "email": "user@example.com", "message_id": "re:_xxx" }`

---

## Deploy

### Appwrite Console

1. Project → Functions → Create Function
2. Name: `admin-email`
3. Function ID: `admin-email`
4. Runtime: Node.js 18
5. Entry point: `src/main.js`
6. Set Function Variables (see below)
7. Deploy source: upload this directory (zip `admin-email/`)

### CLI

```bash
appwrite functions createDeployment \
  --functionId admin-email \
  --entrypoint src/main.js \
  --code ./appwrite-hubs/admin-email \
  --activate true
```

## Required Function Variables

| Variable | Required | Description |
|---|---|---|
| `DEVKIT_PASSWORD` | Yes | Shared secret (same across all admin-* functions) |
| `RESEND_API_KEY` | Yes | Resend API key (`re:_xxx`) |
| `RESEND_FROM_EMAIL` | Yes | Sending address (must be verified in Resend), e.g. `hello@thewise.cloud` |
| `RESEND_FROM_NAME` | No | Display name (default: `WiseResume`) |
| `APPWRITE_API_KEY` | Yes | Appwrite key with `databases.read` scope (for sync) |
| `APPWRITE_ENDPOINT` | Yes | `https://fra.cloud.appwrite.io/v1` |
| `APPWRITE_PROJECT_ID` | Yes | `69fd362b001eb325a192` |
| `RESEND_AUDIENCE_ALL_USERS` | No | Resend audience ID for All Users |
| `RESEND_AUDIENCE_PREMIUM_USERS` | No | Resend audience ID for Premium Users |
| `RESEND_AUDIENCE_FREE_USERS` | No | Resend audience ID for Free Users |
| `RESEND_AUDIENCE_TRIAL_USERS` | No | Resend audience ID for Trial Users |
| `RESEND_AUDIENCE_INACTIVE` | No | Resend audience ID for Inactive Users |

## Required Database Collection — `profiles` (database `main`)

Used only by the `resend-sync` module. Attributes read: `email`, `contact_email`, `full_name`.

## Execute permissions

Set to **team members only** (do not allow `any` / `guests`).
