
# Universal Link Shortener for All Sharing

## What Changes

Currently, short links only work for portfolio pages. This upgrade makes them work for **any app URL** -- portfolio shares, resume preview links, and the app itself.

When a user shares a resume or portfolio, instead of a long URL like `wiseresume.magdysaber.com/preview?shared=abc123`, they'll get a clean short link like `wiseresume.magdysaber.com/l/xK9mP` that redirects to the correct page.

---

## Technical Plan

### 1. Database: Add `target_url` column to `short_links`

Add a `target_url TEXT` column to store the full destination path (e.g., `/preview?shared=abc123` or `/p/john`). Make `portfolio_username` nullable since links won't always be portfolio-related.

```sql
ALTER TABLE public.short_links 
  ADD COLUMN target_url TEXT,
  ALTER COLUMN portfolio_username DROP NOT NULL;

-- Backfill existing portfolio links
UPDATE public.short_links 
  SET target_url = '/p/' || portfolio_username 
  WHERE target_url IS NULL;
```

Update RLS policies to keep the existing security model.

### 2. Update `resolve_short_link` RPC

Replace the current function to return `target_url` alongside `username` (for backwards compatibility):

```sql
CREATE OR REPLACE FUNCTION resolve_short_link(p_link_id TEXT)
RETURNS JSONB AS $$
DECLARE v_link RECORD;
BEGIN
  SELECT id, portfolio_username, label, target_url INTO v_link
  FROM public.short_links WHERE id = p_link_id;
  
  IF NOT FOUND THEN RETURN NULL; END IF;
  
  UPDATE public.short_links SET click_count = click_count + 1 WHERE id = p_link_id;
  
  RETURN jsonb_build_object(
    'username', v_link.portfolio_username,
    'label', v_link.label,
    'target_url', v_link.target_url
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. Update `ShortLinkPage.tsx` -- Universal Redirect

Instead of only redirecting to `/p/{username}`, use the `target_url` field first, falling back to username-based redirect for backwards compatibility:

```typescript
const result = await res.json();

if (result?.target_url) {
  // Universal redirect: target_url is a relative path like /preview?shared=xxx
  navigate(result.target_url, { replace: true });
} else if (result?.username) {
  // Legacy portfolio link
  navigate(`/p/${result.username}?ref=${linkId}`, { replace: true });
} else {
  setNotFound(true);
}
```

Also fix the existing bug: the component makes **two** API calls (one via `supabase.functions.invoke` and one via `fetch`). Remove the dead first call.

### 4. Update `shareUtils.ts` -- Auto-Shorten on Share

Add a `createShortUrl()` helper that creates a short link in the database and returns the shortened URL:

```typescript
export async function createShortUrl(targetPath: string, label?: string): Promise<string> {
  const slug = generateSlug(5);
  const { error } = await supabase
    .from('short_links')
    .insert({ id: slug, owner_user_id: userId, target_url: targetPath, label: label || 'Shared Link' });
  
  if (error) throw error;
  return `${PORTFOLIO_DOMAIN}/l/${slug}`;
}
```

Update `shareAsLink()` to use the short URL instead of the raw long URL:

```typescript
export async function shareAsLink(resumeId: string): Promise<void> {
  const targetPath = `/preview?shared=${resumeId}`;
  const shortUrl = await createShortUrl(targetPath, 'Resume Share');
  // Share/copy the short URL instead of the long one
}
```

### 5. Update `usePortfolioAnalytics.ts` -- Support Generic Links

Update `useCreateShortLink` to accept an optional `targetUrl` parameter so the VisitorsPanel can still create portfolio-specific short links while other parts of the app create generic ones.

### 6. Update `ShareSheet.tsx` -- Use Short Links

The "Share Link" action will now automatically generate a short link before sharing/copying.

---

## Files to Modify

| File | Change |
|------|--------|
| Database migration | Add `target_url` column, update `resolve_short_link` RPC |
| `src/pages/ShortLinkPage.tsx` | Universal redirect via `target_url`, remove duplicate API call |
| `src/lib/shareUtils.ts` | Add `createShortUrl()`, update `shareAsLink()` to auto-shorten |
| `src/hooks/usePortfolioAnalytics.ts` | Support `targetUrl` param in `useCreateShortLink` |
| `src/components/editor/ShareSheet.tsx` | Minor: pass user context for short link creation |
| `src/components/portfolio/VisitorsPanel.tsx` | Pass `target_url` when creating portfolio short links |
