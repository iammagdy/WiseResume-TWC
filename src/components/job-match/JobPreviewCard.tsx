import { useState } from 'react';
import { Briefcase, Building2, MapPin, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface JobPreviewCardProps {
  title: string;
  company: string;
  location?: string;
  jobUrl?: string;
  skills?: string[];
  description?: string;
  className?: string;
}

export function JobPreviewCard({
  title,
  company,
  location,
  jobUrl,
  skills,
  description,
  className,
}: JobPreviewCardProps) {
  const [expanded, setExpanded] = useState(false);

  const hasExtras = (skills && skills.length > 0) || description;

  return (
    <div className={cn('jmw-job-card', className)}>
      <div className="jmw-job-card__head">
        <div className="jmw-job-card__logo">
          <Briefcase className="w-5 h-5 text-primary" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground leading-snug truncate">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            <Building2 className="w-3 h-3 shrink-0" aria-hidden />
            <span className="truncate">{company}</span>
          </p>
          {location && (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <MapPin className="w-3 h-3 shrink-0" aria-hidden />
              <span className="truncate">{location}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {jobUrl && (
            <a
              href={jobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              aria-label="Open job posting"
            >
              <ExternalLink className="w-3.5 h-3.5" aria-hidden />
            </a>
          )}
          {hasExtras && (
            <button
              type="button"
              className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              aria-label={expanded ? 'Collapse job details' : 'Expand job details'}
            >
              {expanded ? (
                <ChevronUp className="w-3.5 h-3.5" aria-hidden />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" aria-hidden />
              )}
            </button>
          )}
        </div>
      </div>

      {expanded && hasExtras && (
        <>
          {skills && skills.length > 0 && (
            <div className="jmw-job-card__skills">
              {skills.slice(0, 10).map((skill) => (
                <Badge key={skill} variant="secondary" className="text-[10px] font-medium">
                  {skill}
                </Badge>
              ))}
              {skills.length > 10 && (
                <Badge variant="outline" className="text-[10px]">
                  +{skills.length - 10} more
                </Badge>
              )}
            </div>
          )}
          {description && (
            <p className="text-xs text-muted-foreground leading-relaxed px-3.5 pb-3.5 line-clamp-5">
              {description}
            </p>
          )}
        </>
      )}
    </div>
  );
}
