import { motion } from 'framer-motion';
import { Check, FileText, AlertTriangle, Sparkles } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { useResumeStore } from '@/store/resumeStore';
import { TemplateId, TemplateInfo } from '@/types/resume';
import { TemplateThumbnail } from './TemplateThumbnail';

interface TemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const templates: TemplateInfo[] = [
  {
    id: 'modern',
    name: 'Modern',
    description: 'Clean design with accent colors',
    atsScore: 'high',
    category: 'professional',
  },
  {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional professional layout',
    atsScore: 'high',
    category: 'professional',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Simple and elegant design',
    atsScore: 'high',
    category: 'professional',
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Corporate-friendly template',
    atsScore: 'high',
    category: 'professional',
  },
  {
    id: 'developer',
    name: 'Developer',
    description: 'Code-inspired tech resume',
    atsScore: 'high',
    category: 'tech',
  },
  {
    id: 'creative',
    name: 'Creative',
    description: 'Bold sidebar with accents',
    atsScore: 'medium',
    category: 'creative',
  },
  {
    id: 'executive',
    name: 'Executive',
    description: 'Elegant serif typography',
    atsScore: 'high',
    category: 'professional',
  },
];

const atsScoreColors = {
  high: 'bg-success/20 text-success border-success/30',
  medium: 'bg-warning/20 text-warning border-warning/30',
  low: 'bg-destructive/20 text-destructive border-destructive/30',
};

const atsScoreLabels = {
  high: 'ATS-Friendly',
  medium: 'Moderate ATS',
  low: 'Low ATS',
};

export function TemplateSelector({ open, onOpenChange }: TemplateSelectorProps) {
  const { selectedTemplate, setSelectedTemplate, updateResume, currentResume } = useResumeStore();

  const handleSelect = (id: TemplateId) => {
    setSelectedTemplate(id);
    updateResume({ templateId: id });
    onOpenChange(false);
  };

  // Use sample data if no resume loaded
  const previewResume = currentResume || {
    contactInfo: {
      fullName: 'John Doe',
      email: 'john@example.com',
      phone: '(555) 123-4567',
      location: 'San Francisco, CA',
    },
    summary: 'Experienced professional with a passion for excellence.',
    experience: [
      {
        id: '1',
        company: 'Tech Corp',
        position: 'Senior Developer',
        startDate: 'Jan 2020',
        endDate: 'Present',
        current: true,
        description: 'Leading development initiatives',
        achievements: ['Led team of 5 engineers', 'Increased efficiency by 40%'],
      },
    ],
    education: [
      {
        id: '1',
        institution: 'State University',
        degree: 'Bachelor of Science',
        field: 'Computer Science',
        startDate: '2012',
        endDate: '2016',
      },
    ],
    skills: ['JavaScript', 'React', 'Node.js', 'Python'],
    certifications: [],
    templateId: 'modern',
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Choose Template
          </SheetTitle>
        </SheetHeader>

        {/* ATS Info Banner */}
        <div className="mb-4 p-3 rounded-xl bg-muted/50 border border-border flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="text-xs">
            <p className="font-medium text-foreground mb-1">About ATS Compatibility</p>
            <p className="text-muted-foreground">
              ATS (Applicant Tracking Systems) scan resumes before recruiters see them. 
              Templates marked "ATS-Friendly" use simple layouts that parse correctly.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-[calc(80vh-180px)] pb-4">
          {templates.map((template, index) => (
            <motion.button
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => handleSelect(template.id)}
              className={`relative p-2 rounded-2xl border-2 transition-all text-left ${
                selectedTemplate === template.id
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              {/* Real template preview */}
              <div className="mb-2 relative">
                <TemplateThumbnail 
                  templateId={template.id} 
                  resume={previewResume} 
                />
                
                {/* ATS Badge */}
                <Badge
                  variant="outline"
                  className={`absolute top-1 left-1 text-[10px] px-1.5 py-0 ${atsScoreColors[template.atsScore]}`}
                >
                  {template.atsScore === 'medium' && (
                    <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
                  )}
                  {atsScoreLabels[template.atsScore]}
                </Badge>

                {/* Selected indicator */}
                {selectedTemplate === template.id && (
                  <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
              </div>

              <h3 className="font-semibold text-sm">{template.name}</h3>
              <p className="text-xs text-muted-foreground line-clamp-1">{template.description}</p>
            </motion.button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
