import { diffText, type TextDiff } from '@/lib/diffUtils';
import type { ProtectedToken } from './types';

export type HighlightSegment =
  | { kind: 'unchanged'; text: string }
  | { kind: 'added'; text: string }
  | { kind: 'removed'; text: string }
  | { kind: 'protected'; text: string; tokenKind: ProtectedToken['kind'] };

/**
 * Produce a render-ready diff between `before` and `after`, with every
 * occurrence of a protected token wrapped as its own `protected` segment
 * so the UI can highlight it green. This is the "verifiable diff" the
 * spec requires — the user can visually confirm that every protected
 * token is preserved verbatim in the rewrite.
 *
 * Algorithm:
 *  1. Run a word-level diff (LCS) to get added/removed/unchanged spans.
 *  2. For each unchanged or added span, walk it and split at every
 *     protected-token boundary (longest tokens first to avoid one token
 *     being eaten by another's prefix).
 */
export function buildDiffHighlight(
  before: string,
  after: string,
  protectedTokens: ProtectedToken[],
): { before: HighlightSegment[]; after: HighlightSegment[] } {
  const diffs: TextDiff[] = diffText(before, after);
  // diffText splits on /\s+/ and joins back without spaces, so we re-insert
  // a single space between adjacent same-kind words for display.
  const beforeSegs: HighlightSegment[] = [];
  const afterSegs: HighlightSegment[] = [];

  for (const d of diffs) {
    if (d.type === 'removed') {
      pushWithSpace(beforeSegs, { kind: 'removed', text: d.text });
    } else if (d.type === 'added') {
      pushWithSpace(afterSegs, splitProtected(d.text, protectedTokens, 'added'));
    } else {
      pushWithSpace(beforeSegs, splitProtected(d.text, protectedTokens, 'unchanged'));
      pushWithSpace(afterSegs, splitProtected(d.text, protectedTokens, 'unchanged'));
    }
  }

  return { before: beforeSegs, after: afterSegs };
}

function pushWithSpace(out: HighlightSegment[], seg: HighlightSegment | HighlightSegment[]) {
  const segs = Array.isArray(seg) ? seg : [seg];
  if (out.length > 0 && segs.length > 0) {
    const lastText = out[out.length - 1].text;
    if (lastText && !/\s$/.test(lastText) && !/^\s/.test(segs[0].text)) {
      out.push({ kind: 'unchanged', text: ' ' });
    }
  }
  for (const s of segs) out.push(s);
}

function splitProtected(
  text: string,
  protectedTokens: ProtectedToken[],
  fallbackKind: 'unchanged' | 'added',
): HighlightSegment[] {
  if (!text || protectedTokens.length === 0) {
    return [{ kind: fallbackKind, text }];
  }
  // Sort by length desc so longer tokens (e.g. "Q4 2024") win over their
  // shorter substrings ("2024").
  const sorted = [...protectedTokens].sort((a, b) => b.text.length - a.text.length);

  // Mark intervals [start, end, tokenKind] that match a protected token.
  type Interval = { start: number; end: number; kind: ProtectedToken['kind'] };
  const taken: Interval[] = [];
  const lower = text.toLowerCase();
  for (const t of sorted) {
    if (!t.text) continue;
    const needle = t.text.toLowerCase();
    let from = 0;
    while (from < lower.length) {
      const idx = lower.indexOf(needle, from);
      if (idx === -1) break;
      // Skip if this range overlaps an already-taken (longer) token.
      const overlaps = taken.some(iv => idx < iv.end && idx + needle.length > iv.start);
      if (!overlaps) {
        taken.push({ start: idx, end: idx + needle.length, kind: t.kind });
      }
      from = idx + needle.length;
    }
  }
  if (taken.length === 0) return [{ kind: fallbackKind, text }];
  taken.sort((a, b) => a.start - b.start);

  const out: HighlightSegment[] = [];
  let cursor = 0;
  for (const iv of taken) {
    if (iv.start > cursor) {
      out.push({ kind: fallbackKind, text: text.slice(cursor, iv.start) });
    }
    out.push({ kind: 'protected', text: text.slice(iv.start, iv.end), tokenKind: iv.kind });
    cursor = iv.end;
  }
  if (cursor < text.length) {
    out.push({ kind: fallbackKind, text: text.slice(cursor) });
  }
  return out;
}
