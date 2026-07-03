# track-visitor-event

**Last verified:** 2026-05-05 (Task #6 — deployed to production)

Anonymous bulk-insert endpoint for visitor tracking events.

- **Auth**: None (open endpoint; rate-limited by IP)
- **Method**: POST
- **Body**: `{ events: VisitorEvent[] }` (max 100 per call, first 100 taken)
- **Rate limit**: 120 requests / minute per IP via `checkIpRateLimit`
- **Geo**: `country` and `city` filled from Cloudflare `CF-IPCountry` / `CF-IPCity` headers
- **Event types**: `page_view`, `click`, `section_view`, `feature_use`
- **Device types**: `mobile`, `desktop`, `tablet`
- **RLS**: anon + authenticated insert allowed; service_role reads only
- **Production status**: ACTIVE — deployed 2026-05-05 via `supabase functions deploy`
