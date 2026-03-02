import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { BackButton } from '@/components/ui/BackButton';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { TemplateThumbnail } from '@/components/editor/TemplateThumbnail';
import { templates, sampleResumeData, atsScoreColors, atsScoreLabels } from '@/lib/templateData';
import { TemplateId, TemplateInfo, TemplateCustomization } from '@/types/resume';
import { useResumeStore } from '@/store/resumeStore';
import { motion } from 'framer-motion';
import { TemplateAdvisorSheet } from '@/components/editor/TemplateAdvisorSheet';

type FilterCategory = 'all' | 'professional' | 'creative' | 'tech' | 'minimalist';

const FILTER_CHIPS: { value: FilterCategory; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'professional', label: 'Professional' },
  { value: 'creative', label: 'Creative' },
  { value: 'tech', label: 'Tech' },
  { value: 'minimalist', label: 'Minimalist' },
];

export default function TemplatesPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterCategory>('all');
  const [previewTemplate, setPreviewTemplate] = useState<TemplateInfo | null>(null);
  const [showAdvisor, setShowAdvisor] = useState(false);
  const { setSelectedTemplate, updateResume } = useResumeStore();

  const filtered = filter === 'all' ? templates : templates.filter(t => t.category === filter);

  const handleUseTemplate = (id: TemplateId) => {
    const { currentResumeId } = useResumeStore.getState();
    setSelectedTemplate(id);
    if (currentResumeId) {
      updateResume({ templateId: id });
      navigate('/editor');
    } else {
      navigate('/dashboard?action=create');
      toast.info('Create a resume first, then apply this template from the editor.');
    }
  };

  const handleAdvisorApply = (templateId: TemplateId, customization: Partial<TemplateCustomization>) => {
    const { currentResumeId } = useResumeStore.getState();
    setSelectedTemplate(templateId);
    if (currentResumeId) {
      updateResume({ templateId, customization: customization as any });
      navigate('/editor');
    } else {
      navigate('/dashboard?action=create');
      toast.info('Create a resume first, then apply this template from the editor.');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 h-14 pt-safe border-b border-border glass-header backdrop-blur-md">
        <BackButton />
        <h1 className="text-lg font-bold text-foreground">Templates</h1>
      </div>

      {/* Filter Chips */}
      <div className="shrink-0 flex gap-2 px-4 py-3 overflow-x-auto">
        {FILTER_CHIPS.map(chip => (
          <button
            key={chip.value}
            onClick={() => setFilter(chip.value)}
            className={`px-4 py-2.5 min-h-[44px] rounded-full text-sm font-medium whitespace-nowrap transition-all touch-manipulation active:scale-95 ${
              filter === chip.value
                ? 'bg-primary text-primary-foreground'
                : 'glass-elevated text-muted-foreground hover:text-foreground'
            }`}
            aria-label={`Filter by ${chip.label}`}
          >
            {chip.label}
          </button>
        ))}
        <button
          onClick={() => setShowAdvisor(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-full text-sm font-medium whitespace-nowrap transition-all touch-manipulation active:scale-95 bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20"
          aria-label="AI Template Advisor"
        >
          <Sparkles className="w-4 h-4" />
          AI Suggest
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {filtered.map((tmpl, i) => (
            <motion.button
              key={tmpl.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.15) }}
              onClick={() => setPreviewTemplate(tmpl)}
              className="relative p-2.5 rounded-2xl border-2 border-border hover:border-primary/50 hover:scale-[1.02] hover:shadow-xl transition-all text-left touch-manipulation active:scale-[0.98]"
              aria-label={`Preview ${tmpl.name} template`}
            >
              <TemplateThumbnail templateId={tmpl.id} resume={sampleResumeData as any} />
              <div className="mt-2">
                <p className="font-semibold text-sm text-foreground">{tmpl.name}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{tmpl.description}</p>
              </div>
              <Badge
                variant="outline"
                className={`absolute top-1.5 left-1.5 text-[8px] px-1.5 py-0.5 ${atsScoreColors[tmpl.atsScore]}`}
              >
                {tmpl.atsScore === 'medium' && <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />}
                {atsScoreLabels[tmpl.atsScore]}
              </Badge>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Preview Sheet */}
      <Sheet open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <SheetContent side="bottom" className="h-[80vh]">
          {previewTemplate && (
            <>
              <SheetHeader className="pb-4">
                <SheetTitle>{previewTemplate.name} Template</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto space-y-4 pb-4">
                <div className="max-w-sm mx-auto">
                  <TemplateThumbnail templateId={previewTemplate.id} resume={sampleResumeData as any} />
                </div>
                <p className="text-muted-foreground text-sm">{previewTemplate.description}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={atsScoreColors[previewTemplate.atsScore]}>
                    {atsScoreLabels[previewTemplate.atsScore]}
                  </Badge>
                  <Badge variant="secondary" className="text-xs capitalize">{previewTemplate.category}</Badge>
                </div>
                <Button
                  onClick={() => {
                    handleUseTemplate(previewTemplate.id);
                    setPreviewTemplate(null);
                  }}
                  className="w-full h-12 rounded-xl"
                  size="lg"
                >
                  Use This Template
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
