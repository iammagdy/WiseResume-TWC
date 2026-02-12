import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { Scissors, Mail, CheckCircle2, ExternalLink, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TimelineEntry {
  id: string;
  type: 'tailor' | 'cover_letter' | 'application';
  jobTitle: string;
  company: string | null;
  date: string;
  resumeId: string | null;
  resumeName?: string;
  url?: string | null;
  status?: string;
  deadline?: string | null;
}

export function ActivityTimeline() {
  const { user } = useAuth();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['activity-timeline', user?.id],
    queryFn: async () => {
      const [tailorRes, appRes, coverRes] = await Promise.all([
        supabase.from('tailor_history').select('id, job_title, company, created_at, resume_id').order('created_at', { ascending: false }).limit(50),
        supabase.from('job_applications').select('id, job_title, company, applied_at, resume_id, url, status, deadline').order('applied_at', { ascending: false }).limit(50),
        supabase.from('cover_letters').select('id, job_title, company, created_at, resume_id').order('created_at', { ascending: false }).limit(50),
      ]);

      const items: TimelineEntry[] = [];

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

      // Fetch resume names
      const resumeIds = [...new Set(items.map(i => i.resumeId).filter(Boolean))] as string[];
      if (resumeIds.length > 0) {
        const { data: resumes } = await supabase.from('resumes').select('id, title').in('id', resumeIds);
        const nameMap: Record<string, string> = {};
        (resumes || []).forEach(r => { nameMap[r.id] = r.title; });
        items.forEach(i => { if (i.resumeId) i.resumeName = nameMap[i.resumeId]; });
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
      {entries.map(entry => (
        <div key={entry.id} className="glass-surface rounded-2xl p-3.5 border border-border/20">
          <div className="flex items-start gap-3">
            <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
              entry.type === 'tailor' ? 'bg-primary/10 text-primary' :
              entry.type === 'cover_letter' ? 'bg-warning/10 text-warning' :
              'bg-success/10 text-success'
            }`}>
              {entry.type === 'tailor' && <Scissors className="w-4 h-4" />}
              {entry.type === 'cover_letter' && <Mail className="w-4 h-4" />}
              {entry.type === 'application' && <CheckCircle2 className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm truncate">{entry.jobTitle}</p>
                {entry.type === 'application' && entry.status && (
                  <Badge variant="secondary" className="text-[10px] capitalize shrink-0">
                    {entry.status}
                  </Badge>
                )}
              </div>
              {entry.company && (
                <p className="text-xs text-muted-foreground truncate">{entry.company}</p>
              )}
              <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                <span>
                  {entry.type === 'tailor' ? 'Tailored' : entry.type === 'cover_letter' ? 'Cover letter' : 'Applied'}
                </span>
                <span>·</span>
                <span>{formatDistanceToNow(new Date(entry.date), { addSuffix: true })}</span>
                {entry.resumeName && (
                  <>
                    <span>·</span>
                    <span className="truncate max-w-[100px]">{entry.resumeName}</span>
                  </>
                )}
              </div>
            </div>
            {entry.url && (
              <a
                href={entry.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 p-2 rounded-lg hover:bg-muted/50 text-muted-foreground"
                onClick={e => e.stopPropagation()}
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
