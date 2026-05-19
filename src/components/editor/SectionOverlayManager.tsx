import { useCallback, useEffect, useLayoutEffect, useState, RefObject } from 'react';
import { Sliders, Sparkles } from 'lucide-react';
import { useResumeStore } from '@/store/resumeStore';
import { useIsMobile } from '@/hooks/use-mobile';
import { SectionStylePopover } from './SectionStylePopover';
import { SectionAIPopover } from './SectionAIPopover';

interface SectionRect {
  name: string;
  top: number;
  height: number;
}

interface SectionOverlayManagerProps {
  resumeRef: RefObject<HTMLDivElement | null>;
  isBreakEditMode: boolean;
}

export function SectionOverlayManager({ resumeRef, isBreakEditMode }: SectionOverlayManagerProps) {
  const currentResume = useResumeStore(s => s.currentResume);
  const isMobile = useIsMobile();
  const [rects, setRects] = useState<SectionRect[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const [stylePopoverFor, setStylePopoverFor] = useState<string | null>(null);
  const [aiPopoverFor, setAiPopoverFor] = useState<string | null>(null);

  const recompute = useCallback(() => {
    const root = resumeRef.current;
    if (!root) {
      setRects([]);
      return;
    }
    const els = root.querySelectorAll<HTMLElement>('[data-section]');
    const next: SectionRect[] = [];
    const seen = new Set<string>();
    els.forEach(el => {
      const name = el.getAttribute('data-section');
      if (!name || seen.has(name)) return;
      seen.add(name);
      next.push({
        name,
        top: el.offsetTop,
        height: el.offsetHeight,
      });
    });
    setRects(next);
  }, [resumeRef]);

  useLayoutEffect(() => {
    recompute();
  }, [recompute, currentResume]);

  useEffect(() => {
    const root = resumeRef.current;
    if (!root) return;
    const obs = new ResizeObserver(() => recompute());
    obs.observe(root);
    const sectionEls = root.querySelectorAll<HTMLElement>('[data-section]');
    sectionEls.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [resumeRef, recompute, currentResume]);

  if (isMobile) return null;
  if (isBreakEditMode) return null;
  if (rects.length === 0) return null;

  return (
    <div
      data-html2canvas-ignore="true"
      data-pdf-exclude
      className="absolute inset-0 z-30 pointer-events-none"
    >
      {rects.map(rect => {
        const isHovered = hovered === rect.name;
        const showControls = isHovered || stylePopoverFor === rect.name || aiPopoverFor === rect.name;

        return (
          <div
            key={rect.name}
            data-section-overlay={rect.name}
            className="absolute left-0 right-0 pointer-events-none"
            style={{
              top: `${rect.top}px`,
              height: `${rect.height}px`,
            }}
          >
            {/* Thin hover band — does not block links in the section body */}
            <div
              className="absolute inset-x-0 top-0 h-4 pointer-events-auto"
              onMouseEnter={() => setHovered(rect.name)}
              onMouseLeave={() => setHovered(prev => (prev === rect.name ? null : prev))}
            />
            {showControls && (
              <div
                className="absolute flex items-center gap-1 pointer-events-auto"
                style={{ top: 4, right: 4 }}
                onMouseEnter={() => setHovered(rect.name)}
                onMouseLeave={() => setHovered(prev => (prev === rect.name ? null : prev))}
              >
                <SectionStylePopover
                  open={stylePopoverFor === rect.name}
                  onOpenChange={(o) => setStylePopoverFor(o ? rect.name : null)}
                  sectionName={rect.name}
                  trigger={
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setStylePopoverFor(rect.name);
                      }}
                      className="h-6 w-6 rounded-md bg-white shadow ring-1 ring-black/10 flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-colors"
                      title={`Style ${rect.name}`}
                      aria-label={`Style ${rect.name}`}
                    >
                      <Sliders className="w-3.5 h-3.5" />
                    </button>
                  }
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAiPopoverFor(rect.name);
                  }}
                  className="h-6 w-6 rounded-md bg-white shadow ring-1 ring-black/10 flex items-center justify-center text-violet-600 hover:bg-violet-50 transition-colors"
                  title={`Edit ${rect.name} with AI`}
                  aria-label={`Edit ${rect.name} with AI`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        );
      })}

      {aiPopoverFor && (
        <SectionAIPopover
          open={!!aiPopoverFor}
          onOpenChange={(o) => setAiPopoverFor(o ? aiPopoverFor : null)}
          sectionName={aiPopoverFor}
        />
      )}
    </div>
  );
}
