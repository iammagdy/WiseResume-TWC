import { useRef, useState, useEffect, Suspense } from 'react';
import { templateComponents } from '@/components/editor/TemplateThumbnail';
import { sampleResumeData } from '@/lib/templateData';
import { ResumeData } from '@/types/resume';

interface MiniTemplateThumbnailProps {
  templateId: string;
  className?: string;
}

export function MiniTemplateThumbnail({ templateId, className }: MiniTemplateThumbnailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.165);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!('IntersectionObserver' in window)) { setIsVisible(true); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); }
    }, { threshold: 0 });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setScale(containerRef.current.offsetWidth / 612);
      }
    };
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const resolvedId = templateId in templateComponents ? templateId : 'modern';
  const TemplateComponent = templateComponents[resolvedId as keyof typeof templateComponents];
  if (!TemplateComponent) return null;

  return (
    <div
      ref={containerRef}
      className={`w-full h-full overflow-hidden bg-background rounded-xl ${className ?? ''}`}
    >
      {!isVisible ? (
        <div className="w-full h-full bg-muted animate-pulse rounded-xl" />
      ) : (
      <Suspense fallback={<div className="w-full h-full bg-muted animate-pulse rounded-xl" />}>
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            width: '612px',
            height: '792px',
            pointerEvents: 'none',
          }}
        >
          <TemplateComponent resume={sampleResumeData as ResumeData} />
        </div>
      </Suspense>
      )}
    </div>
  );
}
