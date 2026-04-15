import { Link } from 'react-router-dom';
import { MapPin, Wifi, Briefcase, DollarSign, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { PublicRole } from '@/hooks/wisehire/usePublicJobs';

const EMPLOYMENT_LABELS: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  internship: 'Internship',
  freelance: 'Freelance',
};

function formatSalary(min: number | null, max: number | null) {
  if (!min && !max) return null;
  const fmt = (n: number) =>
    n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  return `Up to ${fmt(max!)}`;
}

interface Props {
  role: PublicRole;
  companySlug?: string;
  showCompany?: boolean;
  applied?: boolean;
}

export function JobCard({ role, companySlug, showCompany = false, applied = false }: Props) {
  const slug = companySlug ?? role.company?.slug;
  const href = slug && role.slug ? `/jobs/${slug}/${role.slug}` : null;
  const salary = formatSalary(role.salary_min, role.salary_max);

  const content = (
    <div className={cn(
      'group p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 transition-all',
      href && 'hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm cursor-pointer',
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
            {role.title}
          </h3>
          {showCompany && role.company && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{role.company.name}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {applied && (
            <Badge className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
              Applied
            </Badge>
          )}
          {role.employment_type && (
            <Badge variant="outline" className="text-[10px]">
              {EMPLOYMENT_LABELS[role.employment_type] ?? role.employment_type}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-3 text-[11px] text-slate-500 dark:text-slate-400">
        {role.location && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />{role.location}
          </span>
        )}
        {role.remote_ok && (
          <span className="flex items-center gap-1 text-blue-500">
            <Wifi className="h-3 w-3" />Remote OK
          </span>
        )}
        {salary && (
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <DollarSign className="h-3 w-3" />{salary}
          </span>
        )}
        <span className="flex items-center gap-1 ml-auto">
          <Clock className="h-3 w-3" />
          {formatDistanceToNow(new Date(role.created_at), { addSuffix: true })}
        </span>
      </div>
    </div>
  );

  if (href) return <Link to={href}>{content}</Link>;
  return content;
}
