import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Loader2, Building2, Code2, Users, Zap,
  ChevronRight, Lightbulb,
} from 'lucide-react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { getSupabaseToken } from '@/lib/supabaseAuth';
import { cn } from '@/lib/utils';

interface Question {
  question: string;
  context: string;
  answerTip: string;
}

interface QuestionCategory {
  id: 'company' | 'technical' | 'behavioral' | 'curveball';
  label: string;
  questions: Question[];
}

interface QuestionBankSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobTitle?: string;
  company?: string;
  jobDescription?: string;
  resumeSummary?: string;
  onPracticeQuestion?: (question: string) => void;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  company: <Building2 className="w-4 h-4" />,
  technical: <Code2 className="w-4 h-4" />,
  behavioral: <Users className="w-4 h-4" />,
  curveball: <Zap className="w-4 h-4" />,
};

export function QuestionBankSheet({
  open, onOpenChange, jobTitle, company, jobDescription, resumeSummary,
  onPracticeQuestion,
}: QuestionBankSheetProps) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<QuestionCategory[]>([]);
  const [activeTab, setActiveTab] = useState<string>('company');
  const [expandedQ, setExpandedQ] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!jobTitle) {
      toast.error('Job title is required to generate questions.');
      return;
    }

    setLoading(true);
    haptics.light();
    try {
      const token = await getClerkSupabaseToken();
      if (!token) throw new Error('Not authenticated');

      const { EDGE_FUNCTIONS_URL, EDGE_FUNCTIONS_ANON_KEY } = await import('@/lib/supabaseConstants');
      const response = await fetch(
        `${EDGE_FUNCTIONS_URL}/functions/v1/generate-question-bank`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: EDGE_FUNCTIONS_ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jobTitle,
            company: company || '',
            jobDescription: jobDescription || '',
            resumeSummary: resumeSummary || '',
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to generate questions');
      }

      const result = await response.json();
      setCategories(result.categories || []);
      if (result.categories?.length > 0) {
        setActiveTab(result.categories[0].id);
      }
      haptics.medium();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate questions');
    } finally {
      setLoading(false);
    }
  };

  const activeCategory = categories.find(c => c.id === activeTab);

  return (
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setExpandedQ(null); } }}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0">
        <SheetHeader className="px-4 pt-4 pb-2 shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            Interview Question Bank
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-6 min-h-0 space-y-4">
          {categories.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <p className="text-sm text-muted-foreground">
                AI generates targeted interview questions based on the job role
                {company ? ` at ${company}` : ''} and your resume.
              </p>
              <Button
                onClick={handleGenerate}
                disabled={loading || !jobTitle}
                className="w-full h-12 rounded-xl gap-2"
                size="lg"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Generating questions...</>
                ) : (
                  <><Sparkles className="w-5 h-5" /> Generate Question Bank</>
                )}
              </Button>
              {!jobTitle && (
                <p className="text-xs text-muted-foreground text-center">
                  Enter a job description in Job-Targeted mode first.
                </p>
              )}
            </motion.div>
          )}

          {categories.length > 0 && (
            <>
              {/* Category Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => { setActiveTab(cat.id); haptics.selection(); setExpandedQ(null); }}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all touch-manipulation active:scale-95',
                      activeTab === cat.id
                        ? 'bg-primary text-primary-foreground'
                        : 'glass-elevated text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {CATEGORY_ICONS[cat.id]}
                    {cat.label}
                    <Badge variant="secondary" className="text-[10px] px-1.5 ml-0.5">
                      {cat.questions.length}
                    </Badge>
                  </button>
                ))}
              </div>

              {/* Questions */}
              <AnimatePresence mode="wait">
                {activeCategory && (
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-3"
                  >
                    {activeCategory.questions.map((q, i) => {
                      const qId = `${activeTab}-${i}`;
                      const isExpanded = expandedQ === qId;
                      return (
                        <motion.div
                          key={qId}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i * 0.05, 0.2) }}
                          className="rounded-2xl border border-border/60 overflow-hidden"
                        >
                          <button
                            onClick={() => { setExpandedQ(isExpanded ? null : qId); haptics.light(); }}
                            className="w-full flex items-start gap-3 p-4 text-left touch-manipulation"
                          >
                            <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold mt-0.5">
                              {i + 1}
                            </span>
                            <span className="flex-1 text-sm font-medium text-foreground leading-snug">
                              {q.question}
                            </span>
                            <ChevronRight className={cn(
                              'w-4 h-4 text-muted-foreground shrink-0 mt-0.5 transition-transform',
                              isExpanded && 'rotate-90'
                            )} />
                          </button>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="px-4 pb-4 space-y-3 border-t border-border/40 pt-3">
                                  <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                                      Why they ask this
                                    </p>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{q.context}</p>
                                  </div>
                                  <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-primary mb-1">
                                      Answer Framework
                                    </p>
                                    <p className="text-xs text-foreground/80 leading-relaxed">{q.answerTip}</p>
                                  </div>
                                  {onPracticeQuestion && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-full h-9 rounded-xl text-xs gap-1.5"
                                      onClick={() => {
                                        haptics.medium();
                                        onPracticeQuestion(q.question);
                                        onOpenChange(false);
                                      }}
                                    >
                                      <Sparkles className="w-3.5 h-3.5" />
                                      Practice This Question
                                    </Button>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Regenerate */}
              <Button
                variant="ghost"
                onClick={() => { setCategories([]); setExpandedQ(null); handleGenerate(); }}
                disabled={loading}
                className="w-full h-10 text-xs text-muted-foreground"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
                Regenerate Questions
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
