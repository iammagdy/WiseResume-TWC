import { useMemo, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { computeSkillFrequencies, getSkillTier } from '@/lib/skillCloud';
import type { Experience, Project } from '@/types/resume';

export const SKILL_CLOUD_LIMIT = 28;

interface SkillCloudProps {
  skills: string[];
  experience: Experience[];
  projects: Project[];
  pStyle: string;
  showMore: boolean;
  onToggleMore: () => void;
  hasMore: boolean;
  moreCount: number;
}

export function SkillCloud({ skills, experience, projects, showMore, onToggleMore, hasMore, moreCount }: SkillCloudProps) {
  const scores = useMemo(
    () => computeSkillFrequencies(skills, experience, projects),
    [skills, experience, projects]
  );

  const sorted = useMemo(
    () => [...skills].sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0)),
    [skills, scores]
  );

  const visible = showMore ? sorted : sorted.slice(0, SKILL_CLOUD_LIMIT);
  const containerRef = useRef<HTMLDivElement>(null);
  const observerFired = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || observerFired.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observerFired.current = true;
        const tags = el.querySelectorAll('.pf-skill-tag');
        const delay = window.innerWidth < 768 ? 25 : 40;
        tags.forEach((tag, i) => {
          (tag as HTMLElement).style.animationDelay = `${i * delay}ms`;
          tag.classList.add('pf-skill-revealed');
        });
        observer.disconnect();
      },
      { threshold: 0.2, rootMargin: '0px 0px -50px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!showMore || !containerRef.current) return;
    requestAnimationFrame(() => {
      const el = containerRef.current;
      if (!el) return;
      const unrevealed = el.querySelectorAll('.pf-skill-tag:not(.pf-skill-revealed)');
      if (unrevealed.length === 0) return;
      const alreadyCount = el.querySelectorAll('.pf-skill-tag.pf-skill-revealed').length;
      const delay = window.innerWidth < 768 ? 25 : 40;
      unrevealed.forEach((tag, i) => {
        (tag as HTMLElement).style.animationDelay = `${(alreadyCount + i) * delay}ms`;
        tag.classList.add('pf-skill-revealed');
      });
    });
  }, [showMore]);

  return (
    <>
      <div ref={containerRef} className="flex flex-wrap gap-2 items-baseline">
        {visible.map((skill) => {
          const tier = getSkillTier(scores[skill] ?? 0);
          return (
            <span
              key={skill}
              title={skill}
              className="pf-skill-tag"
              style={{
                fontSize: tier.fontSize,
                fontWeight: tier.fontWeight,
                padding: `${tier.py} ${tier.px}`,
                borderRadius: '9999px',
                background: 'color-mix(in srgb, var(--pf-accent) 12%, transparent)',
                color: 'var(--pf-accent)',
                border: '1px solid color-mix(in srgb, var(--pf-accent) 22%, transparent)',
                display: 'inline-flex',
                alignItems: 'center',
                transition: 'all 0.2s',
                lineHeight: 1.2,
                cursor: 'default',
              }}
            >
              {skill}
            </span>
          );
        })}
      </div>
      {hasMore && (
        <button
          onClick={onToggleMore}
          className="mt-3 text-xs font-medium flex items-center gap-1 transition-opacity hover:opacity-80"
          style={{ color: 'var(--pf-accent)' }}
        >
          {showMore
            ? <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
            : <><ChevronDown className="w-3.5 h-3.5" /> +{moreCount} more</>}
        </button>
      )}
    </>
  );
}
