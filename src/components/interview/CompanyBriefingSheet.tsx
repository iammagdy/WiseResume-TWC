import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, Newspaper, Heart, Users, MessageSquareQuote, HelpCircle, Copy, X } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { useCompanyBriefing } from '@/hooks/useCompanyBriefing';
import { AITrustBadge } from '@/components/ui/AITrustBadge';
import type { CompanyBriefing } from '@/types/companyBriefing';

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

  useEffect(() => {
    if (open && !briefing && !isLoading && jobDescription.trim()) {
      generate({ jobDescription, resumeData });
    }
  }, [open]);

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(reset, 300);
  };

  const handleCopy = () => {
    if (!briefing) return;
    haptics.light();
    const text = formatBriefingAsText(briefing);
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Briefing copied to clipboard');
    });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="flex items-center justify-between pb-2">
          <DrawerTitle className="flex items-center gap-2 text-base font-bold">
            <Building2 className="w-5 h-5 text-primary" />
            Company Briefing
          </DrawerTitle>
          <div className="flex items-center gap-2">
            {briefing && (
              <Button variant="ghost" size="icon" onClick={handleCopy} className="h-9 w-9">
                <Copy className="w-4 h-4" />
              </Button>
            )}
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleClose}>
                <X className="w-4 h-4" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <ScrollArea className="flex-1 px-4 pb-6 max-h-[75vh]">
          <AITrustBadge className="mb-3" />
          {isLoading && <BriefingSkeleton />}
          {error && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">{error}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => generate({ jobDescription, resumeData })}>
                Try Again
              </Button>
            </div>
          )}
          {briefing && <BriefingContent briefing={briefing} />}
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}

function BriefingSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
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

function BriefingContent({ briefing }: { briefing: CompanyBriefing }) {
  const sections = [
    {
      icon: Building2,
      title: 'Company Snapshot',
      highlight: false,
      content: (
        <div className="grid grid-cols-2 gap-2 text-sm">
          <InfoPair label="Company" value={briefing.companySnapshot.name} />
          <InfoPair label="Industry" value={briefing.companySnapshot.industry} />
          <InfoPair label="Size" value={briefing.companySnapshot.size} />
          <InfoPair label="HQ" value={briefing.companySnapshot.hq} />
          <InfoPair label="Founded" value={briefing.companySnapshot.founded} />
          <InfoPair label="Mission" value={briefing.companySnapshot.mission} span />
        </div>
      ),
    },
    {
      icon: Newspaper,
      title: 'Recent Highlights',
      highlight: false,
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
    {
      icon: Heart,
      title: 'Culture Signals',
      highlight: false,
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
    },
    {
      icon: Users,
      title: 'Key People',
      highlight: false,
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
    },
    {
      icon: MessageSquareQuote,
      title: 'Talking Points',
      highlight: true,
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
    },
    {
      icon: HelpCircle,
      title: 'Questions to Ask',
      highlight: false,
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
    },
  ];

  return (
    <div className="space-y-3">
      {sections.map((section, i) => (
        <motion.div
          key={section.title}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className={cn(
            'p-4 rounded-2xl border bg-card/60 space-y-3',
            section.highlight
              ? 'border-primary/40 bg-primary/5 shadow-[0_0_15px_hsl(var(--primary)/0.1)]'
              : 'border-border/40'
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
    </div>
  );
}

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
    '',
    '📰 RECENT HIGHLIGHTS',
    ...b.recentHighlights.map(h => `• ${h.title}: ${h.summary}`),
    '',
    '💡 CULTURE SIGNALS',
    ...b.cultureSignals.map(c => `• ${c.signal}: ${c.detail}`),
    '',
    '👥 KEY PEOPLE',
    ...b.keyPeople.map(p => `• ${p.role}: ${p.context}`),
    '',
    '🎯 TALKING POINTS',
    ...b.talkingPoints.map(t => `• ${t.point} — ${t.connection}`),
    '',
    '❓ QUESTIONS TO ASK',
    ...b.questionsToAsk.map(q => `• "${q.question}" — ${q.why}`),
  ];
  return lines.join('\n');
}
