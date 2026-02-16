import { ReactNode, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { OfflineBanner } from './OfflineBanner';
import { BottomTabBar } from './BottomTabBar';
import { useKeyboardAwareScroll } from '@/hooks/useKeyboardAwareScroll';

interface MobileLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  headerTitle?: string;
  onBack?: () => void;
  showBottomNav?: boolean;
  headerRight?: ReactNode;
   /** Add extra bottom padding for floating action buttons */
   hasFloatingAction?: boolean;
}

export function MobileLayout({ 
  children, 
  showHeader = false, 
  headerTitle,
  onBack,
  showBottomNav = false,
  headerRight,
   hasFloatingAction = false,
}: MobileLayoutProps) {
  const mainRef = useRef<HTMLElement>(null);

  useKeyboardAwareScroll();

  // Auto-scroll to focused input
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    };

    document.addEventListener('focusin', handleFocus);
    return () => document.removeEventListener('focusin', handleFocus);
  }, []);

  // Dismiss keyboard on background tap
  const handleBackgroundClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName !== 'INPUT' && 
      target.tagName !== 'TEXTAREA' &&
      !target.closest('button')
    ) {
      (document.activeElement as HTMLElement)?.blur?.();
    }
  };

  return (
    <div 
      className="h-[100dvh] overflow-hidden flex flex-col bg-background"
      onClick={handleBackgroundClick}
    >
      {/* Offline indicator */}
      <OfflineBanner />
      
      {showHeader && (
        <header 
          className="sticky top-0 z-50 glass border-b border-border px-4 py-3 pt-safe"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {onBack && (
                <button 
                  onClick={onBack}
                  className="p-3 -ml-3 rounded-full hover:bg-muted active:scale-95 transition-all touch-manipulation min-w-[48px] min-h-[48px] flex items-center justify-center"
                  aria-label="Go back"
                >
                  <svg 
                    className="w-6 h-6" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M15 19l-7-7 7-7" 
                    />
                  </svg>
                </button>
              )}
              {headerTitle && (
                <h1 className="text-lg font-display font-semibold truncate">
                  {headerTitle}
                </h1>
              )}
            </div>
            {headerRight && (
              <div className="flex items-center gap-2">
                {headerRight}
              </div>
            )}
          </div>
        </header>
      )}
      
       <main
        ref={mainRef}
         className={cn(
           "flex-1 overflow-y-auto overflow-x-hidden",
           showBottomNav && "pb-20",
           hasFloatingAction && "pb-24",
           !showBottomNav && !hasFloatingAction && "pb-safe"
         )}
         style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
      >
        {children}
      </main>
      
      {showBottomNav && <BottomTabBar />}
    </div>
  );
}
