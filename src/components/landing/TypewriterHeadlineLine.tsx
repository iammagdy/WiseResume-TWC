import { TYPEWRITER_WORDS } from '@/hooks/useTypewriter';

const LONGEST_TYPEWRITER_WORD = TYPEWRITER_WORDS.reduce(
  (longest, current) => (longest.length >= current.length ? longest : current),
  '',
);

interface TypewriterHeadlineLineProps {
  showCursor?: boolean;
  word: string;
}

export function TypewriterHeadlineLine({
  showCursor = false,
  word,
}: TypewriterHeadlineLineProps) {
  return (
    <span className="lp-typewriter-line relative block w-full sm:inline-block sm:w-auto">
      <span
        aria-hidden="true"
        className="invisible hidden whitespace-nowrap sm:block"
      >
        {LONGEST_TYPEWRITER_WORD}
      </span>
      <span
        className="block break-words text-center whitespace-normal sm:absolute sm:inset-0 sm:whitespace-nowrap"
        style={{ color: 'var(--lp-eyebrow)' }}
      >
        {word || '\u00A0'}
        {showCursor ? <span className="lp-cursor" aria-hidden="true" /> : null}
      </span>
    </span>
  );
}
