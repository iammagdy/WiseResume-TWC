import { useQuery } from '@tanstack/react-query';
import { databases, DATABASE_ID, Query } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from 'date-fns';
import { Scissors, Mail, CheckCircle2, ExternalLink, FileText, FilePlus2, Send, Search } from 'lucide-react';
import { openExternal } from '@/lib/openExternal';
import { Badge } from '@/components/ui/badge';
import { haptics } from '@/lib/haptics';
import { motion } from 'framer-motion';
import { useState, useMemo } from 'react';

interface TimelineEntry {
  id: string;
  type: 'tailor' | 'cover_letter' | 'application' | 'resume_created' | 'resume_tailored';
  jobTitle: string;
  company: string | null;
  date: string;
  resumeId: string | null;
  resumeName?: string;
  url?: string | null;
  status?: string;
  deadline?: string | null;
}

type FilterKey = 'all' | 'applied' | 'tailored' | 'cover_letter' | 'resume';

const FILTER_CHIPS: { key: FilterKey; label: string }[] = [
  { key: 'all',          label: 'All' },
  { key: 'applied',      label: 'Applied' },
  { key: 'tailored',     label: 'Tailored' },
  { key: 'cover_letter', label: 'Cover Letter' },
  { key: 'resume',       label: 'Resume' },
];

function entryMatchesFilter(entry: TimelineEntry, filter: FilterKey): boolean {
  switch (filter) {
    case 'all':          return true;
    case 'applied':      return entry.type === 'application';
    case 'tailored':     return entry.type === 'tailor' || entry.type === 'resume_tailored';
    case 'cover_letter': return entry.type === 'cover_letter';
    case 'resume':       return entry.type === 'resume_created';
    default:             return true;
  }
}

function getGroup(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  if (isThisWeek(d, { weekStartsOn: 1 })) return 'This week';
  return 'Earlier';
}

const GROUP_ORDER = ['Today', 'Yesterday', 'This week', 'Earlier'];

const typeConfig = {
  resume_created:  { icon: FilePlus2,    label: 'Created',      bg: 'bg-primary/10',  fg: 'text-primary' },
  resume_tailored: { icon: Scissors,     label: 'Tailored',     bg: 'bg-accent/15',   fg: 'text-accent-foreground' },
  tailor:          { icon: Scissors,     label: 'Tailored',     bg: 'bg-primary/10',  fg: 'text-primary' },
  cover_letter:    { icon: Mail,         label: 'Cover letter', bg: 'bg-warning/10',  fg: 'text-warning' },
  application:     { icon: CheckCircle2, label: 'Applied',      bg: 'bg-success/10',  fg: 'text-success' },
};

interface TailorDocFields {
  job_title: string;
  company: string | null;
  resume_id: string | null;
}

interface AppDocFields {
  job_title: string;
  company: string | null;
  resume_id: string | null;
  url: string | null;
  status: string;
  deadline: string | null;
  applied_at: string | null;
}

interface CoverDocFields {
  job_title: string;
  company: string | null;
  resume_id: string | null;
}

interface ResumeDocFields {
  title: string;
  parent_resume_id: string | null;
  target_job_title: string | null;
  target_company: string | null;
}

export function ActivityTimeline() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['activity-timeline', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const [tailorRes, appRes, coverRes, resumeRes] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTIONS.tailor_history, [
          Query.equal('user_id', user.id),
          Query.orderDesc('$createdAt'),
          Query.limit(50),
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTIONS.job_applications, [
          Query.equal('user_id', user.id),
          Query.orderDesc('$createdAt'),
          Query.limit(50),
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTIONS.cover_letters, [
          Query.equal('user_id', user.id),
          Query.orderDesc('$createdAt'),
          Query.limit(50),
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTIONS.resumes, [
          Query.equal('user_id', user.id),
          Query.orderDesc('$createdAt'),
          Query.limit(50),
        ]),
      ]);

      const items: TimelineEntry[] = [];

      resumeRes.documents.forEach(doc => {
        const r = doc as unknown as ResumeDocFields;
        items.push({
          id: `r-${doc.$id}`,
          type: r.parent_resume_id ? 'resume_tailored' : 'resume_created',
          jobTitle: r.target_job_title ?? r.title,
          company: r.target_company ?? null,
          date: doc.$createdAt,
          resumeId: doc.$id,
          resumeName: r.title,
        });
      });

      tailorRes.documents.forEach(doc => {
        const t = doc as unknown as TailorDocFields;
        items.push({
          id: `t-${doc.$id}`,
          type: 'tailor',
          jobTitle: t.job_title,
          company: t.company,
          date: doc.$createdAt,
          resumeId: t.resume_id,
        });
      });

      appRes.documents.forEach(doc => {
        const a = doc as unknown as AppDocFields;
        items.push({
          id: `a-${doc.$id}`,
          type: 'application',
          jobTitle: a.job_title,
          company: a.company,
          date: a.applied_at ?? doc.$createdAt,
          resumeId: a.resume_id,
          url: a.url,
          status: a.status,
          deadline: a.deadline,
        });
      });

      coverRes.documents.forEach(doc => {
        const c = doc as unknown as CoverDocFields;
        items.push({
          id: `c-${doc.$id}`,
          type: 'cover_letter',
          jobTitle: c.job_title,
          company: c.company,
          date: doc.$createdAt,
          resumeId: c.resume_id,
        });
      });

      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Fetch resume names for non-resume entries
      const needNames = items.filter(i => !i.resumeName && i.resumeId);
      const resumeIds = [...new Set(needNames.map(i => i.resumeId).filter(Boolean))] as string[];
      if (resumeIds.length > 0) {
        const nameRes = await databases.listDocuments(DATABASE_ID, COLLECTIONS.resumes, [
          Query.equal('$id', resumeIds),
          Query.limit(resumeIds.length),
        ]);
        const nameMap: Record<string, string> = {};
        nameRes.documents.forEach(doc => {
          nameMap[doc.$id] = (doc as unknown as { title: string }).title;
        });
        needNames.forEach(i => { if (i.resumeId) i.resumeName = nameMap[i.resumeId]; });
      }

      return items;
    },
    enabled: !!user,
  });

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return entries.filter(e => {
      if (!entryMatchesFilter(e, activeFilter)) return false;
      if (q) {
        const haystack = `${e.jobTitle} ${e.company || ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [entries, activeFilter, searchQuery]);

  const grouped = useMemo(() => {
    const map: Record<string, TimelineEntry[]> = {};
    for (const entry of filtered) {
      const g = getGroup(entry.date);
      if (!map[g]) map[g] = [];
      map[g].push(entry);
    }
    return GROUP_ORDER.filter(g => map[g]?.length).map(g => ({ group: g, items: map[g] }));
  }, [filtered]);

  if (isLoading) {
    return (
      <div className="space-y-3 px-1">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center justify-center py-12 text-center px-6"
      >
        <div className="relative mb-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <FileText className="w-8 h-8 text-primary" />
          </div>
          <div className="absolute -top-2 -right-3 w-8 h-8 rounded-xl bg-accent/15 flex items-center justify-center rotate-12">
            <Scissors className="w-4 h-4 text-accent-foreground" />
          </div>
        </div>
        <h3 className="text-base font-semibold mb-1">Your career journey starts here</h3>
        <p className="text-sm text-muted-foreground mb-5 max-w-[280px]">
          Create a resume, tailor it for jobs, and track your applications — all in one place
        </p>
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl px-5 py-3 min-h-[44px] transition-colors active:scale-95 touch-manipulation shadow-sm"
        >
          Start building your resume
        </button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by job title or company…"
          className="w-full pl-9 pr-3 h-9 rounded-xl bg-muted/50 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5 -mx-0.5 px-0.5">
        {FILTER_CHIPS.map(chip => (
          <button
            key={chip.key}
            onClick={() => { haptics.selection(); setActiveFilter(chip.key); }}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all touch-manipulation min-h-[32px] ${
              activeFilter === chip.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/60 text-muted-foreground hover:text-foreground'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Grouped entries */}
      {grouped.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No matching entries</p>
      ) : (
        grouped.map(({ group, items }) => (
          <div key={group}>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2 sticky top-0 bg-background/80 backdrop-blur-sm py-1 -mx-1 z-10">
              {group}
            </p>
            <div className="space-y-2">
              {items.map((entry, i) => {
                const config = typeConfig[entry.type];
                const Icon = config.icon;
                const isResume = entry.type === 'resume_created' || entry.type === 'resume_tailored';

                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.25 }}
                    className="bg-card border border-border rounded-2xl p-3.5 transition-transform active:scale-[0.98] min-h-[72px] cursor-pointer"
                    onClick={isResume && entry.resumeId ? () => navigate(`/resume/${entry.resumeId}`) : undefined}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${config.bg} ${config.fg}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{entry.jobTitle}</p>
                          {entry.type === 'application' && entry.status && (
                            <Badge variant="secondary" className="text-[10px] capitalize shrink-0">
                              {entry.status}
                            </Badge>
                          )}
                          {entry.type === 'resume_tailored' && (
                            <Badge variant="secondary" className="text-[10px] shrink-0">Tailored</Badge>
                          )}
                        </div>
                        {entry.company && (
                          <p className="text-xs text-muted-foreground truncate">{entry.company}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                          <span>{config.label}</span>
                          <span>·</span>
                          <span>{formatDistanceToNow(new Date(entry.date), { addSuffix: true })}</span>
                          {entry.resumeName && !isResume && (
                            <>
                              <span>·</span>
                              <span className="truncate max-w-[100px]">{entry.resumeName}</span>
                            </>
                          )}
                        </div>
                        {entry.type === 'resume_tailored' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              haptics.light();
                              navigate(`/applications?tab=applications&action=add&jobTitle=${encodeURIComponent(entry.jobTitle)}&company=${encodeURIComponent(entry.company || '')}`);
                            }}
                            className="flex items-center gap-1 text-[11px] text-success font-medium px-2 py-1 rounded-lg bg-success/10 hover:bg-success/15 transition-colors mt-1.5 w-fit touch-manipulation min-h-[44px]"
                          >
                            <Send className="w-3 h-3" /> Mark as Applied
                          </button>
                        )}
                      </div>
                    </div>
                    {entry.url && (
                      <button
                        onClick={e => { e.stopPropagation(); openExternal(entry.url!); }}
                        className="shrink-0 p-2 rounded-lg hover:bg-muted text-muted-foreground touch-manipulation"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
