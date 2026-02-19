import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Scissors, Mail, CheckCircle2, ExternalLink, Clock, FileText, FilePlus2, Send } from 'lucide-react';
import { openExternal } from '@/lib/openExternal';
import { Badge } from '@/components/ui/badge';
import { haptics } from '@/lib/haptics';
import { motion } from 'framer-motion';

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

const typeConfig = {
  resume_created: { icon: FilePlus2, label: 'Created', bg: 'bg-primary/10', fg: 'text-primary' },
  resume_tailored: { icon: Scissors, label: 'Tailored', bg: 'bg-accent/15', fg: 'text-accent-foreground' },
  tailor: { icon: Scissors, label: 'Tailored', bg: 'bg-primary/10', fg: 'text-primary' },
  cover_letter: { icon: Mail, label: 'Cover letter', bg: 'bg-warning/10', fg: 'text-warning' },
  application: { icon: CheckCircle2, label: 'Applied', bg: 'bg-success/10', fg: 'text-success' },
};

export function ActivityTimeline() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['activity-timeline', user?.id],
    queryFn: async () => {
      const [tailorRes, appRes, coverRes, resumeRes] = await Promise.all([
        supabase.from('tailor_history').select('id, job_title, company, created_at, resume_id').order('created_at', { ascending: false }).limit(50),
        supabase.from('job_applications').select('id, job_title, company, applied_at, resume_id, url, status, deadline').order('applied_at', { ascending: false }).limit(50),
        supabase.from('cover_letters').select('id, job_title, company, created_at, resume_id').order('created_at', { ascending: false }).limit(50),
        supabase.from('resumes').select('id, title, parent_resume_id, target_job_title, target_company, created_at').order('created_at', { ascending: false }).limit(50),
      ]);

      const items: TimelineEntry[] = [];

      (resumeRes.data || []).forEach(r => items.push({
        id: `r-${r.id}`,
        type: r.parent_resume_id ? 'resume_tailored' : 'resume_created',
        jobTitle: r.target_job_title || r.title,
        company: r.target_company || null,
        date: r.created_at!,
        resumeId: r.id,
        resumeName: r.title,
      }));

      (tailorRes.data || []).forEach(t => items.push({
        id: `t-${t.id}`, type: 'tailor', jobTitle: t.job_title, company: t.company,
        date: t.created_at!, resumeId: t.resume_id,
      }));

      (appRes.data || []).forEach(a => items.push({
        id: `a-${a.id}`, type: 'application', jobTitle: a.job_title, company: a.company,
        date: a.applied_at!, resumeId: a.resume_id, url: a.url, status: a.status, deadline: a.deadline,
      }));

      (coverRes.data || []).forEach(c => items.push({
        id: `c-${c.id}`, type: 'cover_letter', jobTitle: c.job_title, company: c.company,
        date: c.created_at!, resumeId: c.resume_id,
      }));

      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Fetch resume names for non-resume entries
      const needNames = items.filter(i => !i.resumeName && i.resumeId);
      const resumeIds = [...new Set(needNames.map(i => i.resumeId).filter(Boolean))] as string[];
      if (resumeIds.length > 0) {
        const { data: resumes } = await supabase.from('resumes').select('id, title').in('id', resumeIds);
        const nameMap: Record<string, string> = {};
        (resumes || []).forEach(r => { nameMap[r.id] = r.title; });
        needNames.forEach(i => { if (i.resumeId) i.resumeName = nameMap[i.resumeId]; });
      }

      return items;
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="space-y-3 px-1">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 rounded-2xl bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Clock className="w-10 h-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">
          Your activity will appear here as you create resumes and tailor them for jobs
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {entries.map((entry, i) => {
        const config = typeConfig[entry.type];
        const Icon = config.icon;
        const isResume = entry.type === 'resume_created' || entry.type === 'resume_tailored';

        return (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            className="glass-surface rounded-2xl p-3.5 border border-border/20 transition-transform active:scale-[0.98] min-h-[80px] cursor-pointer"
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
                {/* Apply action for tailored entries */}
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
                className="shrink-0 p-2 rounded-lg hover:bg-muted/50 text-muted-foreground touch-manipulation"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
