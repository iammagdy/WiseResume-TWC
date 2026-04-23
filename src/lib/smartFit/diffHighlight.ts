import { diffText, type TextDiff } from '@/lib/diffUtils';
import type { ProtectedToken } from './types';

export type HighlightSegment =
  | { kind: 'unchanged'; text: string }
  | { kind: 'added'; text: string }
  | { kind: 'removed'; text: string }
  | { kind: 'protected'; text: string; tokenKind: ProtectedToken['kind'] };

/** Word-level diff with every protected-token occurrence wrapped as its
 *  own `protected` segment so the UI can highlight it. Tokens are matched
 *  longest-first to keep e.g. "Q4 2024" intact rather than splitting into
 *  "Q4" + "2024". */
export function buildDiffHighlight(
  before: string,
  after: string,
  protectedTokens: ProtectedToken[],
): { before: HighlightSegment[]; after: HighlightSegment[] } {
  const diffs: TextDiff[] = diffText(before, after);
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
  const sorted = [...protectedTokens].sort((a, b) => b.text.length - a.text.length);
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
