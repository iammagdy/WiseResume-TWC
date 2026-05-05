# stitch-visitor-identity

**Last verified:** 2026-05-05 (Task #4)

Post-login anon→user identity linking. Requires valid user JWT.

- **Method**: POST
- **Body**: `{ anonId: string }` — the value of `localStorage.wise_anon_id`
- **Effect**: `UPDATE visitor_events SET user_id = <authed_user_id> WHERE anon_id = <anonId> AND user_id IS NULL`
- **Called by**: `useVisitorTracking` hook on first render when `userId` transitions from `null` to a real UUID
