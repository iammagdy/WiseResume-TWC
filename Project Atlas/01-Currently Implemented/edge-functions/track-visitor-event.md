# track-visitor-event

**Last verified:** 2026-05-05 (Task #4)

Anonymous bulk-insert endpoint for visitor tracking events.

- **Auth**: None (open endpoint; rate-limited by IP)
- **Method**: POST
- **Body**: `{ events: VisitorEvent[] }` (max 20 per call)
- **Rate limit**: 60 requests / minute per IP via `ip_rate_limits` table
- **Geo**: `country_code` filled from Cloudflare `CF-IPCountry` header
- **Event types**: `page_view`, `click`, `section_view`
- **RLS**: `service_role` key; client never touches DB directly
