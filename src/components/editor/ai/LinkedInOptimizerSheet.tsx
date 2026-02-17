import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Linkedin, 
  Loader2,
  Copy,
  Check,
  ChevronDown,
  Briefcase,
  User,
  Hash,
  Lightbulb,
  Globe,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useResumeStore } from '@/store/resumeStore';
import { supabase } from '@/integrations/supabase/safeClient';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { useAIAction } from '@/hooks/useAIAction';


interface LinkedInOptimizerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type RegionOption = 'global' | 'gcc' | 'emea' | 'apac' | 'americas';

interface LinkedInResult {
  headlines: string[];
  aboutSections: {
    short: string;
    medium: string;
    long: string;
  };
  experienceRewrites: {
    original: string;
    linkedin: string;
    position: string;
    company: string;
  }[];
  suggestedSkills: string[];
  keywords: string[];
  tips: string[];
}

const REGION_OPTIONS: { id: RegionOption; label: string; icon: string }[] = [
  { id: 'global', label: 'Global', icon: '🌍' },
  { id: 'gcc', label: 'GCC', icon: '🇦🇪' },
  { id: 'emea', label: 'EMEA', icon: '🇪🇺' },
  { id: 'apac', label: 'APAC', icon: '🌏' },
  { id: 'americas', label: 'Americas', icon: '🇺🇸' },
];

export function LinkedInOptimizerSheet({ open, onOpenChange }: LinkedInOptimizerSheetProps) {
  const { currentResume } = useResumeStore();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<RegionOption>('global');
  const [result, setResult] = useState<LinkedInResult | null>(null);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const { execute: executeAI } = useAIAction({ operation: 'linkedin' });

  const handleOptimize = async () => {
    if (!currentResume) {
      toast.error('Please create a resume first');
      return;
    }

    haptics.medium();
    setIsLoading(true);

    try {
      const data = await executeAI(async () => {
        const { data, error } = await supabase.functions.invoke('optimize-for-linkedin', {
          body: {
            resume: currentResume,
            region: selectedRegion,
          },
        });

        if (error) throw error;
        if (!data.success) throw new Error(data.error || 'Optimization failed');
        return data;
      });

      if (!data) return;
      setResult(data);
    } catch (err) {
      console.error('LinkedIn optimization error:', err);
      toast.error('Failed to optimize. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(id);
    haptics.light();
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const CopyButton = ({ text, id }: { text: string; id: string }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 w-8 p-0 shrink-0"
      onClick={() => handleCopy(text, id)}
    >
      {copiedItem === id ? (
        <Check className="w-4 h-4 text-success" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </Button>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0">
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-border shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Linkedin className="w-5 h-5 text-[#0A66C2]" />
            LinkedIn Optimizer
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          <AnimatePresence mode="wait">
            {!result ? (
              <motion.div
                key="setup"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-4 space-y-6"
              >
                <div className="text-center py-6">
                  <div className="w-16 h-16 rounded-2xl bg-[#0A66C2]/10 flex items-center justify-center mx-auto mb-4">
                    <Linkedin className="w-8 h-8 text-[#0A66C2]" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Optimize for LinkedIn</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    Transform your resume into LinkedIn-optimized content with headlines, about sections, and skills
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Regional Style
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {REGION_OPTIONS.map((region) => (
                      <button
                        key={region.id}
                        onClick={() => {
                          setSelectedRegion(region.id);
                          haptics.light();
                        }}
                        className={cn(
                          'px-3 py-2 rounded-lg border text-sm transition-all flex items-center gap-2',
                          selectedRegion === region.id
                            ? 'border-primary bg-primary/10'
                            : 'border-border bg-muted/50 hover:border-primary/50'
                        )}
                      >
                        <span>{region.icon}</span>
                        <span>{region.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-muted/50 border border-border">
                  <h4 className="font-medium text-sm mb-3">What you'll get:</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      5 compelling headline options
                    </li>
                    <li className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-primary" />
                      About section in 3 lengths
                    </li>
                    <li className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-primary" />
                      Optimized skills & keywords
                    </li>
                    <li className="flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-primary" />
                      Personalized optimization tips
                    </li>
                  </ul>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-4"
              >
                <Tabs defaultValue="headlines" className="w-full">
                  <TabsList className="w-full grid grid-cols-4 mb-4">
                    <TabsTrigger value="headlines" className="text-xs">Headlines</TabsTrigger>
                    <TabsTrigger value="about" className="text-xs">About</TabsTrigger>
                    <TabsTrigger value="skills" className="text-xs">Skills</TabsTrigger>
                    <TabsTrigger value="tips" className="text-xs">Tips</TabsTrigger>
                  </TabsList>

                  {/* Headlines */}
                  <TabsContent value="headlines" className="space-y-3">
                    <p className="text-sm text-muted-foreground mb-4">
                      Choose a headline that best represents your professional brand
                    </p>
                    {result.headlines?.map((headline, i) => (
                      <div 
                        key={i}
                        className="p-3 rounded-xl bg-muted/50 border border-border flex items-center justify-between gap-3"
                      >
                        <p className="text-sm flex-1">{headline}</p>
                        <CopyButton text={headline} id={`headline-${i}`} />
                      </div>
                    ))}
                  </TabsContent>

                  {/* About Sections */}
                  <TabsContent value="about" className="space-y-4">
                    <p className="text-sm text-muted-foreground mb-4">
                      Pick the length that works best for your profile
                    </p>
                    
                    {result.aboutSections && (
                      <>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">Short (~150 words)</Label>
                            <CopyButton text={result.aboutSections.short} id="about-short" />
                          </div>
                          <div className="p-3 rounded-xl bg-muted/50 border border-border">
                            <p className="text-sm whitespace-pre-wrap">{result.aboutSections.short}</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">Medium (~300 words)</Label>
                            <CopyButton text={result.aboutSections.medium} id="about-medium" />
                          </div>
                          <div className="p-3 rounded-xl bg-muted/50 border border-border">
                            <p className="text-sm whitespace-pre-wrap">{result.aboutSections.medium}</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">Long (~500 words)</Label>
                            <CopyButton text={result.aboutSections.long} id="about-long" />
                          </div>
                          <div className="p-3 rounded-xl bg-muted/50 border border-border max-h-[200px] overflow-y-auto">
                            <p className="text-sm whitespace-pre-wrap">{result.aboutSections.long}</p>
                          </div>
                        </div>
                      </>
                    )}
                  </TabsContent>

                  {/* Skills & Keywords */}
                  <TabsContent value="skills" className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Suggested Skills</Label>
                        <CopyButton 
                          text={result.suggestedSkills?.join(', ') || ''} 
                          id="skills" 
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {result.suggestedSkills?.map((skill, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Keywords to Include</Label>
                        <CopyButton 
                          text={result.keywords?.join(', ') || ''} 
                          id="keywords" 
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {result.keywords?.map((keyword, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  {/* Tips */}
                  <TabsContent value="tips" className="space-y-3">
                    <p className="text-sm text-muted-foreground mb-4">
                      Personalized recommendations for your profile
                    </p>
                    {result.tips?.map((tip, i) => (
                      <div 
                        key={i}
                        className="p-3 rounded-xl bg-primary/5 border border-primary/10 flex items-start gap-3"
                      >
                        <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <p className="text-sm">{tip}</p>
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border shrink-0">
          {!result ? (
            <Button
              className="w-full"
              onClick={handleOptimize}
              disabled={isLoading || !currentResume}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Linkedin className="w-4 h-4 mr-2" />
              )}
              Generate LinkedIn Content
            </Button>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setResult(null)}
            >
              Start Over
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
