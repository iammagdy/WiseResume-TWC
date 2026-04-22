/**
 * Cloudflare Pages middleware — content negotiation for AI agents.
 *
 * If the request has `Accept: text/markdown` and is for an HTML route,
 * return a markdown representation of the page with
 * `Content-Type: text/markdown`. Otherwise pass through to the static
 * asset (or to other Pages Functions) untouched.
 *
 * The hand-authored markdown for `/` lives in the constant below. For
 * other public routes, we fetch the upstream HTML asset, strip its
 * shell, and return a generic markdown extraction. This keeps the
 * markdown surface low-maintenance until per-route hand-authored
 * markdown is added.
 *
 * Implementation note: the runtime is the Cloudflare Pages Functions
 * worker (a Service Worker–style fetch handler). We deliberately avoid
 * any imports so the file works as-is in the Pages build.
 */

interface PagesContext {
  request: Request;
  next: () => Promise<Response>;
  env: Record<string, unknown>;
}

const HOME_MARKDOWN = `# WiseResume — AI-Powered Career Platform

WiseResume is an AI-powered resume builder, portfolio platform, and job-hunt
co-pilot. Sister product **WiseHire** is the HR-side hiring suite (JD writer,
brief generator, candidate pipeline, bulk screening) for companies and
agencies.

## What you can do here
- **Build & tailor resumes** with ATS scoring, gap analysis, and AI rewriting.
- **Generate cover letters** matched to specific job descriptions.
- **Publish a portfolio** at \`yourname.thewise.cloud\` to share with recruiters.
- **Run interview practice** with an AI coach that tracks weak spots.
- **(WiseHire)** Write JDs, generate candidate scorecards, run pipelines.

## Key public routes
- [/](https://resume.thewise.cloud/) — landing page (this page, switchable to WiseHire view)
- [/enterprises](https://resume.thewise.cloud/enterprises) — WiseHire landing
- [/pricing](https://resume.thewise.cloud/pricing) — plans and pricing
- [/enterprise](https://resume.thewise.cloud/enterprise) — WiseHire enterprise overview
- [/examples](https://resume.thewise.cloud/examples) — resume examples
- [/guides](https://resume.thewise.cloud/guides) — how-to guides
- [/whats-new](https://resume.thewise.cloud/whats-new) — changelog
- [/waitlist](https://resume.thewise.cloud/waitlist) — early-access waitlist
- [/wisehire/signup](https://resume.thewise.cloud/wisehire/signup) — HR signup
- [/auth](https://resume.thewise.cloud/auth) — sign in / sign up
- [/privacy-policy](https://resume.thewise.cloud/privacy-policy)
- [/terms-of-service](https://resume.thewise.cloud/terms-of-service)

## API & agent discovery
- [/.well-known/api-catalog](https://resume.thewise.cloud/.well-known/api-catalog) — RFC 9727 link set
- [/.well-known/oauth-protected-resource](https://resume.thewise.cloud/.well-known/oauth-protected-resource) — RFC 9728
- [/.well-known/openid-configuration](https://resume.thewise.cloud/.well-known/openid-configuration)
- [/.well-known/mcp/server-card.json](https://resume.thewise.cloud/.well-known/mcp/server-card.json)
- [/.well-known/agent-skills/index.json](https://resume.thewise.cloud/.well-known/agent-skills/index.json)
- [/docs/api](https://resume.thewise.cloud/docs/api) — service documentation

## Contact
support@thewise.cloud
`;

function wantsMarkdown(req: Request): boolean {
  const accept = req.headers.get('accept') || '';
  // We only switch when text/markdown is *explicitly* requested. Most
  // browsers send Accept: text/html,... — we never want to hijack those.
  if (!accept.includes('text/markdown')) return false;
  // Bail if the client clearly prefers HTML (q-values omitted intentionally;
  // a strict order parser is overkill here).
  if (accept.startsWith('text/html')) return false;
  return true;
}

function isHtmlRoute(url: URL): boolean {
  const p = url.pathname;
  // Skip assets, well-known, sitemap, robots — they have their own content type.
  if (p.startsWith('/assets/')) return false;
  if (p.startsWith('/.well-known/')) return false;
  if (p.startsWith('/icons/')) return false;
  if (p === '/sitemap.xml' || p === '/robots.txt') return false;
  if (p.startsWith('/api/')) return false;
  // Files with a non-HTML extension are passed through.
  const lastSegment = p.split('/').pop() || '';
  if (lastSegment.includes('.') && !lastSegment.endsWith('.html')) return false;
  return true;
}

function htmlToMarkdown(html: string): string {
  // Best-effort HTML→markdown extraction. We strip <script>/<style>,
  // collapse whitespace, and emit headings/links/paragraphs. Good enough
  // for agent ingestion of static marketing copy; per-route hand-authored
  // markdown can replace this later.
  let h = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '');

  // Extract <title> for the H1.
  const titleMatch = h.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : 'WiseResume';

  // Replace headings.
  h = h.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_m, level: string, inner: string) => {
    const hashes = '#'.repeat(Math.min(6, parseInt(level, 10)));
    return `\n\n${hashes} ${stripTags(inner).trim()}\n\n`;
  });
  // Replace links.
  h = h.replace(/<a [^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, inner: string) => {
    return `[${stripTags(inner).trim()}](${href})`;
  });
  // Lists.
  h = h.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m, inner: string) => `- ${stripTags(inner).trim()}\n`);
  // Paragraphs / line breaks.
  h = h.replace(/<\/(p|div|section|article|header|footer|main|li|ul|ol)>/gi, '\n\n');
  h = h.replace(/<br\s*\/?>/gi, '\n');

  const text = stripTags(h).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return `# ${title}\n\n${text}\n`;
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

export const onRequest = async (context: PagesContext): Promise<Response> => {
  const { request, next } = context;
  const url = new URL(request.url);

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return next();
  }
  if (!wantsMarkdown(request) || !isHtmlRoute(url)) {
    return next();
  }

  // Hand-authored markdown for the home page.
  if (url.pathname === '/' || url.pathname === '/index.html') {
    return new Response(HOME_MARKDOWN, {
      status: 200,
      headers: buildMarkdownHeaders('authored'),
    });
  }

  // Generic fallback: fetch the upstream HTML and convert.
  const upstream = await next();
  const ct = upstream.headers.get('content-type') || '';
  if (!ct.includes('text/html')) {
    return upstream;
  }
  const html = await upstream.text();
  const md = htmlToMarkdown(html);
  return new Response(md, {
    status: upstream.status,
    headers: buildMarkdownHeaders('extracted'),
  });
};

// Build response headers for markdown responses. Includes the same
// Link relations served by `public/_headers` for the HTML version of
// the homepage (api-catalog, service-doc, sitemap), so AI agents can
// discover the rest of the surface regardless of which Accept variant
// they used.
function buildMarkdownHeaders(source: 'authored' | 'extracted'): HeadersInit {
  const headers = new Headers({
    'Content-Type': 'text/markdown; charset=utf-8',
    'Cache-Control': 'public, max-age=300',
    'X-Markdown-Source': source,
  });
  headers.append('Link', '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"');
  headers.append('Link', '</docs/api>; rel="service-doc"; type="text/html"');
  headers.append('Link', '</sitemap.xml>; rel="sitemap"; type="application/xml"');
  return headers;
}
