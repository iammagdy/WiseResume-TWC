import { useLocation } from 'react-router-dom';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';
import { getPageTitle } from '@/lib/pageTitles';
import { ShellBrand } from './ShellBrand';
import { ShellCommandSearch } from './ShellCommandSearch';

/**
 * Premium compact top bar for mobile workspace routes (dashboard uses its own header).
 */
export function MobileTopBar() {
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const pageTitle = getPageTitle(location.pathname);
  const showBreadcrumb = pageTitle && pageTitle !== 'Dashboard';

  return (
    <header className="lg:hidden relative h-14 min-h-[56px] app-shell-nav shrink-0 z-40">
      <GlassSurface className="absolute inset-0 app-shell-nav-glass" blur={16} saturate={155} />
      <div className="relative z-[1] flex items-center gap-2.5 px-4 pt-safe h-full">
        <ShellBrand compact />
        {showBreadcrumb ? (
          <p className="flex-1 min-w-0 truncate text-sm font-semibold text-foreground">
            {pageTitle}
          </p>
        ) : (
          <span className="flex-1 min-w-0 text-xs font-medium text-muted-foreground truncate">
            Workspace
          </span>
        )}
        <ShellCommandSearch compact />
        <button
          type="button"
          onClick={toggleTheme}
          className="relative flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors active:scale-95 touch-manipulation"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <Sun
            className={`w-4 h-4 transition-all duration-200 ${isDark ? 'opacity-100 rotate-0' : 'opacity-0 rotate-90 scale-0'}`}
          />
          <Moon
            className={`w-4 h-4 absolute transition-all duration-200 ${isDark ? 'opacity-0 -rotate-90 scale-0' : 'opacity-100 rotate-0'}`}
          />
        </button>
      </div>
    </header>
  );
}
