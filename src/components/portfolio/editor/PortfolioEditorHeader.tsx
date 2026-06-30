import { ExternalLink, Globe } from 'lucide-react';
import { BackButton } from '@/components/ui/BackButton';
import { cn } from '@/lib/utils';
import { useLocale } from '@/i18n/LocaleProvider';

interface PortfolioEditorHeaderProps {
  onBeforeBack?: () => boolean;
  portfolioEnabled: boolean;
  portfolioCanonicalUrl: string | null;
  className?: string;
}

export function PortfolioEditorHeader({
  onBeforeBack,
  portfolioEnabled,
  portfolioCanonicalUrl,
  className,
}: PortfolioEditorHeaderProps) {
  const { t } = useLocale();

  return (
    <header
      className={cn(
        'portfolio-editor-header shrink-0 border-b border-border/70 bg-card/90 backdrop-blur-md',
        className,
      )}
    >
      <div className="flex items-center gap-3 px-4 sm:px-6 h-14 lg:h-16 max-w-6xl mx-auto w-full">
        <BackButton onBeforeBack={onBeforeBack} />
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
          <Globe className="w-5 h-5 text-primary" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/80 leading-none">
            {t('app.portfolioEditor.header.eyebrow', 'الملف العام')}
          </p>
          <h1 className="text-base sm:text-lg font-semibold text-foreground truncate leading-tight mt-1">
            {t('app.portfolioEditor.header.title', 'استوديو الملف العام')}
          </h1>
        </div>
        {portfolioEnabled && portfolioCanonicalUrl && (
          <a
            href={portfolioCanonicalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'inline-flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-xl text-xs font-semibold',
              'border border-primary/25 bg-primary/5 text-primary',
              'hover:bg-primary/10 transition-colors',
            )}
            title={t('app.portfolioEditor.header.viewTitle', 'عرض الملف العام')}
          >
            <ExternalLink className="w-3.5 h-3.5" aria-hidden />
            <span className="hidden sm:inline">
              {t('app.portfolioEditor.header.viewLive', 'عرض المباشر')}
            </span>
          </a>
        )}
      </div>
    </header>
  );
}
