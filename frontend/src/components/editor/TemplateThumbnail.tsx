import { useRef, useEffect, useState, memo, lazy, Suspense } from 'react';
import { ResumeData, TemplateId } from '@/types/resume';
import { useInView } from '@/hooks/useInView';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load all template components
const ModernTemplate = lazy(() => import('@/components/templates/ModernTemplate').then(m => ({ default: m.ModernTemplate })));
const ClassicTemplate = lazy(() => import('@/components/templates/ClassicTemplate').then(m => ({ default: m.ClassicTemplate })));
const MinimalTemplate = lazy(() => import('@/components/templates/MinimalTemplate').then(m => ({ default: m.MinimalTemplate })));
const ProfessionalTemplate = lazy(() => import('@/components/templates/ProfessionalTemplate').then(m => ({ default: m.ProfessionalTemplate })));
const DeveloperTemplate = lazy(() => import('@/components/templates/DeveloperTemplate').then(m => ({ default: m.DeveloperTemplate })));
const CreativeTemplate = lazy(() => import('@/components/templates/CreativeTemplate').then(m => ({ default: m.CreativeTemplate })));
const ExecutiveTemplate = lazy(() => import('@/components/templates/ExecutiveTemplate').then(m => ({ default: m.ExecutiveTemplate })));
const CompactTemplate = lazy(() => import('@/components/templates/CompactTemplate').then(m => ({ default: m.CompactTemplate })));
const AcademicTemplate = lazy(() => import('@/components/templates/AcademicTemplate').then(m => ({ default: m.AcademicTemplate })));
const HealthcareTemplate = lazy(() => import('@/components/templates/HealthcareTemplate').then(m => ({ default: m.HealthcareTemplate })));
const SalesTemplate = lazy(() => import('@/components/templates/SalesTemplate').then(m => ({ default: m.SalesTemplate })));
const ElegantTemplate = lazy(() => import('@/components/templates/ElegantTemplate').then(m => ({ default: m.ElegantTemplate })));

interface TemplateThumbnailProps {
  templateId: TemplateId;
  resume: ResumeData;
}

const templateComponents = {
  modern: ModernTemplate,
  classic: ClassicTemplate,
  minimal: MinimalTemplate,
  professional: ProfessionalTemplate,
  developer: DeveloperTemplate,
  creative: CreativeTemplate,
  executive: ExecutiveTemplate,
  compact: CompactTemplate,
  academic: AcademicTemplate,
  healthcare: HealthcareTemplate,
  sales: SalesTemplate,
  elegant: ElegantTemplate,
};

function ThumbnailSkeleton() {
  return (
    <div className="aspect-[8.5/11] rounded-lg overflow-hidden relative bg-white p-4">
      <Skeleton className="h-4 w-1/2 mb-2" />
      <Skeleton className="h-3 w-3/4 mb-4" />
      <Skeleton className="h-2 w-full mb-1" />
      <Skeleton className="h-2 w-full mb-1" />
      <Skeleton className="h-2 w-2/3" />
    </div>
  );
}

export const TemplateThumbnail = memo(function TemplateThumbnail({ templateId, resume }: TemplateThumbnailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.15);
  
  // Only render the full template when visible
  const { ref: inViewRef, inView } = useInView({ rootMargin: '100px', triggerOnce: true });

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const calculatedScale = containerWidth / 612;
        setScale(Math.max(calculatedScale, 0.35));
      }
    };

    updateScale();

    const resizeObserver = new ResizeObserver(updateScale);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  const TemplateComponent = templateComponents[templateId];

  return (
    <div 
      ref={(node) => {
        // Combine refs
        containerRef.current = node;
        if (typeof inViewRef === 'function') {
          inViewRef(node);
        }
      }}
      className="aspect-[8.5/11] rounded-lg overflow-hidden relative bg-white"
    >
      {inView ? (
        <Suspense fallback={<ThumbnailSkeleton />}>
          <div 
            className="origin-top-left"
            style={{
              transform: `scale(${scale})`,
              width: '612px',
              height: '792px',
            }}
          >
            <TemplateComponent resume={resume} />
          </div>
        </Suspense>
      ) : (
        <ThumbnailSkeleton />
      )}
    </div>
  );
});
