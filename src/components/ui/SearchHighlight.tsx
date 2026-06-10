import { Fragment, useMemo } from 'react';
import { cn } from '@/lib/utils';

type SearchHighlightProps = {
  text: string;
  query: string;
  className?: string;
  highlightClassName?: string;
};

/** Splits text into segments and highlights every case-insensitive query match. */
export function splitByQuery(text: string, query: string): Array<{ text: string; match: boolean }> {
  const q = query.trim();
  if (!q || !text) return [{ text, match: false }];

  const lowerText = text.toLowerCase();
  const lowerQuery = q.toLowerCase();
  const segments: Array<{ text: string; match: boolean }> = [];
  let cursor = 0;

  while (cursor < text.length) {
    const idx = lowerText.indexOf(lowerQuery, cursor);
    if (idx === -1) {
      segments.push({ text: text.slice(cursor), match: false });
      break;
    }
    if (idx > cursor) {
      segments.push({ text: text.slice(cursor, idx), match: false });
    }
    segments.push({ text: text.slice(idx, idx + q.length), match: true });
    cursor = idx + q.length;
  }

  return segments.length > 0 ? segments : [{ text, match: false }];
}

export function SearchHighlight({
  text,
  query,
  className,
  highlightClassName,
}: SearchHighlightProps) {
  const segments = useMemo(() => splitByQuery(text, query), [text, query]);

  return (
    <span className={className}>
      {segments.map((segment, index) =>
        segment.match ? (
          <mark
            key={`${index}-${segment.text}`}
            className={cn(
              'rounded-sm bg-primary/20 text-foreground font-medium px-0.5',
              highlightClassName,
            )}
          >
            {segment.text}
          </mark>
        ) : (
          <Fragment key={`${index}-${segment.text}`}>{segment.text}</Fragment>
        ),
      )}
    </span>
  );
}
