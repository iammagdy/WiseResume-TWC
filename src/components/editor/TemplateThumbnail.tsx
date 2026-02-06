import { useRef, useEffect, useState } from 'react';
import { ResumeData, TemplateId } from '@/types/resume';
import { ModernTemplate } from '@/components/templates/ModernTemplate';
import { ClassicTemplate } from '@/components/templates/ClassicTemplate';
import { MinimalTemplate } from '@/components/templates/MinimalTemplate';
import { ProfessionalTemplate } from '@/components/templates/ProfessionalTemplate';
import { DeveloperTemplate } from '@/components/templates/DeveloperTemplate';
import { CreativeTemplate } from '@/components/templates/CreativeTemplate';
import { ExecutiveTemplate } from '@/components/templates/ExecutiveTemplate';
import { CompactTemplate } from '@/components/templates/CompactTemplate';
import { AcademicTemplate } from '@/components/templates/AcademicTemplate';
import { HealthcareTemplate } from '@/components/templates/HealthcareTemplate';
import { SalesTemplate } from '@/components/templates/SalesTemplate';
import { ElegantTemplate } from '@/components/templates/ElegantTemplate';

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

export function TemplateThumbnail({ templateId, resume }: TemplateThumbnailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.15);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        // Scale to fit the container (612px is the full-size template width)
        // Apply a minimum scale to keep text somewhat readable
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
      ref={containerRef}
      className="aspect-[8.5/11] rounded-lg overflow-hidden relative bg-white"
    >
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
    </div>
  );
}
