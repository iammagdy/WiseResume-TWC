import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Newspaper, Heart, Users, MessageSquareQuote, HelpCircle,
  Copy, X, Sparkles, Download, Search, FileText, Cpu, Star,
  Swords, ShoppingBag, ArrowRight,
} from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { useCompanyBriefing } from '@/hooks/useCompanyBriefing';
import { AITrustBadge } from '@/components/ui/AITrustBadge';
import { AIProviderVia } from '@/components/editor/ai/AIProviderBadge';
import type { CompanyBriefing } from '@/types/companyBriefing';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface CompanyBriefingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobDescription: string;
  resumeData?: {
    summary?: string;
    experience?: Array<{ position?: string; company?: string }>;
    skills?: Array<{ name?: string; skill?: string } | string>;
  };
}

export function CompanyBriefingSheet({ open, onOpenChange, jobDescription, resumeData }: CompanyBriefingSheetProps) {
  const { generate, briefing, isLoading, error, reset } = useCompanyBriefing();
  const [localJD, setLocalJD] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [inputMode, setInputMode] = useState<'company' | 'jd'>('company');
  const hasProvidedJD = jobDescription.trim().length > 0;

  useEffect(() => {
    if (open && !briefing && !isLoading && hasProvidedJD) {
      generate({ jobDescription, resumeData });
    }
  }, [open]);

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => { reset(); setLocalJD(''); setCompanyName(''); }, 300);
  };

  const handleGenerate = () => {
    haptics.light();
    if (inputMode === 'company') {
      if (!companyName.trim()) return;
      generate({ companyName: companyName.trim(), resumeData });
    } else {
      if (!localJD.trim()) return;
      generate({ jobDescription: localJD.trim(), resumeData });
    }
  };

  const handleCopy = () => {
    if (!briefing) return;
    haptics.light();
    const text = formatBriefingAsText(briefing);
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Briefing copied to clipboard');
    });
  };

  const handleDownloadPDF = async () => {
    if (!briefing) return;
    haptics.light();
    toast.info('Generating PDF…');
    try {
      const { generateCompanyBriefingPDF } = await import('@/lib/companyBriefingPdf');
      const blob = await generateCompanyBriefingPDF(briefing, authUser?.email || '');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${briefing.companySnapshot.name.replace(/\s+/g, '_')}_Briefing.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded');
    } catch {
      toast.error('Failed to generate PDF');
    }
  };

  const canGenerate = inputMode === 'company' ? companyName.trim().length > 0 : localJD.trim().length > 0;
  const loadingTarget = inputMode === 'company' ? companyName.trim() : undefined;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="flex items-center justify-between pb-2">
          <DrawerTitle className="flex items-center gap-2 text-base font-bold">
            <Building2 className="w-5 h-5 text-primary" />
            Company Briefing
            <AIProviderVia className="ml-1" />
          </DrawerTitle>
          <div className="flex items-center gap-2">
            {briefing && (
              <>
                <Button variant="ghost" size="icon" onClick={handleDownloadPDF} className="h-9 w-9" title="Download PDF">
                  <Download className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleCopy} className="h-9 w-9" title="Copy to clipboard">
                  <Copy className="w-4 h-4" />
                </Button>
              </>
            )}
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleClose}>
                <X className="w-4 h-4" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        {/* Scrollable content with visible scrollbar */}
        <div className="flex-1 overflow-y-auto px-4 pb-6 max-h-[75vh] scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
          <AITrustBadge className="mb-3" />

          {/* Input Phase */}
          {!hasProvidedJD && !briefing && !isLoading && !error && (
            <div className="space-y-3 mb-4">
              <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as 'company' | 'jd')}>
                <TabsList className="w-full">
                  <TabsTrigger value="company" className="flex-1 gap-1.5">
                    <Search className="w-3.5 h-3.5" />
                    Company Name
                  </TabsTrigger>
                  <TabsTrigger value="jd" className="flex-1 gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    Job Description
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="company">
                  <Input
                    placeholder="e.g. Google, Stripe, Amazon…"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && canGenerate && handleGenerate()}
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Get a deep research report on any company
                  </p>
                </TabsContent>
                <TabsContent value="jd">
                  <Textarea
                    placeholder="Paste the job description here…"
                    value={localJD}
                    onChange={(e) => setLocalJD(e.target.value)}
                    rows={5}
                    className="text-sm resize-none"
                  />
                </TabsContent>
              </Tabs>
              <Button onClick={handleGenerate} disabled={!canGenerate} className="w-full gap-2">
                <Sparkles className="w-4 h-4" />
                Generate Briefing
              </Button>
            </div>
          )}

          {isLoading && <BriefingLoadingProgress companyName={loadingTarget} />}
          {error && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">{error}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => {
                if (inputMode === 'company' && companyName.trim()) {
                  generate({ companyName: companyName.trim(), resumeData });
                } else {
                  generate({ jobDescription: hasProvidedJD ? jobDescription : localJD.trim(), resumeData });
                }
              }}>
                Try Again
              </Button>
            </div>
          )}
          {briefing && <BriefingContent briefing={briefing} />}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/* ─── Loading Progress ─── */
const LOADING_STEPS = [
  'Connecting to AI…',
  'Researching company…',
  'Analyzing culture & values…',
  'Gathering key insights…',
  'Building your briefing…',
  'Polishing report…',
];

function BriefingLoadingProgress({ companyName }: { companyName?: string }) {
  const [progress, setProgress] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    // Animate progress from 0 to ~90 over ~15s
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return 90;
        // Fast at start, slows down
        const increment = prev < 30 ? 4 : prev < 60 ? 2.5 : 1;
        return Math.min(prev + increment, 90);
      });
    }, 400);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIdx(prev => (prev + 1) % LOADING_STEPS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const currentStep = LOADING_STEPS[stepIdx];
  const displayStep = companyName
    ? currentStep.replace('company', companyName)
    : currentStep;

  return (
    <div className="space-y-5">
      {/* Progress section */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-2xl border border-border/40 bg-card/60 space-y-3"
      >
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Sparkles className="w-4 h-4 text-primary" />
          </motion.div>
          <AnimatePresence mode="wait">
            <motion.span
              key={stepIdx}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="text-sm font-medium text-foreground"
            >
              {displayStep}
            </motion.span>
          </AnimatePresence>
        </div>
        <Progress value={progress} className="h-2" />
        <p className="text-xs text-muted-foreground text-center">
          This usually takes 10–15 seconds
        </p>
      </motion.div>

      {/* Skeleton cards */}
      {Array.from({ length: 4 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 + i * 0.08 }}
          className="p-4 rounded-2xl border border-border/40 bg-card/60 space-y-3"
        >
          <div className="flex items-center gap-2">
            <Skeleton className="w-5 h-5 rounded" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </motion.div>
      ))}
    </div>
  );
}

/* ─── Content ─── */
function BriefingContent({ briefing }: { briefing: CompanyBriefing }) {
  const navigate = useNavigate();
  const snap = briefing.companySnapshot;

  const sections: Array<{
    icon: typeof Building2;
    title: string;
    highlight?: boolean;
    accent?: string;
    content: React.ReactNode;
  }> = [
    {
      icon: Building2,
      title: 'Company Snapshot',
      accent: 'border-l-primary',
      content: (
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">{snap.name}</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <InfoPair label="Industry" value={snap.industry} />
            <InfoPair label="Size" value={snap.size} />
            <InfoPair label="HQ" value={snap.hq} />
            <InfoPair label="Founded" value={snap.founded} />
            {snap.website && <InfoPair label="Website" value={snap.website} />}
            {snap.revenue && <InfoPair label="Revenue" value={snap.revenue} />}
            {snap.stockTicker && <InfoPair label="Ticker" value={snap.stockTicker} />}
            <InfoPair label="Mission" value={snap.mission} span />
          </div>
        </div>
      ),
    },
    {
      icon: Newspaper,
      title: 'Recent Highlights',
      accent: 'border-l-blue-500',
      content: (
        <ul className="space-y-2">
          {briefing.recentHighlights.map((h, i) => (
            <li key={i} className="text-sm">
              <span className="font-medium text-foreground">{h.title}</span>
              <p className="text-muted-foreground text-xs mt-0.5">{h.summary}</p>
            </li>
          ))}
        </ul>
      ),
    },
  ];

  if (briefing.productsOrServices?.length) {
    sections.push({
      icon: ShoppingBag,
      title: 'Products & Services',
      accent: 'border-l-emerald-500',
      content: (
        <div className="flex flex-wrap gap-1.5">
          {briefing.productsOrServices.map((p, i) => (
            <span key={i} className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-accent/60 text-accent-foreground">{p}</span>
          ))}
        </div>
      ),
    });
  }

  if (briefing.techStack?.length) {
    sections.push({
      icon: Cpu,
      title: 'Tech Stack',
      accent: 'border-l-violet-500',
      content: (
        <div className="flex flex-wrap gap-1.5">
          {briefing.techStack.map((t, i) => (
            <span key={i} className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">{t}</span>
          ))}
        </div>
      ),
    });
  }

  if (briefing.competitors?.length) {
    sections.push({
      icon: Swords,
      title: 'Competitors',
      accent: 'border-l-orange-500',
      content: (
        <div className="flex flex-wrap gap-1.5">
          {briefing.competitors.map((c, i) => (
            <span key={i} className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">{c}</span>
          ))}
        </div>
      ),
    });
  }

  sections.push({
    icon: Heart,
    title: 'Culture Signals',
    accent: 'border-l-pink-500',
    content: (
      <ul className="space-y-2">
        {briefing.cultureSignals.map((c, i) => (
          <li key={i} className="text-sm">
            <span className="font-medium text-foreground">{c.signal}</span>
            <p className="text-muted-foreground text-xs mt-0.5">{c.detail}</p>
          </li>
        ))}
      </ul>
    ),
  });

  if (briefing.glassdoorInsights) {
    const gi = briefing.glassdoorInsights;
    sections.push({
      icon: Star,
      title: 'Workplace Insights',
      accent: 'border-l-yellow-500',
      content: (
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span className="font-medium text-foreground">{gi.rating}</span>
          </div>
          {gi.prosThemes.length > 0 && (
            <div>
              <span className="text-xs text-muted-foreground">Pros:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {gi.prosThemes.map((p, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">{p}</span>
                ))}
              </div>
            </div>
          )}
          {gi.consThemes.length > 0 && (
            <div>
              <span className="text-xs text-muted-foreground">Cons:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {gi.consThemes.map((c, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-600 dark:text-red-400">{c}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      ),
    });
  }

  sections.push({
    icon: Users,
    title: 'Key People',
    accent: 'border-l-cyan-500',
    content: (
      <ul className="space-y-2">
        {briefing.keyPeople.map((p, i) => (
          <li key={i} className="text-sm">
            <span className="font-medium text-foreground">{p.role}</span>
            <p className="text-muted-foreground text-xs mt-0.5">{p.context}</p>
          </li>
        ))}
      </ul>
    ),
  });

  sections.push({
    icon: MessageSquareQuote,
    title: 'Talking Points',
    highlight: true,
    accent: 'border-l-primary',
    content: (
      <ul className="space-y-2">
        {briefing.talkingPoints.map((t, i) => (
          <li key={i} className="text-sm">
            <span className="font-medium text-foreground">{t.point}</span>
            <p className="text-muted-foreground text-xs mt-0.5">↳ {t.connection}</p>
          </li>
        ))}
      </ul>
    ),
  });

  sections.push({
    icon: HelpCircle,
    title: 'Questions to Ask',
    accent: 'border-l-indigo-500',
    content: (
      <ul className="space-y-2">
        {briefing.questionsToAsk.map((q, i) => (
          <li key={i} className="text-sm">
            <span className="font-medium text-foreground">"{q.question}"</span>
            <p className="text-muted-foreground text-xs mt-0.5">{q.why}</p>
          </li>
        ))}
      </ul>
    ),
  });

  return (
    <div className="space-y-3">
      {sections.map((section, i) => (
        <motion.div
          key={section.title}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className={cn(
            'p-4 rounded-2xl border bg-card/60 space-y-3 border-l-4',
            section.highlight
              ? 'border-primary/40 bg-primary/5 shadow-[0_0_15px_hsl(var(--primary)/0.1)]'
              : 'border-border/40',
            section.accent,
          )}
        >
          <div className="flex items-center gap-2">
            <section.icon className={cn('w-4 h-4', section.highlight ? 'text-primary' : 'text-muted-foreground')} />
            <h3 className={cn('text-sm font-bold', section.highlight ? 'text-primary' : 'text-foreground')}>
              {section.title}
            </h3>
          </div>
          {section.content}
        </motion.div>
      ))}

      {/* Smart Tailor CTA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: sections.length * 0.05 }}
        className="p-4 rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10 space-y-2"
      >
        <p className="text-sm font-medium text-foreground">
          Have a role at {snap.name}?
        </p>
        <p className="text-xs text-muted-foreground">
          Tailor your resume to match this company's culture and requirements.
        </p>
        <Button
          size="sm"
          className="gap-1.5 mt-1"
          onClick={() => {
            haptics.light();
            navigate('/ai-studio', { state: { openTailor: true, targetCompany: snap.name } });
          }}
        >
          Smart Tailor
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </motion.div>
    </div>
  );
}

/* ─── Helpers ─── */
function InfoPair({ label, value, span }: { label: string; value: string; span?: boolean }) {
  return (
    <div className={span ? 'col-span-2' : ''}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function formatBriefingAsText(b: CompanyBriefing): string {
  const lines: string[] = [
    `📋 COMPANY BRIEFING: ${b.companySnapshot.name}`,
    '',
    `Industry: ${b.companySnapshot.industry} | Size: ${b.companySnapshot.size} | HQ: ${b.companySnapshot.hq}`,
    `Mission: ${b.companySnapshot.mission}`,
  ];
  if (b.companySnapshot.website) lines.push(`Website: ${b.companySnapshot.website}`);
  if (b.companySnapshot.revenue) lines.push(`Revenue: ${b.companySnapshot.revenue}`);

  lines.push('', '📰 RECENT HIGHLIGHTS');
  lines.push(...b.recentHighlights.map(h => `• ${h.title}: ${h.summary}`));

  if (b.productsOrServices?.length) {
    lines.push('', '🛍️ PRODUCTS & SERVICES');
    lines.push(...b.productsOrServices.map(p => `• ${p}`));
  }
  if (b.techStack?.length) {
    lines.push('', '💻 TECH STACK');
    lines.push(b.techStack.join(', '));
  }
  if (b.competitors?.length) {
    lines.push('', '⚔️ COMPETITORS');
    lines.push(b.competitors.join(', '));
  }

  lines.push('', '💡 CULTURE SIGNALS');
  lines.push(...b.cultureSignals.map(c => `• ${c.signal}: ${c.detail}`));

  if (b.glassdoorInsights) {
    lines.push('', `⭐ WORKPLACE INSIGHTS (${b.glassdoorInsights.rating})`);
    if (b.glassdoorInsights.prosThemes.length) lines.push(`Pros: ${b.glassdoorInsights.prosThemes.join(', ')}`);
    if (b.glassdoorInsights.consThemes.length) lines.push(`Cons: ${b.glassdoorInsights.consThemes.join(', ')}`);
  }

  lines.push('', '👥 KEY PEOPLE');
  lines.push(...b.keyPeople.map(p => `• ${p.role}: ${p.context}`));
  lines.push('', '🎯 TALKING POINTS');
  lines.push(...b.talkingPoints.map(t => `• ${t.point} — ${t.connection}`));
  lines.push('', '❓ QUESTIONS TO ASK');
  lines.push(...b.questionsToAsk.map(q => `• "${q.question}" — ${q.why}`));

  return lines.join('\n');
}
