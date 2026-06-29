import { memo, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutTemplate, BookOpen, Map, Users, ChevronRight } from 'lucide-react';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { useLocale } from '@/i18n/LocaleProvider';

interface DashboardDiscoverySectionProps {
  className?: string;
  /** Tighter layout for the dashboard workspace column */
  compact?: boolean;
}

export const DashboardDiscoverySection = memo(function DashboardDiscoverySection({
  className,
  compact = false,
}: DashboardDiscoverySectionProps) {
  const navigate = useNavigate();
  const { t } = useLocale();

  const exploreLinks = useMemo(() => [
    {
      icon: LayoutTemplate,
      label: t('app.templates', 'Templates'),
      description: t('app.dashboardPage.explore.templatesDesc', 'ATS-ready resume layouts'),
      path: '/templates',
    },
    {
      icon: BookOpen,
      label: t('app.examples', 'Examples'),
      description: t('app.dashboardPage.explore.examplesDesc', 'Proven resume samples'),
      path: '/examples',
    },
    {
      icon: Map,
      label: t('app.guides', 'Guides'),
      description: t('app.dashboardPage.explore.guidesDesc', 'Job search playbooks'),
      path: '/guides',
    },
    {
      icon: Users,
      label: t('app.referral', 'Referral'),
      description: t('app.dashboardPage.explore.referralDesc', 'Invite friends, earn credits'),
      path: '/referral',
    },
  ], [t]);

  return (
    <section
      className={cn(
        'dashboard-discovery border-t border-border/25',
        compact ? 'dashboard-discovery--compact pt-2.5 mt-2' : 'pt-4 mt-2',
        className,
      )}
      data-section="dashboard-discovery-content"
      aria-label={t('app.dashboardPage.explore.exploreAria', 'Explore')}
    >
      <div
        className={cn(
          'dashboard-discovery__head flex items-center justify-between gap-3',
          compact ? 'mb-2' : 'mb-3',
        )}
      >
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {t('app.dashboardPage.explore.exploreTitle', 'Explore')}
          </p>
          {!compact && (
            <p className="text-xs text-muted-foreground mt-1 leading-snug">
              {t('app.dashboardPage.explore.exploreSubtitle', 'Resources to strengthen your resumes and applications')}
            </p>
          )}
        </div>
      </div>

      <div
        data-section="dashboard-explore"
        className={cn(
          'grid grid-cols-2 gap-2',
          compact ? 'sm:grid-cols-4' : 'gap-2.5 lg:grid-cols-4',
        )}
      >
        {exploreLinks.map(({ icon: Icon, label, description, path }) => (
          <button
            key={label}
            type="button"
            onClick={() => {
              haptics.light();
              navigate(path);
            }}
            className={cn(
              'dashboard-explore-card group flex flex-col items-start text-left touch-manipulation active:scale-[0.99] transition-all w-full rounded-2xl',
              compact
                ? 'gap-1.5 p-2.5 min-h-[4.25rem]'
                : 'gap-2.5 p-3.5 min-h-[5.5rem]',
            )}
            data-track={`dashboard-explore-${label.toLowerCase()}`}
          >
            <span
              className={cn(
                'dashboard-explore-card__icon flex items-center justify-center rounded-xl shrink-0',
                compact ? 'w-8 h-8' : 'w-9 h-9',
              )}
            >
              <Icon className={cn('text-primary', compact ? 'w-3.5 h-3.5' : 'w-4 h-4')} aria-hidden />
            </span>
            <span className="min-w-0 flex-1 w-full">
              <span className="flex items-center justify-between gap-1">
                <span
                  className={cn(
                    'font-medium text-foreground group-hover:text-foreground',
                    compact ? 'text-xs' : 'text-sm',
                  )}
                >
                  {label}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
              </span>
              <span
                className={cn(
                  'text-muted-foreground leading-snug',
                  compact ? 'text-[10px] mt-0.5 line-clamp-1' : 'text-[11px] mt-0.5 line-clamp-2',
                )}
              >
                {description}
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
});
