import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, Palette, Type, CheckCircle2 } from 'lucide-react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { getClerkSupabaseToken } from '@/lib/clerkSupabase';
import { useResumeStore } from '@/store/resumeStore';
import { templates } from '@/lib/templateData';
import type { TemplateId, TemplateCustomization } from '@/types/resume';

interface TemplateAdvisorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (templateId: TemplateId, customization: Partial<TemplateCustomization>) => void;
}

interface Suggestion {
  recommendedTemplateId: TemplateId;
  customization: Partial<TemplateCustomization>;
  reasoning: string;
}

export function TemplateAdvisorSheet({ open, onOpenChange, onApply }: TemplateAdvisorSheetProps) {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const { currentResume } = useResumeStore();

  const handleGenerate = async () => {
    if (!currentResume) {
      toast.error('Load a resume first to get AI recommendations.');
      return;
    }

    setLoading(true);
    haptics.light();
    try {
      const token = await getClerkSupabaseToken();
      if (!token) throw new Error('Not authenticated');

      const skills = currentResume.skills?.map(s =>
        typeof s === 'string' ? s : (s as any).name || String(s)
      ) || [];

      const latestExp = currentResume.experience?.[0];
      const jobTitle = latestExp?.position || '';
      const industry = '';

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/suggest-template`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ jobTitle, industry, skills: skills.slice(0, 15) }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to get suggestion');
      }

      const result = await response.json();
      setSuggestion(result);
      haptics.medium();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to get suggestion');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!suggestion) return;
    haptics.medium();
    onApply(suggestion.recommendedTemplateId, suggestion.customization);
    onOpenChange(false);
    toast.success('Template & style applied!');
  };

  const templateInfo = suggestion
    ? templates.find(t => t.id === suggestion.recommendedTemplateId)
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[80vh] flex flex-col p-0">
        <SheetHeader className="px-4 pt-4 pb-2 shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Template Advisor
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-6 min-h-0 space-y-4">
          <p className="text-sm text-muted-foreground">
            AI analyzes your resume's industry and role to recommend the perfect template and design customization.
          </p>

          {!suggestion && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Button
                onClick={handleGenerate}
                disabled={loading || !currentResume}
                className="w-full h-12 rounded-xl gap-2"
                size="lg"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing your resume...</>
                ) : (
                  <><Sparkles className="w-5 h-5" /> Get AI Recommendation</>
                )}
              </Button>
              {!currentResume && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Open a resume first to use AI suggestions.
                </p>
              )}
            </motion.div>
          )}

          <AnimatePresence>
            {suggestion && templateInfo && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Recommended Template Card */}
                <div className="p-4 rounded-2xl border border-primary/30 bg-primary/5 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-sm">Recommended: {templateInfo.name}</span>
                    <Badge variant="secondary" className="text-[10px] capitalize">
                      {templateInfo.category}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{suggestion.reasoning}</p>
                </div>

                {/* Customization Preview */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Suggested Style
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 p-3 rounded-xl glass-elevated">
                      <Palette className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Accent Color</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div
                            className="w-4 h-4 rounded-full border border-border"
                            style={{ backgroundColor: suggestion.customization.accentColor }}
                          />
                          <span className="text-xs font-mono">{suggestion.customization.accentColor}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-xl glass-elevated">
                      <Type className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Font</p>
                        <span className="text-xs">{suggestion.customization.fontHeading?.split(',')[0].replace(/'/g, '')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    onClick={handleApply}
                    className="flex-1 h-12 rounded-xl"
                    size="lg"
                  >
                    Apply Recommendation
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { setSuggestion(null); handleGenerate(); }}
                    className="h-12 rounded-xl px-4"
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Retry'}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SheetContent>
    </Sheet>
  );
}
