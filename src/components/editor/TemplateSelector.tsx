import { motion } from 'framer-motion';
import { Check, FileText, AlertTriangle, Sparkles, Star } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { useResumeStore } from '@/store/resumeStore';
import { TemplateId, TemplateInfo } from '@/types/resume';
import { TemplateThumbnail } from './TemplateThumbnail';
import { useAuth } from '@/hooks/useAuth';
import { useProfile, CareerLevel } from '@/hooks/useProfile';

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

const CAREER_LEVEL_RECOMMENDATIONS: Record<CareerLevel, TemplateId[]> = {
  entry: ['modern', 'minimal', 'classic'],
  mid: ['modern', 'professional', 'developer'],
  senior: ['executive', 'professional', 'classic'],
  executive: ['executive', 'professional'],
};

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
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);

  // Get recommended template IDs based on career level
  const recommendedIds = profile?.careerLevel 
    ? CAREER_LEVEL_RECOMMENDATIONS[profile.careerLevel] 
    : [];

  // Sort templates: recommended first, then others
  const sortedTemplates = [...templates].sort((a, b) => {
    const aRec = recommendedIds.includes(a.id);
    const bRec = recommendedIds.includes(b.id);
    if (aRec && !bRec) return -1;
    if (!aRec && bRec) return 1;
    return 0;
  });

  const handleSelect = (id: TemplateId) => {
    setSelectedTemplate(id);
    updateResume({ templateId: id });
    onOpenChange(false);
  };

  // Use sample data if no resume loaded
  const previewResume = currentResume || {
    contactInfo: {
      fullName: 'Wise Megz',
      email: 'megz@wiseuniverse.ai',
      phone: '(555) 123-4567',
      location: 'Wise Universe HQ',
    },
    summary: 'Interstellar AI Navigator specializing in quantum propulsion and autonomous spacecraft operations across multiple galaxies.',
    experience: [
      {
        id: '1',
        company: 'Wise Universe',
        position: 'Senior AI Navigator',
        startDate: 'Jan 2020',
        endDate: 'Present',
        current: true,
        description: 'Leading interstellar AI navigation and mission control',
        achievements: ['Reduced warp travel time by 73%', 'Commanded fleet of 12 spacecraft'],
      },
    ],
    education: [
      {
        id: '1',
        institution: 'Cosmic Academy',
        degree: 'Master of Science',
        field: 'Astro-AI Engineering',
        startDate: '2014',
        endDate: '2018',
      },
    ],
    skills: ['Quantum Navigation', 'Neural Starship UI', 'Warp Systems', 'AI Fleet Command', 'Zero-G Ops', 'Cosmic Analytics'],
    certifications: [],
    templateId: 'modern',
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh]">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Choose Template
          </SheetTitle>
        </SheetHeader>

        {/* ATS Info Banner */}
        <div className="mb-4 p-4 rounded-xl bg-muted/50 border border-border flex items-start gap-4">
          <Sparkles className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-foreground mb-1">About ATS Compatibility</p>
            <p className="text-muted-foreground">
              ATS (Applicant Tracking Systems) scan resumes before recruiters see them. 
              Templates marked "ATS-Friendly" use simple layouts that parse correctly.
            </p>
          </div>
        </div>

        {/* Recommendation hint when career level is set */}
        {recommendedIds.length > 0 && (
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Star className="w-4 h-4 text-primary" />
            <span>Templates recommended for your experience level are shown first</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 overflow-y-auto max-h-[calc(85vh-220px)] pb-4">
          {sortedTemplates.map((template, index) => {
            const isRecommended = recommendedIds.includes(template.id);
            return (
            <motion.button
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => handleSelect(template.id)}
              className={`relative p-3 rounded-2xl border-2 transition-all text-left touch-manipulation active:scale-[0.98] ${
                selectedTemplate === template.id
                  ? 'border-primary bg-primary/10'
                  : isRecommended
                    ? 'border-primary/30 bg-primary/5 hover:border-primary/50'
                    : 'border-border hover:border-primary/50'
              }`}
            >
              {/* Real template preview */}
              <div className="mb-3 relative">
                <TemplateThumbnail 
                  templateId={template.id} 
                  resume={previewResume} 
                />
                
                {/* ATS Badge */}
                <Badge
                  variant="outline"
                  className={`absolute top-1.5 left-1.5 text-xs px-2 py-0.5 ${atsScoreColors[template.atsScore]}`}
                >
                  {template.atsScore === 'medium' && (
                    <AlertTriangle className="w-3 h-3 mr-1" />
                  )}
                  {atsScoreLabels[template.atsScore]}
                </Badge>

                {/* Recommended Badge */}
                {isRecommended && selectedTemplate !== template.id && (
                  <Badge
                    className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground text-xs px-2 py-0.5"
                  >
                    <Star className="w-3 h-3 mr-1" />
                    Recommended
                  </Badge>
                )}

                {/* Selected indicator */}
                {selectedTemplate === template.id && (
                  <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </div>

              <h3 className="font-semibold text-base">{template.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-1">{template.description}</p>
            </motion.button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
