import { useState, useEffect, useRef } from 'react';
import type { PublicProfile } from '@/hooks/usePublicPortfolio';

export function buildTypewriterPhrases(profile: PublicProfile, skills: string[]): string[] {
  const phrases: string[] = [];
  if (profile.availabilityHeadline) phrases.push(profile.availabilityHeadline);
  if (profile.jobTitle && skills[0]) phrases.push(`${profile.jobTitle} specializing in ${skills[0]}`);
  if (skills.length >= 3) phrases.push(`Expert in ${skills[0]}, ${skills[1]} & ${skills[2]}`);
  if (profile.location && profile.jobTitle) phrases.push(`${profile.jobTitle} based in ${profile.location}`);
  if (profile.openToWork) phrases.push('Open to exciting new opportunities');
  return [...new Set(phrases.filter(Boolean))].slice(0, 5);
}

export function TypewriterText({ phrases, accentColor }: { phrases: string[]; accentColor: string }) {
  const [displayed, setDisplayed] = useState('');
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [phase, setPhase] = useState<'typing' | 'paused' | 'deleting' | 'waiting'>('typing');
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    if (phrases.length === 0) return;
    if (reducedMotion.current) {
      setDisplayed(phrases[0]);
      return;
    }

    const current = phrases[phraseIdx % phrases.length];

    if (phase === 'typing') {
      if (displayed.length < current.length) {
        const t = setTimeout(() => setDisplayed(current.slice(0, displayed.length + 1)), 55);
        return () => clearTimeout(t);
      }
      setPhase('paused');
    } else if (phase === 'paused') {
      const t = setTimeout(() => setPhase('deleting'), 2000);
      return () => clearTimeout(t);
    } else if (phase === 'deleting') {
      if (displayed.length > 0) {
        const t = setTimeout(() => setDisplayed(d => d.slice(0, -1)), 30);
        return () => clearTimeout(t);
      }
      setPhase('waiting');
    } else if (phase === 'waiting') {
      const t = setTimeout(() => {
        setPhraseIdx(i => i + 1);
        setPhase('typing');
      }, 400);
      return () => clearTimeout(t);
    }
  }, [phrases, phraseIdx, phase, displayed]);

  if (phrases.length === 0) return null;

  const isMoving = phase === 'typing' || phase === 'deleting';

  return (
    <p className="text-sm italic mb-5 max-w-md leading-relaxed min-h-[1.5rem]" style={{ color: 'var(--pf-muted, #9ca3af)' }}>
      "{displayed}
      <span
        className={`pf-cursor ${isMoving ? 'pf-cursor--typing' : ''}`}
        style={{ color: accentColor }}
      >|</span>
      "
    </p>
  );
}
