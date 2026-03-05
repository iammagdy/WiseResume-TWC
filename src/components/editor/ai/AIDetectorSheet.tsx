import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle2,
  Loader2,
  Copy,
  Wand2,
  RotateCcw,
  Info,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useResumeStore } from '@/store/resumeStore';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { useAIAction } from '@/hooks/useAIAction';
import { activityTracker } from '@/lib/activityTracker';
import { AIProviderVia } from '@/components/editor/ai/AIProviderBadge';
import type { ResumeData, Experience, Project, Volunteering, Award, Publication } from '@/types/resume';


interface AIDetectorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DetectionFlag {
  phrase: string;
  reason: string;
  severity: 'high' | 'medium' | 'low';
}

interface DetectionResult {
  aiScore: number;
  humanScore: number;
  confidence: string;
  flags: DetectionFlag[];
  verdict: string;
}

interface HumanizeResult {
  original: string;
  humanized: string;
  changes: string[];
}

type ToneOption = 'professional' | 'confident' | 'friendly';
type ViewState = 'input' | 'analyzing' | 'results';
type SectionOption = 'summary' | 'experience' | 'projects' | 'volunteering' | 'awards' | 'publications';

const TONE_OPTIONS: { id: ToneOption; label: string; description: string }[] = [
  { id: 'professional', label: 'Professional', description: 'Polished but natural' },
  { id: 'confident', label: 'Confident', description: 'Assertive and direct' },
  { id: 'friendly', label: 'Friendly', description: 'Warm and approachable' },
];

const SECTION_OPTIONS: { id: SectionOption; label: string }[] = [
  { id: 'summary', label: 'Summary' },
  { id: 'experience', label: 'Experience' },
  { id: 'projects', label: 'Projects' },
  { id: 'volunteering', label: 'Volunteering' },
  { id: 'awards', label: 'Awards' },
  { id: 'publications', label: 'Publications' },
];

const ENTRY_DELIMITER = '\n---\n';

function extractSectionText(
  resume: ResumeData | null,
  section: SectionOption
): string | null {
  if (!resume) return null;

  switch (section) {
    case 'summary':
      return resume.summary || null;

    case 'experience': {
      const exp = resume.experience as Experience[] | undefined;
      if (!exp?.length) return null;
      return exp.map(e => {
        const lines = [`${e.position} at ${e.company}`];
        if (e.description) lines.push(e.description);
        if (e.achievements?.length) {
          e.achievements.forEach(a => lines.push(`- ${a}`));
        }
        return lines.join('\n');
      }).join(ENTRY_DELIMITER);
    }

    case 'projects': {
      const proj = resume.projects as Project[] | undefined;
      if (!proj?.length) return null;
      return proj.map(p => {
        const lines = [`${p.name}${p.role ? ` (${p.role})` : ''}`];
        if (p.description) lines.push(p.description);
        return lines.join('\n');
      }).join(ENTRY_DELIMITER);
    }

    case 'volunteering': {
      const vol = resume.volunteering as Volunteering[] | undefined;
      if (!vol?.length) return null;
      return vol.map(v => {
        const lines = [`${v.role} at ${v.organization}`];
        if (v.description) lines.push(v.description);
        return lines.join('\n');
      }).join(ENTRY_DELIMITER);
    }

    case 'awards': {
      const awards = resume.awards as Award[] | undefined;
      if (!awards?.length) return null;
      return awards.map(a => {
        const lines = [`${a.title} — ${a.issuer}`];
        if (a.description) lines.push(a.description);
        return lines.join('\n');
      }).join(ENTRY_DELIMITER);
    }

    case 'publications': {
      const pubs = resume.publications as Publication[] | undefined;
      if (!pubs?.length) return null;
      return pubs.map(p => {
        const lines = [`${p.title} — ${p.publisher}`];
        if (p.description) lines.push(p.description);
        return lines.join('\n');
      }).join(ENTRY_DELIMITER);
    }

    default:
      return null;
  }
}

function applySectionText(
  resume: ResumeData,
  section: SectionOption,
  humanizedText: string
): Partial<ResumeData> {
  switch (section) {
    case 'summary':
      return { summary: humanizedText };

    case 'experience': {
      const exp = (resume.experience as Experience[]) || [];
      const blocks = humanizedText.split(ENTRY_DELIMITER);
      const updated = exp.map((entry, i) => {
        if (i >= blocks.length) return entry;
        const lines = blocks[i].split('\n');
        // First line is header "[Position] at [Company]" — skip it
        const contentLines = lines.slice(1);
        const achievements: string[] = [];
        const descLines: string[] = [];
        contentLines.forEach(line => {
          if (line.startsWith('- ')) {
            achievements.push(line.slice(2));
          } else if (line.trim()) {
            descLines.push(line);
          }
        });
        return {
          ...entry,
          description: descLines.join('\n') || entry.description,
          achievements: achievements.length ? achievements : entry.achievements,
        };
      });
      return { experience: updated };
    }

    case 'projects': {
      const proj = (resume.projects as Project[]) || [];
      const blocks = humanizedText.split(ENTRY_DELIMITER);
      const updated = proj.map((entry, i) => {
        if (i >= blocks.length) return entry;
        const lines = blocks[i].split('\n');
        const contentLines = lines.slice(1);
        return { ...entry, description: contentLines.join('\n').trim() || entry.description };
      });
      return { projects: updated };
    }

    case 'volunteering': {
      const vol = (resume.volunteering as Volunteering[]) || [];
      const blocks = humanizedText.split(ENTRY_DELIMITER);
      const updated = vol.map((entry, i) => {
        if (i >= blocks.length) return entry;
        const lines = blocks[i].split('\n');
        const contentLines = lines.slice(1);
        return { ...entry, description: contentLines.join('\n').trim() || entry.description };
      });
      return { volunteering: updated };
    }

    case 'awards': {
      const awards = (resume.awards as Award[]) || [];
      const blocks = humanizedText.split(ENTRY_DELIMITER);
      const updated = awards.map((entry, i) => {
        if (i >= blocks.length) return entry;
        const lines = blocks[i].split('\n');
        const contentLines = lines.slice(1);
        return { ...entry, description: contentLines.join('\n').trim() || entry.description };
      });
      return { awards: updated };
    }

    case 'publications': {
      const pubs = (resume.publications as Publication[]) || [];
      const blocks = humanizedText.split(ENTRY_DELIMITER);
      const updated = pubs.map((entry, i) => {
        if (i >= blocks.length) return entry;
        const lines = blocks[i].split('\n');
        const contentLines = lines.slice(1);
        return { ...entry, description: contentLines.join('\n').trim() || entry.description };
      });
      return { publications: updated };
    }

    default:
      return {};
  }
}

export function AIDetectorSheet({ open, onOpenChange }: AIDetectorSheetProps) {
  const { currentResume, updateResume } = useResumeStore();
  const [viewState, setViewState] = useState<ViewState>('input');
  const [inputText, setInputText] = useState('');
  const [selectedTone, setSelectedTone] = useState<ToneOption>('professional');
  const [selectedSection, setSelectedSection] = useState<SectionOption>('summary');
  const [detection, setDetection] = useState<DetectionResult | null>(null);
  const [humanized, setHumanized] = useState<HumanizeResult | null>(null);
  const [isHumanizing, setIsHumanizing] = useState(false);
  const { execute: executeAI } = useAIAction({ operation: 'detect-humanize' });

  useEffect(() => {
    if (open) { activityTracker.setActiveFeature('AI Humanizer'); }
    return () => { activityTracker.setActiveFeature(null); };
  }, [open]);

  const sectionLabel = SECTION_OPTIONS.find(s => s.id === selectedSection)?.label || 'Summary';

  const handleAnalyze = async () => {
    if (!inputText.trim()) {
      toast.error('Please enter some text to analyze');
      return;
    }

    haptics.medium();
    setViewState('analyzing');

    try {
      const result = await executeAI(async () => {
        const { data, error } = await edgeFunctions.functions.invoke('detect-and-humanize', {
          body: {
            text: inputText,
            action: 'detect',
          },
        });

        if (error) throw error;
        if (!data.success) throw new Error(data.error || 'Analysis failed');
        return data;
      });

      if (!result) { setViewState('input'); return; }

      setDetection(result.detection);
      setViewState('results');
    } catch (err) {
      console.error('AI detection error:', err);
      toast.error('Failed to analyze text. Please try again.');
      setViewState('input');
    }
  };

  const handleHumanize = async () => {
    if (!inputText.trim()) return;

    haptics.medium();
    setIsHumanizing(true);

    try {
      const { data, error } = await edgeFunctions.functions.invoke('detect-and-humanize', {
        body: {
          text: inputText,
          action: 'humanize',
          tone: selectedTone,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Humanization failed');

      setHumanized(data.humanized);
      toast.success('Text humanized successfully!');
    } catch (err) {
      console.error('Humanization error:', err);
      toast.error('Failed to humanize text. Please try again.');
    } finally {
      setIsHumanizing(false);
    }
  };

  const handleCopy = () => {
    const textToCopy = humanized?.humanized || inputText;
    navigator.clipboard.writeText(textToCopy);
    haptics.light();
    toast.success('Copied to clipboard!');
  };

  const handleApplyToSection = () => {
    if (!currentResume || !humanized?.humanized) return;
    
    const patch = applySectionText(currentResume, selectedSection, humanized.humanized);
    updateResume({ ...currentResume, ...patch });
    haptics.success();
    toast.success(`Applied to ${sectionLabel}!`);
    onOpenChange(false);
  };

  const handleReset = () => {
    setViewState('input');
    setDetection(null);
    setHumanized(null);
  };

  const handleLoadSection = () => {
    const text = extractSectionText(currentResume, selectedSection);
    if (text) {
      setInputText(text);
      haptics.light();
      toast.success(`Loaded ${sectionLabel}`);
    } else {
      toast.error(`No ${sectionLabel.toLowerCase()} found in your resume`);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-destructive';
    if (score >= 40) return 'text-warning';
    return 'text-success';
  };

  const getScoreBg = (score: number) => {
    if (score >= 70) return 'bg-destructive/10 border-destructive/30';
    if (score >= 40) return 'bg-warning/10 border-warning/30';
    return 'bg-success/10 border-success/30';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/30';
      case 'medium': return 'bg-warning/10 text-warning border-warning/30';
      case 'low': return 'bg-muted text-muted-foreground border-border';
      default: return 'bg-muted';
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0">
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-border shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            AI Detector & Humanizer
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          <AnimatePresence mode="wait">
            {/* Input State */}
            {viewState === 'input' && (
              <motion.div
                key="input"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-4 space-y-4"
              >
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <p className="text-sm text-muted-foreground flex items-start gap-2">
                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                    Many companies use AI detectors. This tool helps you identify AI-sounding text and rewrite it to sound more natural.
                  </p>
                </div>

                {/* Section Selector */}
                <div className="space-y-2">
                  <Label>Select Section</Label>
                  <div className="flex flex-wrap gap-2">
                    {SECTION_OPTIONS.map((section) => (
                      <button
                        key={section.id}
                        onClick={() => {
                          setSelectedSection(section.id);
                          haptics.light();
                        }}
                        className={cn(
                          'px-3 py-1.5 rounded-lg border text-sm transition-all',
                          selectedSection === section.id
                            ? 'border-primary bg-primary/10 font-medium'
                            : 'border-border bg-muted/50 hover:border-primary/50'
                        )}
                      >
                        {section.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Text to Analyze</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLoadSection}
                      className="text-xs"
                    >
                      Load {sectionLabel}
                    </Button>
                  </div>
                  <Textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`Paste your ${sectionLabel.toLowerCase()} text or load it from your resume...`}
                    className="min-h-[200px] resize-none"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {inputText.length} characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Humanization Tone (for rewriting)</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {TONE_OPTIONS.map((tone) => (
                      <button
                        key={tone.id}
                        onClick={() => {
                          setSelectedTone(tone.id);
                          haptics.light();
                        }}
                        className={cn(
                          'p-3 rounded-xl border text-center transition-all',
                          selectedTone === tone.id
                            ? 'border-primary bg-primary/10'
                            : 'border-border bg-muted/50 hover:border-primary/50'
                        )}
                      >
                        <p className="font-medium text-sm">{tone.label}</p>
                        <p className="text-xs text-muted-foreground">{tone.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Analyzing State */}
            {viewState === 'analyzing' && (
              <motion.div
                key="analyzing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center p-8 text-center"
              >
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <Shield className="w-10 h-10 text-primary" />
                </div>
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">Analyzing your text...</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Checking for AI patterns and common detection triggers
                </p>
              </motion.div>
            )}

            {/* Results State */}
            {viewState === 'results' && detection && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-4 space-y-6"
              >
                {/* AI Score */}
                <div className={cn('p-4 rounded-2xl border', getScoreBg(detection.aiScore))}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium">AI Detection Score</span>
                    <Badge variant="outline" className="capitalize">
                      {detection.confidence} confidence
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      'w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl',
                      getScoreBg(detection.aiScore),
                      getScoreColor(detection.aiScore)
                    )}>
                      {detection.aiScore}%
                    </div>
                    <div className="flex-1">
                      <p className="text-sm mb-1">{detection.verdict}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="text-success">Human: {detection.humanScore}%</span>
                        <span>•</span>
                        <span className="text-destructive">AI: {detection.aiScore}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Flags */}
                {detection.flags && detection.flags.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-warning" />
                      AI Patterns Detected ({detection.flags.length})
                    </h4>
                    {detection.flags.map((flag, i) => (
                      <div 
                        key={i} 
                        className={cn('p-3 rounded-xl border', getSeverityColor(flag.severity))}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-sm font-medium">"{flag.phrase}"</p>
                          <Badge variant="outline" className="shrink-0 text-xs capitalize">
                            {flag.severity}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{flag.reason}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Humanized Version */}
                {humanized && (
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      Humanized Version
                    </h4>
                    <div className="p-4 rounded-xl bg-success/10 border border-success/30">
                      <p className="text-sm whitespace-pre-wrap">{humanized.humanized}</p>
                    </div>
                    {humanized.changes && humanized.changes.length > 0 && (
                      <div className="p-3 rounded-xl bg-muted/50 border border-border">
                        <p className="text-xs font-medium mb-2">Changes Made:</p>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {humanized.changes.map((change, i) => (
                            <li key={i}>• {change}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border shrink-0 space-y-2">
          {viewState === 'input' && (
            <Button
              className="w-full"
              onClick={handleAnalyze}
              disabled={!inputText.trim()}
            >
              <Shield className="w-4 h-4 mr-2" />
              Analyze for AI Patterns
            </Button>
          )}

          {viewState === 'results' && (
            <>
              {!humanized ? (
                <Button
                  className="w-full"
                  onClick={handleHumanize}
                  disabled={isHumanizing}
                >
                  {isHumanizing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4 mr-2" />
                  )}
                  Humanize Text
                </Button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={handleCopy}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                  <Button onClick={handleApplyToSection}>
                    Apply to {sectionLabel}
                  </Button>
                </div>
              )}
              <Button
                variant="ghost"
                className="w-full"
                onClick={handleReset}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Analyze Different Text
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
