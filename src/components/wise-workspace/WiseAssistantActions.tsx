import { ArrowRight, ExternalLink, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';

export type WiseActionDescriptor =
  | { type: 'navigate'; label: string; href: string }
  | { type: 'open_sheet'; label: string; event: string }
  | { type: 'focus_editor_section'; label: string; href: string }
  | { type: 'send_prompt'; label: string; prompt: string };

export function WiseStepList({ steps, className }: { steps: string[]; className?: string }) {
  if (steps.length === 0) return null;
  return (
    <ol className={cn('mt-2 space-y-1.5 list-decimal list-inside text-xs text-muted-foreground leading-relaxed', className)}>
      {steps.map((step, i) => (
        <li key={i} className="pl-0.5">
          <span className="text-foreground/90">{step}</span>
        </li>
      ))}
    </ol>
  );
}

export function WiseLinkCard({
  title,
  description,
  href,
  cta,
  className,
}: {
  title: string;
  description: string;
  href: string;
  cta: string;
  className?: string;
}) {
  const navigate = useNavigate();
  return (
    <div
      className={cn(
        'mt-2 rounded-xl border border-primary/25 bg-primary/5 p-3 text-left',
        className,
      )}
    >
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
      <button
        type="button"
        className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline touch-manipulation"
        onClick={() => {
          haptics.light();
          navigate(href);
        }}
      >
        {cta}
        <ExternalLink className="w-3 h-3" aria-hidden />
      </button>
    </div>
  );
}

export function WiseActionChips({
  actions,
  onSendPrompt,
  className,
}: {
  actions: WiseActionDescriptor[];
  onSendPrompt?: (prompt: string) => void;
  className?: string;
}) {
  const navigate = useNavigate();
  if (actions.length === 0) return null;

  const run = (action: WiseActionDescriptor) => {
    haptics.light();
    switch (action.type) {
      case 'navigate':
      case 'focus_editor_section':
        navigate(action.href);
        break;
      case 'open_sheet':
        window.dispatchEvent(new Event(action.event));
        break;
      case 'send_prompt':
        onSendPrompt?.(action.prompt);
        break;
      default:
        break;
    }
  };

  return (
    <div className={cn('mt-2 flex flex-wrap gap-1.5', className)}>
      {actions.map((action) => (
        <button
          key={`${action.type}-${action.label}`}
          type="button"
          onClick={() => run(action)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border/60 bg-card hover:border-primary/30 hover:bg-primary/5 transition-colors touch-manipulation"
        >
          {action.type === 'send_prompt' ? (
            <Sparkles className="w-3 h-3 text-primary shrink-0" aria-hidden />
          ) : (
            <ArrowRight className="w-3 h-3 text-primary shrink-0" aria-hidden />
          )}
          {action.label}
        </button>
      ))}
    </div>
  );
}

export function parseWiseActionsBlock(content: string): {
  text: string;
  steps?: string[];
  actions?: WiseActionDescriptor[];
  linkCard?: { title: string; description: string; href: string; cta: string };
} {
  const match = content.match(/```wise-actions\s*([\s\S]*?)```/);
  if (!match) return { text: content };
  const text = content.replace(match[0], '').trim();
  try {
    const parsed = JSON.parse(match[1]) as {
      steps?: string[];
      actions?: WiseActionDescriptor[];
      linkCard?: { title: string; description: string; href: string; cta: string };
    };
    return { text, ...parsed };
  } catch {
    return { text: content };
  }
}
