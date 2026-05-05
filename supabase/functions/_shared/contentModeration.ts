/**
 * Shared content-moderation helper.
 *
 * Checks a piece of text against all `pattern` type entries in the `blocklist`
 * table.  For every matching pattern a row is inserted into `moderation_queue`
 * for admin review.  All operations are fire-and-forget so that a blocklist
 * failure never blocks the primary user action.
 */

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.49.1';

export interface PatternMatch {
  pattern: string;
  reason: string | null;
}

/**
 * screenContent — check `text` against the blocklist patterns and, if any
 * match, auto-create a pending moderation_queue entry.
 *
 * @param supabase   Service-role Supabase client.
 * @param text       Text to screen (AI output, user submission, etc.).
 * @param contentType  Descriptive label for the queue item (e.g. 'ai_enhance_section').
 * @param contentId  Optional UUID of the associated DB record.
 * @param reporterUserId  UUID of the user who triggered the generation.
 *
 * @returns Array of matching patterns (empty if none matched or on error).
 */
export async function screenContent(
  supabase: SupabaseClient,
  text: string,
  contentType: string,
  contentId?: string,
  reporterUserId?: string,
): Promise<PatternMatch[]> {
  if (!text?.trim()) return [];

  try {
    const { data: patterns, error } = await supabase
      .from('blocklist')
      .select('value, reason')
      .eq('type', 'pattern');

    if (error) {
      // 42P01 = table does not exist yet (pre-migration); silently ignore.
      if (error.code !== '42P01') {
        console.warn('[contentModeration] Failed to load patterns:', error.message);
      }
      return [];
    }

    const entries = patterns ?? [];
    const lowerText = text.toLowerCase();

    const matches: PatternMatch[] = entries
      .filter((p) => {
        const pat = String(p.value ?? '').toLowerCase();
        if (!pat) return false;
        // Support simple glob-like domain patterns (e.g. @spam.com) and plain word matching.
        return lowerText.includes(pat);
      })
      .map((p) => ({ pattern: String(p.value), reason: p.reason as string | null }));

    if (matches.length > 0) {
      // Fire-and-forget: create a queue item for each matching pattern.
      void (async () => {
        try {
          await supabase.from('moderation_queue').insert({
            content_type: contentType,
            content_id: contentId ?? null,
            snippet: text.slice(0, 500),
            reporter_user_id: reporterUserId ?? null,
            status: 'pending',
          });
        } catch (e) {
          console.warn('[contentModeration] Queue insert failed:', (e as Error).message);
        }
      })();
    }

    return matches;
  } catch (err) {
    console.warn('[contentModeration] Unexpected error:', err);
    return [];
  }
}
