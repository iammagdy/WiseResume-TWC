import { Check } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { TemplateThumbnail } from '@/components/editor/TemplateThumbnail';
import { TemplateId, ResumeData } from '@/types/resume';
import { TEMPLATE_CONFIGS } from '@/lib/templateConfig';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';

interface DefaultTemplateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTemplate: TemplateId;
  onSelect: (template: TemplateId) => void;
}

// Sample resume data for thumbnails
const sampleResume: ResumeData = {
  contactInfo: {
    fullName: 'Wise Megz',
    email: 'megz@wiseuniverse.ai',
    phone: '(555) 123-4567',
    location: 'Wise Universe HQ',
  },
  summary: 'Interstellar AI Navigator with 5+ years commanding autonomous spacecraft and quantum propulsion systems across multiple galaxies.',
  experience: [
    {
      id: '1',
      company: 'Wise Universe',
      position: 'Senior AI Navigator',
      startDate: '2020-01',
      endDate: '',
      current: true,
      description: 'Leading interstellar AI navigation and mission control',
      achievements: [
        'Reduced warp travel time by 73% through quantum optimization',
        'Commanded fleet of 12 autonomous spacecraft',
      ],
    },
  ],
  education: [
    {
      id: '1',
      institution: 'Cosmic Academy',
      degree: 'Master of Science',
      field: 'Astro-AI Engineering',
      startDate: '2014-09',
      endDate: '2018-05',
    },
  ],
  skills: ['Quantum Navigation', 'Neural Starship UI', 'Warp Systems', 'AI Fleet Command', 'Zero-G Ops', 'Cosmic Analytics'],
  certifications: [],
  templateId: 'modern',
};

export function DefaultTemplateSheet({
  open,
  onOpenChange,
  selectedTemplate,
  onSelect,
}: DefaultTemplateSheetProps) {
  const handleSelect = (templateId: TemplateId) => {
    haptics.light();
    onSelect(templateId);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4 shrink-0">
          <SheetTitle>Default Template</SheetTitle>
          <p className="text-sm text-muted-foreground">
            New resumes will use this template
          </p>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto pb-6">
          <div className="grid grid-cols-2 gap-3">
            {Object.values(TEMPLATE_CONFIGS).map((template) => (
              <button
                key={template.id}
                onClick={() => handleSelect(template.id)}
                className={cn(
                  'relative rounded-xl overflow-hidden border-2 transition-all',
                  'active:scale-[0.98] touch-manipulation',
                  selectedTemplate === template.id
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <TemplateThumbnail
                  templateId={template.id}
                  resume={{ ...sampleResume, templateId: template.id }}
                />
                
                {/* Overlay with name */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">
                      {template.name}
                    </span>
                    {selectedTemplate === template.id && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
