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
const CorporateTemplate = lazy(() => import('@/components/templates/CorporateTemplate').then(m => ({ default: m.CorporateTemplate })));
const BankingTemplate = lazy(() => import('@/components/templates/BankingTemplate').then(m => ({ default: m.BankingTemplate })));
const ConsultingTemplate = lazy(() => import('@/components/templates/ConsultingTemplate').then(m => ({ default: m.ConsultingTemplate })));
const FederalTemplate = lazy(() => import('@/components/templates/FederalTemplate').then(m => ({ default: m.FederalTemplate })));
const LegalTemplate = lazy(() => import('@/components/templates/LegalTemplate').then(m => ({ default: m.LegalTemplate })));
const MarketingTemplate = lazy(() => import('@/components/templates/MarketingTemplate').then(m => ({ default: m.MarketingTemplate })));
const DesignerTemplate = lazy(() => import('@/components/templates/DesignerTemplate').then(m => ({ default: m.DesignerTemplate })));
const PortfolioTemplate = lazy(() => import('@/components/templates/PortfolioTemplate').then(m => ({ default: m.PortfolioTemplate })));
const StartupTemplate = lazy(() => import('@/components/templates/StartupTemplate').then(m => ({ default: m.StartupTemplate })));
const InfographicTemplate = lazy(() => import('@/components/templates/InfographicTemplate').then(m => ({ default: m.InfographicTemplate })));
const DataScienceTemplate = lazy(() => import('@/components/templates/DataScienceTemplate').then(m => ({ default: m.DataScienceTemplate })));
const DevOpsTemplate = lazy(() => import('@/components/templates/DevOpsTemplate').then(m => ({ default: m.DevOpsTemplate })));
const CyberTemplate = lazy(() => import('@/components/templates/CyberTemplate').then(m => ({ default: m.CyberTemplate })));
const ProductTemplate = lazy(() => import('@/components/templates/ProductTemplate').then(m => ({ default: m.ProductTemplate })));
const CleanTemplate = lazy(() => import('@/components/templates/CleanTemplate').then(m => ({ default: m.CleanTemplate })));
const SwissTemplate = lazy(() => import('@/components/templates/SwissTemplate').then(m => ({ default: m.SwissTemplate })));
const MonoTemplate = lazy(() => import('@/components/templates/MonoTemplate').then(m => ({ default: m.MonoTemplate })));
const ZenTemplate = lazy(() => import('@/components/templates/ZenTemplate').then(m => ({ default: m.ZenTemplate })));

interface TemplateThumbnailProps {
  templateId: TemplateId;
  resume: ResumeData;
}

const templateComponents: Record<TemplateId, React.LazyExoticComponent<React.ComponentType<{ resume: ResumeData }>>> = {
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
  corporate: CorporateTemplate,
  banking: BankingTemplate,
  consulting: ConsultingTemplate,
  federal: FederalTemplate,
  legal: LegalTemplate,
  marketing: MarketingTemplate,
  designer: DesignerTemplate,
  portfolio: PortfolioTemplate,
  startup: StartupTemplate,
  infographic: InfographicTemplate,
  'data-science': DataScienceTemplate,
  devops: DevOpsTemplate,
  cyber: CyberTemplate,
  product: ProductTemplate,
  clean: CleanTemplate,
  swiss: SwissTemplate,
  mono: MonoTemplate,
  zen: ZenTemplate,
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
