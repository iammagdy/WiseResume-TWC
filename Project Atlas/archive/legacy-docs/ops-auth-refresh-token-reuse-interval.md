> [!CAUTION]
> Historical / archived document. Do not treat as current project truth. Use Project Atlas/SOURCE_OF_TRUTH_MAP.md and living specs for current references.

# Lower `security_refresh_token_reuse_interval` (AUTH-5 / audit M-?)

This is a Supabase Auth setting that is **not** managed in code (no migration,
no `config.toml` field exposed by the platform). It must be set per-project
via the Supabase Management API or the Dashboard.

## Target value

- Production: `0` (disable refresh-token reuse entirely)
- Staging:    `5` seconds (enough slack for legitimate retry storms)

The previous default in this project was `10` seconds, which the auth audit
flagged as wider than necessary for a low-volume admin surface.

## How to apply (Dashboard)

1. Open the Supabase Dashboard → **Project Settings → Authentication →
   Sessions**.
2. Locate **Refresh token reuse interval (seconds)**.
3. Set the value to the target above and click **Save**.
4. Sign out one test admin and sign back in to confirm sessions still work.

## How to apply (Management API)

```bash
curl -X PATCH \
  "https://api.supabase.com/v1/projects/$SUPABASE_PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_MANAGEMENT_PAT" \
  -H "Content-Type: application/json" \
  -d '{"security_refresh_token_reuse_interval": 0}'
```

Verify:

```bash
curl -s \
  "https://api.supabase.com/v1/projects/$SUPABASE_PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_MANAGEMENT_PAT" \
  | jq .security_refresh_token_reuse_interval
```

The response should print `0` (or `5` for staging).

## Audit evidence

After applying, paste the verification command's output (timestamped) into the
AUTH-5 task ticket so the change is auditable. There is no migration to grep
for — this runbook plus the ticket evidence are the source of truth.
