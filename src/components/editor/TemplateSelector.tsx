import { motion } from 'framer-motion';
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
                        {template.atsScore === 'medium' && (
                          <AlertTriangle className="w-3 h-3 mr-1" />
                        )}
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
