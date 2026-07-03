# stitch-visitor-identity

**Last verified:** 2026-05-05 (Task #6 — deployed to production)

Post-login anon→user identity linking. Requires valid user JWT.

- **Method**: POST
- **Body**: `{ anon_id: string }` — the value of `localStorage.wise_anon_id`
- **Auth**: Bearer JWT decoded via `jose.decodeJwt`; `sub` claim used as `user_id`
- **Effect**: `UPDATE visitor_events SET user_id = <authed_user_id> WHERE anon_id = <anon_id> AND user_id IS NULL`
- **Called by**: `useVisitorTracking` hook on first render when `userId` transitions from `null` to a real UUID
- **Production status**: ACTIVE — deployed 2026-05-05 via `supabase functions deploy`
