import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface MobileLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  headerTitle?: string;
  onBack?: () => void;
}

export function MobileLayout({ 
  children, 
  showHeader = false, 
  headerTitle,
  onBack 
}: MobileLayoutProps) {
  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col bg-background">
      {showHeader && (
        <motion.header 
          className="sticky top-0 z-50 glass border-b border-border px-4 py-3 pt-safe"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
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
        </motion.header>
      )}
      
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-safe">
        {children}
      </main>
    </div>
  );
}
