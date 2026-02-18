import { useLocation, useNavigate } from 'react-router-dom';
import { FileText, Globe, Home, BarChart3, Sparkles } from 'lucide-react';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { useResumeStore } from '@/store/resumeStore';
import { useAuth } from '@/hooks/useAuth';
import { useResumes } from '@/hooks/useResumes';

interface TabItem {
  path: string;
  icon?: React.ElementType;
  customIcon?: string;
  label: string;
  matchPaths?: string[];
  guarded?: boolean;
}

const tabs: TabItem[] = [
{
  path: '/dashboard',
  icon: Home,
  label: 'Home',
  matchPaths: ['/dashboard']
},
{
  path: '/editor',
  icon: FileText,
  label: 'Editor',
  matchPaths: ['/editor', '/preview'],
  guarded: true
},
{
  path: '/ai-studio',
  icon: Sparkles,
  label: 'Studio',
  matchPaths: ['/ai-studio']
},
{
  path: '/applications',
  icon: BarChart3,
  label: 'Activity',
  matchPaths: ['/applications']
},
{
  path: '/portfolio',
  icon: Globe,
  label: 'Portfolio',
  matchPaths: ['/portfolio']
}];


interface BottomTabBarProps {
  className?: string;
}

export function BottomTabBar({ className }: BottomTabBarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentResumeId = useResumeStore((s) => s.currentResumeId);
  const { user } = useAuth();
  const { data: resumes } = useResumes();

  const isActive = (tab: TabItem) => {
    if (tab.matchPaths) {
      return tab.matchPaths.some((p) => location.pathname.startsWith(p));
    }
    return location.pathname === tab.path;
  };

  const handleTabPress = (tab: TabItem) => {
    haptics.selection();
    if (tab.guarded && !currentResumeId) {
      // Navigate to most recent resume, or create dialog if none exist
      if (resumes && resumes.length > 0) {
        navigate(`/resume/${resumes[0].id}`);
      } else {
        navigate('/dashboard?action=create');
      }
      return;
    }
    navigate(tab.path);
  };

  return (
    <nav
      className={cn("fixed bottom-0 left-0 right-0 z-50 bottom-tab-bar glass-surface border-t pb-safe shadow-[0_-4px_32px_-4px_hsl(var(--background)/0.8)] pb-[5px] border-dashed border-2 border-[#200e14] rounded-3xl",



      className
      )}
      aria-label="Main navigation">

      <div
        className="flex items-center justify-around h-16 relative max-w-3xl mx-auto w-full"
        role="tablist">

        {tabs.map((tab) => {
          const active = isActive(tab);
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              role="tab"
              aria-selected={active}
              aria-label={tab.label}
              tabIndex={0}
              onClick={() => handleTabPress(tab)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full min-h-[48px]',
                'touch-manipulation active:scale-95 transition-all duration-200 touch-ripple',
                'min-w-[52px] relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset'
              )}>

              {/* Pill indicator */}
              <div
                className={cn(
                  'absolute inset-x-3 top-1 bottom-1 rounded-2xl border transition-all duration-300',
                  active ?
                  'border-primary/10 bg-primary/5 opacity-100 scale-100' :
                  'border-transparent bg-transparent opacity-0 scale-95'
                )} />


              <div className="relative z-10">
                <div
                  className={cn(
                    'transition-transform duration-200',
                    active && 'scale-110'
                  )}>

                  {tab.customIcon ?
                  <img
                    src={tab.customIcon}
                    alt={tab.label}
                    className={cn(
                      'w-7 h-7 transition-all duration-200 object-contain',
                      active ?
                      'dark:invert' :
                      'opacity-50 dark:invert dark:opacity-40'
                    )} /> :


                  <Icon
                    className={cn(
                      'w-6 h-6 sm:w-5 sm:h-5 transition-colors duration-200',
                      active ? 'text-primary' : 'text-muted-foreground'
                    )}
                    aria-hidden="true" />

                  }
                </div>
              </div>
              {!tab.customIcon &&
              <span
                className={cn(
                  'text-[11px] whitespace-nowrap relative z-10 transition-colors duration-200',
                  active ? 'text-primary font-bold' : 'text-muted-foreground font-medium'
                )}>

                  {tab.label}
                </span>
              }
            </button>);

        })}
      </div>
    </nav>);

}