import { Suspense, useRef, useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { templateComponentMap } from '@/lib/templateComponentMap';
import { migrateTemplateId } from '@/lib/templateMigration';
import type { ResumeData } from '@/types/resume';

interface ExportPreviewThumbnailProps {
  resumeData: ResumeData;
  selectedTemplate: string;
}

const PDF_WIDTH = 612;

export function ExportPreviewThumbnail({ resumeData, selectedTemplate }: ExportPreviewThumbnailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setScale(el.clientWidth / PDF_WIDTH);
  }, []);

  const safeTemplateId = templateComponentMap[selectedTemplate]
    ? selectedTemplate
    : migrateTemplateId(selectedTemplate);
  const TemplateComponent = templateComponentMap[safeTemplateId] ?? templateComponentMap['modern'];

  const thumbnailHeight = scale > 0 ? Math.round(792 * scale) : 220;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Preview
      </span>
      <div
        ref={containerRef}
        className="rounded-xl border border-border overflow-hidden bg-white"
        style={{ height: thumbnailHeight }}
      >
        {scale > 0 && (
          <Suspense fallback={<Skeleton className="h-full w-full" />}>
            <div
              style={{
                width: PDF_WIDTH,
                transformOrigin: 'top left',
                transform: `scale(${scale})`,
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            >
              <TemplateComponent resume={resumeData} />
            </div>
          </Suspense>
        )}
      </div>
    </div>
  );
}
