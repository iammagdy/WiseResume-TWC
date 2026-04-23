import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';
import { Check, FileText, AlertTriangle, Sparkles, Star, Info } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useResumeStore } from '@/store/resumeStore';
import { TemplateId } from '@/types/resume';
import { TemplateThumbnail } from './TemplateThumbnail';
import { templates, atsScoreDescriptions, atsScoreColors, atsScoreLabels, sampleResumeData } from '@/lib/templateData';
import { TemplateInfo } from '@/types/resume';
import { useAuth } from '@/hooks/useAuth';
import { useProfile, CareerLevel } from '@/hooks/useProfile';

interface TemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplateApplied?: () => void;
}

const CAREER_LEVEL_RECOMMENDATIONS: Record<CareerLevel, TemplateId[]> = {
  entry: ['compact', 'modern', 'minimal'],
  mid: ['modern', 'professional', 'sales', 'healthcare'],
  senior: ['executive', 'professional', 'elegant'],
  executive: ['executive', 'elegant', 'academic'],
};


export function TemplateSelector({ open, onOpenChange, onTemplateApplied }: TemplateSelectorProps) {
  const { selectedTemplate, setSelectedTemplate, updateResume, currentResume } = useResumeStore(useShallow((s) => ({
    selectedTemplate: s.selectedTemplate,
    setSelectedTemplate: s.setSelectedTemplate,
    updateResume: s.updateResume,
    currentResume: s.currentResume,
  })));
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
    if (id === 'creative' || id === 'designer') {
      try {
        const storageKey = 'wr.photoTemplateAtsHintShown';
        const seen = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : '1';
        if (!seen) {
          toast.warning('Photos may hurt ATS scoring in some regions', {
            description: 'Workday, Greenhouse, and many US/UK employers penalize resumes with photos. Consider a photo-free template if you are applying to those markets.',
            duration: 8000,
          });
          window.localStorage.setItem(storageKey, '1');
        }
      } catch {
        // localStorage unavailable (private mode etc.) — silently skip
      }
    }
    onOpenChange(false);
    onTemplateApplied?.();
  };

  // Use sample data if no resume loaded
  const previewResume = currentResume || sampleResumeData;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh]">
        <SheetHeader className="pb-4 shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Choose Template
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto pb-4">
          {/* ATS Info Banner */}
          <div className="mb-4 p-4 rounded-xl bg-muted border border-border flex items-start gap-4">
            <Sparkles className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-foreground mb-1">About ATS Layout Score</p>
              <p className="text-muted-foreground">
                The ATS Layout badge shows how well a template's <strong>design</strong> can be
                parsed by Applicant Tracking Systems — not your resume's keyword match or content
                quality. Use Deep Analyze to optimize keywords for a specific job.
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

          {/* Photo / ATS hint for templates with photo headers */}
          {(selectedTemplate === 'creative' || selectedTemplate === 'designer') && (
            <div
              role="note"
              className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200"
            >
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                Photos may hurt ATS scoring in some regions (Workday, Greenhouse, US/UK roles).
                Consider a photo-free template if you're applying to those markets.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
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
                
                {/* ATS Badge with Tooltip */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className={`absolute top-1.5 left-1.5 text-xs px-2 py-0.5 cursor-help ${atsScoreColors[template.atsScore]}`}
                      >
                        {atsScoreLabels[template.atsScore]}
                        <Info className="w-3 h-3 ml-1 opacity-60" />
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[200px] text-center">
                      <p className="text-xs">{atsScoreDescriptions[template.atsScore]}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

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
        </div>
      </SheetContent>
    </Sheet>
  );
}
