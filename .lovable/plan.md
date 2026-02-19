
# Animated OG Image Endpoint for Portfolio Social Previews

## The Core Problem

When a user shares `wiseresume.app/p/johndoe` on LinkedIn, Twitter/X, WhatsApp, or iMessage, the social platform's crawler fetches the URL and reads the `og:image` meta tag. Right now, that tag is set client-side in `PublicPortfolioPage.tsx` to just the user's `avatarUrl` (an arbitrary photo), which is:

1. Often blocked by CORS or Supabase Storage headers from being scraped
2. Just a face photo — no branding, no name, no role, no visual identity
3. Generated after JavaScript runs — crawlers don't execute JS, so they see the static `index.html` which has the generic `favicon.svg` as the OG image

The fix requires a **server-rendered OG image** — an edge function that dynamically generates a 1200×630 PNG image at request time from the user's profile data, and a corresponding HTML page that serves the correct `og:image` meta tag **in the raw HTML** (not via JavaScript).

---

## Why a New Edge Function (Not Server-Side Rendering)

This app is a pure React SPA — there is no Next.js SSR layer. Social crawlers (Twitterbot, LinkedInBot, facebookexternalhit) don't execute JavaScript, so `PublicPortfolioPage.tsx`'s `useEffect` that sets OG meta tags is invisible to them.

The solution is a two-part approach:

**Part 1 — `og-image` edge function**: A Deno edge function at `/functions/v1/og-image?username=johndoe` that:
- Fetches the user's profile data from the database (name, job title, accent color, skills)
- Generates a 1200×630 PNG image server-side using pure SVG → PNG conversion via the `resvg-wasm` Deno library (no headless browser needed)
- Returns the image with `Content-Type: image/png` and long-lived cache headers

**Part 2 — `portfolio-meta` edge function**: A lightweight Deno edge function at `/functions/v1/portfolio-meta?username=johndoe` that returns a minimal HTML document containing only the correct `<meta>` OG tags and an immediate JavaScript redirect to the actual SPA. Crawlers read the meta tags; real users are instantly redirected.

Then we update the app's router to handle `/p/:username` via a meta-redirect HTML response for crawlers, while letting real browser visits pass through normally to the SPA.

**Simpler alternative (chosen):** Update `supabase/config.toml` to point the `/p/:username` path to the `portfolio-meta` edge function only for crawler User-Agents, using a single edge function that detects the User-Agent and either serves meta HTML or returns a 302 redirect to the SPA. This is the pattern used by apps like Vercel OG, Notion, etc.

---

## Architecture

```text
Crawler (LinkedInBot, Twitterbot) opens:
  wiseresume.app/p/johndoe
        │
        ▼  (via Vite config or edge function routing)
  portfolio-meta edge function
        │
        ├─ fetches profile: name, role, accent, top 3 skills, bio, avatar
        │
        ├─ returns HTML: <meta og:image="…/og-image?u=johndoe"> etc.
        │
        └─ real browser: 302 → /p/johndoe (SPA handles it normally)

                     ↓

  og-image edge function ← crawler fetches this URL
        │
        ├─ fetches same profile data
        ├─ generates SVG string (inline, no filesystem)
        ├─ converts SVG → PNG via resvg-wasm
        └─ returns image/png with Cache-Control: public, max-age=3600
```

---

## Image Design (1200×630px)

The image adapts to the user's `portfolioAccentColor` and `portfolioStyle`. Layout:

```
┌────────────────────────────────────────────────────────────────────┐
│  [radial glow blob — accent color, top-left]                       │
│                                                                    │
│  ┌──────┐   John Doe                    [WiseResume wordmark]      │
│  │ MONO │   Senior Frontend Engineer                               │
│  │GRAM  │   📍 Dubai, UAE               ✦ Open to Work            │
│  └──────┘                                                          │
│                                                                    │
│  ────────────────────────────────────────────────────────────────  │
│                                                                    │
│  Top Skills                                                        │
│  [React]  [TypeScript]  [Node.js]  [AWS]  [PostgreSQL]           │
│                                                                    │
│  ────────────────────────────────────────────────────────────────  │
│                                                                    │
│  wiseresume.app/p/johndoe          Made with ✦ WiseResume         │
└────────────────────────────────────────────────────────────────────┘
```

The avatar is rendered as a colored monogram circle (first letter of name) if the avatar URL is an external URL (avoids CORS issues in Deno). If the avatar is from Supabase Storage (contains `supabase.co`), it is fetched and embedded as a base64 PNG.

Four accent backgrounds matching the portfolio themes:
- `minimal`: `#0a0a14` (very dark navy) 
- `bold-dark`: `#0a0a1f` (deep space purple)
- `glass-pro`: `#0d1117` (GitHub-dark)
- `classic-clean`: `#f8faff` (near-white, dark text)

---

## Files to Create/Modify

### 1. `supabase/functions/og-image/index.ts` (NEW)

A Deno edge function that:
- Reads `?username=` from query params
- Calls `supabase.rpc('get_public_portfolio', { p_username })` using service role to bypass RLS
- Builds a 1200×630 SVG string with the profile data (name, role, location, skills, accent color, open-to-work badge)
- Uses `@resvg/resvg-wasm` to convert SVG → PNG in Deno
- Returns `Response` with `Content-Type: image/png`, `Cache-Control: public, max-age=3600, stale-while-revalidate=86400`

**SVG generation approach** — pure string concatenation, no DOM:
```typescript
function buildSVG(data: OGImageData): string {
  const { name, role, location, skills, accent, style, openToWork, username } = data;
  const bg = styleToBg(style);   // '#0a0a14' etc.
  const fg = style === 'classic-clean' ? '#111827' : '#f5f5ff';
  const mutedFg = style === 'classic-clean' ? '#6b7280' : '#9ca3af';
  const monogram = name?.charAt(0)?.toUpperCase() || '?';
  const top5 = skills.slice(0, 5);
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <!-- Background -->
    <rect width="1200" height="630" fill="${bg}" />
    <!-- Glow blob -->
    <radialGradient id="glow" cx="15%" cy="20%" r="40%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <rect width="1200" height="630" fill="url(#glow)" />
    <!-- ... rest of layout ... -->
  </svg>`;
}
```

**Dependency note**: `@resvg/resvg-wasm` is available as a Deno-compatible WASM module from `https://esm.sh/@resvg/resvg-wasm`. The WASM binary is fetched once and cached in memory.

### 2. `supabase/functions/portfolio-meta/index.ts` (NEW)

Returns crawler-friendly HTML with proper OG meta tags. Detects User-Agent:
- If it's a known crawler (`LinkedInBot`, `Twitterbot`, `facebookexternalhit`, `Slackbot`, `WhatsApp`, `Discordbot`): returns full HTML with OG tags
- Otherwise: returns `302 Location: /p/{username}` to the SPA

```typescript
const CRAWLERS = ['linkedinbot', 'twitterbot', 'facebookexternalhit', 'slackbot', 'whatsapp', 'discordbot', 'telegrambot'];

function isCrawler(ua: string): boolean {
  const lower = ua.toLowerCase();
  return CRAWLERS.some(c => lower.includes(c));
}
```

The HTML response:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>John Doe — Senior Frontend Engineer</title>
  <meta property="og:title" content="John Doe — Senior Frontend Engineer" />
  <meta property="og:description" content="Senior Frontend Engineer · Dubai, UAE · React, TypeScript, Node.js" />
  <meta property="og:image" content="https://hjnnamwgztlhzkeuufln.supabase.co/functions/v1/og-image?username=johndoe" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:type" content="profile" />
  <meta property="og:url" content="https://wiseresume.app/p/johndoe" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="https://…/og-image?username=johndoe" />
</head>
<body>
  <script>window.location.replace('/p/johndoe');</script>
</body>
</html>
```

### 3. `supabase/config.toml` (MODIFY)

Add two new function entries:
```toml
[functions.og-image]
verify_jwt = false

[functions.portfolio-meta]
verify_jwt = false
```

### 4. `src/pages/PublicPortfolioPage.tsx` (MODIFY — lines 565–579)

Upgrade the SEO `useEffect` to set the `og:image` to the dynamic edge function URL instead of the raw avatar URL:

```typescript
// Replace line 575:
// BEFORE:
if (profile.avatarUrl) setMeta('og:image', profile.avatarUrl);

// AFTER (always set OG image to the generated endpoint):
const ogImageUrl = `${SUPABASE_URL}/functions/v1/og-image?username=${profile.username}`;
setMeta('og:image', ogImageUrl);
setMeta('og:image:width', '1200');
setMeta('og:image:height', '630');
setMeta('twitter:card', 'summary_large_image', 'name');
setMeta('twitter:image', ogImageUrl, 'name');
```

This ensures that when a real user visits the page and then copies the URL to share on social, the pre-populated share dialog in mobile OS shows the correct image. (The OG image endpoint also helps for platforms that do execute light JS.)

### 5. `src/components/portfolio/VisitorsPanel.tsx` or `PortfolioEditorPage.tsx` (MODIFY — low priority)

Add a "Preview OG Card" button inside the Portfolio Editor (in the Status/Share section) that opens the og-image URL in a new tab so the user can see what their social preview will look like:

```tsx
<Button
  variant="ghost"
  size="sm"
  className="text-xs"
  onClick={() => window.open(`${SUPABASE_URL}/functions/v1/og-image?username=${profile?.username}`, '_blank')}
>
  <Eye className="w-3.5 h-3.5 mr-1" /> Preview Social Card
</Button>
```

---

## Technical Implementation Details

### SVG → PNG conversion in Deno

`@resvg/resvg-wasm` is the standard choice for server-side SVG rendering in Deno edge functions. It works without a headless browser:

```typescript
import initWasm, { Resvg } from 'https://esm.sh/@resvg/resvg-wasm@2.6.2';
import wasmModule from 'https://esm.sh/@resvg/resvg-wasm@2.6.2/index_bg.wasm' assert { type: 'wasm' };

// Initialize once
await initWasm(wasmModule);

// Render
const resvg = new Resvg(svgString, { font: { loadSystemFonts: false } });
const pngData = resvg.render().asPng();
```

This runs entirely in-memory — no temp files, no shell commands.

### Font rendering in the SVG

Since system fonts are not available in Deno edge functions, all text in the SVG will use `font-family="system-ui, sans-serif"` which `resvg` maps to its built-in fallback font. For a premium look, we embed a minimal base64-encoded subset of Inter for just the characters used in the image (name + role, typically 20–60 chars). The font subset is stored as a constant string in the edge function (< 15KB gzipped).

Alternatively, we load Inter from Google Fonts at function startup: `https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800` — but this adds latency. The base64 inline approach is preferred.

### Caching Strategy

The `og-image` response includes:
```
Cache-Control: public, max-age=3600, stale-while-revalidate=86400
```

This means:
- Supabase's CDN serves the image for up to 1 hour without hitting the function
- For up to 24h after that, the CDN serves the stale image while revalidating in background
- After a user changes their profile (name/role/accent), the image updates within 1 hour for all new shares

For immediate invalidation (e.g. after user updates their portfolio), we could add a `?v={updated_at}` cache-busting param. The `PortfolioEditorPage` can append this when generating the share URL. This is optional and can be added as a follow-up.

### Data fetching in the edge function

The `og-image` function uses the existing `get_public_portfolio` RPC with the service role key:
```typescript
const { data } = await supabase.rpc('get_public_portfolio', { p_username: username });
```
This reuses the exact same data shape already defined — no new DB query needed.

### Error handling

If the profile doesn't exist or `portfolio_enabled = false`:
- Return a generic branded 1200×630 PNG (hardcoded SVG with just the WiseResume logo + "Build your portfolio at wiseresume.app") instead of a 404. This ensures social shares always look good even for deleted portfolios.

---

## What Each Platform Will Now Show

| Platform | Before | After |
|---|---|---|
| LinkedIn | Generic favicon OR avatar photo (no text) | Branded 1200×630 card with name, role, skills, accent color |
| Twitter/X | `summary` card (small image) | `summary_large_image` card (full-width 1200×630) |
| WhatsApp | No preview (JS not executed) | Full preview card from OG meta in HTML response |
| Discord | Generic app image | Full branded card |
| Slack | Generic app image | Full branded card |
| iMessage | No preview | Rich link preview with image |

---

## Files Summary

| File | Action |
|---|---|
| `supabase/functions/og-image/index.ts` | CREATE — SVG→PNG image generator |
| `supabase/functions/portfolio-meta/index.ts` | CREATE — crawler-aware meta HTML responder |
| `supabase/config.toml` | MODIFY — add both functions with `verify_jwt = false` |
| `src/pages/PublicPortfolioPage.tsx` | MODIFY — upgrade `og:image` to use dynamic endpoint URL + `summary_large_image` |
| `src/pages/PortfolioEditorPage.tsx` | MODIFY — add "Preview Social Card" button |

---

## What Does NOT Change

- The `get_public_portfolio` RPC — used as-is, no DB migration needed
- The `short_links` system — short link URLs also benefit automatically (they redirect to `/p/username` which has the correct meta)
- The `track-portfolio-view` edge function — no changes needed
- The React SPA routing — regular browser visits continue to use the SPA normally
- The Career Card feature — it generates its image client-side (html2canvas) for download, which is separate from the OG image endpoint
