import { useRef, useEffect, useState } from 'react';
import { ResumeData, TemplateId } from '@/types/resume';
import { ModernTemplate } from '@/components/templates/ModernTemplate';
import { ClassicTemplate } from '@/components/templates/ClassicTemplate';
import { MinimalTemplate } from '@/components/templates/MinimalTemplate';
import { ProfessionalTemplate } from '@/components/templates/ProfessionalTemplate';
import { DeveloperTemplate } from '@/components/templates/DeveloperTemplate';
import { CreativeTemplate } from '@/components/templates/CreativeTemplate';
import { ExecutiveTemplate } from '@/components/templates/ExecutiveTemplate';

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
};

export function TemplateThumbnail({ templateId, resume }: TemplateThumbnailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.15);

  useEffect(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      // Scale to fit the container (612px is the full-size template width)
      setScale(containerWidth / 612);
    }
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
