import { useLocation, useNavigate } from 'react-router-dom';
import { MessageCircle, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { usePlan } from '@/hooks/usePlan';
import { useResumeStore } from '@/store/resumeStore';
import { useResumes, dbToResumeData } from '@/hooks/useResumes';
import { useWiseWorkspaceStore } from '@/store/wiseWorkspaceStore';
import {
  WORKSPACE_NAV_ITEMS,
  isWorkspaceNavActive,
} from '@/lib/wiseWorkspace/workspaceNavConfig';

interface WiseWorkspaceNavPaneProps {
  compact?: boolean;
}

export function WiseWorkspaceNavPane({ compact = false }: WiseWorkspaceNavPaneProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isPro, isLoading: planLoading } = usePlan();
  const currentResumeId = useResumeStore((s) => s.currentResumeId);
  const setCurrentResumeId = useResumeStore((s) => s.setCurrentResumeId);
  const setCurrentResume = useResumeStore((s) => s.setCurrentResume);
  const { data: resumes } = useResumes({ select: (data) => data.slice(0, 1) });
  const openChat = useWiseWorkspaceStore((s) => s.openChat);

  const handleNav = (item: (typeof WORKSPACE_NAV_ITEMS)[number]) => {
    haptics.selection();
    if (item.proGated && !planLoading && !isPro) {
      toast.info('Upgrade to Pro to unlock this feature', {
        action: { label: 'Upgrade', onClick: () => navigate('/subscription') },
      });
      navigate('/subscription');
      return;
    }
    if (item.guarded && !currentResumeId) {
      if (resumes && resumes.length > 0) {
        const latest = resumes[0];
        setCurrentResumeId(latest.$id);
        setCurrentResume(dbToResumeData(latest));
        toast.info('Loading your latest resume…');
        navigate('/editor');
      } else {
        toast.info("No resumes yet — let's create one!");
        navigate('/dashboard?action=create');
      }
      return;
    }
    navigate(item.path);
  };

  return (
    <nav className="flex flex-col flex-1 min-h-0 py-2" aria-label="Workspace navigation">
      <div className={cn('flex flex-col gap-0.5 flex-1 min-h-0 overflow-y-auto', compact ? 'px-1' : 'px-2')}>
        {WORKSPACE_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isWorkspaceNavActive(location.pathname, item);
          const locked = item.proGated && !planLoading && !isPro;
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => handleNav(item)}
              title={item.label}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'wise-workspace-nav-item flex items-center gap-2 rounded-xl transition-colors touch-manipulation min-h-[44px]',
                compact ? 'flex-col justify-center px-1 py-2 gap-1' : 'px-3 py-2.5 w-full text-left',
                active
                  ? 'bg-primary/12 text-primary font-medium border border-primary/25'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent',
              )}
            >
              <span className="relative shrink-0">
                <Icon className={cn(compact ? 'w-5 h-5' : 'w-[18px] h-[18px]')} aria-hidden />
                {locked && (
                  <Lock className="absolute -top-1 -right-1 w-2.5 h-2.5 text-amber-500" aria-hidden />
                )}
              </span>
              <span
                className={cn(
                  'leading-tight',
                  compact ? 'text-[9px] font-medium text-center max-w-[4.5rem] truncate' : 'text-[13px]',
                )}
              >
                {compact ? item.label.split(' ')[0] : item.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className={cn('shrink-0 pt-2 border-t border-border/40', compact ? 'px-1' : 'px-2')}>
        <button
          type="button"
          onClick={() => {
            haptics.light();
            openChat();
          }}
          className={cn(
            'w-full flex items-center gap-2 rounded-xl bg-primary text-primary-foreground font-medium shadow-sm touch-manipulation active:scale-[0.98] transition-transform',
            compact ? 'flex-col justify-center py-3 px-1 gap-1' : 'px-3 py-2.5 min-h-[44px]',
          )}
        >
          <MessageCircle className={cn(compact ? 'w-5 h-5' : 'w-4 h-4 shrink-0')} aria-hidden />
          <span className={cn(compact ? 'text-[9px] text-center' : 'text-sm')}>Wise AI</span>
        </button>
      </div>
    </nav>
  );
}
