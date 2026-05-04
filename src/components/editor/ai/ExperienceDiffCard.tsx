import { Briefcase, Check } from 'lucide-react';
import type { Experience } from '@/types/resume';

interface ExperienceDiffCardProps {
  entry: Experience;
  original: Experience | undefined;
  diffs: string[];
}

/**
 * Before/after diff card for a single experience entry.
 * Used by BoostAllExperienceSheet (batch boost) to display per-entry AI changes.
 */
export function ExperienceDiffCard({ entry, original, diffs }: ExperienceDiffCardProps) {
  const origDesc = original?.description?.trim() || '';
  const newDesc = entry.description?.trim() || '';
  const origAch = original?.achievements ?? [];
  const newAch = entry.achievements ?? [];
  const descChanged = origDesc !== newDesc;
  const achChanged = JSON.stringify(origAch) !== JSON.stringify(newAch);

  return (
    <div className="rounded-xl border border-border p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Briefcase className="w-4 h-4 text-muted-foreground shrink-0" />
        <p className="font-medium text-sm truncate">
          {original?.position || entry.position || 'Untitled Role'}
        </p>
      </div>
      <p className="text-xs text-muted-foreground truncate">
        {original?.company || entry.company}
        {(original?.account || entry.account) && (
          <span className="text-muted-foreground/70"> ({original?.account || entry.account} Account)</span>
        )}
      </p>

      {descChanged && (
        <div className="space-y-1.5 pt-1">
          <p className="text-xs font-medium text-muted-foreground">Description</p>
          {origDesc && (
            <div className="rounded-lg bg-muted p-2">
              <p className="text-xs text-muted-foreground line-through">{origDesc}</p>
            </div>
          )}
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-2">
            <p className="text-xs text-foreground">{newDesc}</p>
          </div>
        </div>
      )}

      {achChanged && newAch.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <p className="text-xs font-medium text-muted-foreground">Bullet Points</p>
          {origAch.length > 0 && (
            <div className="rounded-lg bg-muted p-2 space-y-0.5">
              {origAch.map((a, i) => (
                <p key={i} className="text-xs text-muted-foreground line-through">• {a}</p>
              ))}
            </div>
          )}
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-2 space-y-0.5">
            {newAch.map((a, i) => (
              <p key={i} className="text-xs text-foreground">• {a}</p>
            ))}
          </div>
        </div>
      )}

      <ul className="space-y-0.5 pt-1">
        {diffs.map((d, i) => (
          <li key={i} className="text-xs text-primary flex items-start gap-1.5">
            <Check className="w-3 h-3 mt-0.5 shrink-0" />
            {d}
          </li>
        ))}
      </ul>
    </div>
  );
}
