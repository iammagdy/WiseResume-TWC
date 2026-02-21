import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Loader2, FileText, GitBranch, Target, X } from 'lucide-react';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface FloatingCreateButtonProps {
  onClick: () => void;
  onTailor?: () => void;
  onAnalyzeJob?: () => void;
  pulse?: boolean;
  isLoading?: boolean;
}

const menuItems = [
  { id: 'new', icon: FileText, label: 'New Resume', action: 'onClick' as const },
  { id: 'tailor', icon: GitBranch, label: 'Tailor Resume', action: 'onTailor' as const },
  { id: 'analyze', icon: Target, label: 'Analyze Job', action: 'onAnalyzeJob' as const },
];

export function FloatingCreateButton({ onClick, onTailor, onAnalyzeJob, pulse = false, isLoading = false }: FloatingCreateButtonProps) {
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [menuOpen]);

  const handleAction = (action: 'onClick' | 'onTailor' | 'onAnalyzeJob') => {
    haptics.medium();
    setMenuOpen(false);
    if (action === 'onClick') onClick();
    else if (action === 'onTailor') onTailor?.();
    else if (action === 'onAnalyzeJob') onAnalyzeJob?.();
  };

  const handleFabTap = () => {
    if (isLoading) return;
    haptics.medium();
    if (isMobile) {
      setMenuOpen(prev => !prev);
    } else {
      onClick();
    }
  };

  return createPortal(
    <div ref={containerRef} className="fixed bottom-[7rem] sm:bottom-20 right-4 pr-safe z-50" style={{ zIndex: 50 }}>
      {/* Popup menu (mobile only) */}
      <AnimatePresence>
        {menuOpen && isMobile && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/60 backdrop-blur-sm -z-10"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="absolute bottom-[calc(100%+12px)] right-0 flex flex-col items-end gap-3"
            >
            {menuItems.map((item, index) => (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  'flex items-center gap-2.5 touch-manipulation',
                  'active:scale-95 transition-transform'
                )}
                onClick={() => handleAction(item.action)}
              >
                <span className="text-xs font-medium text-foreground bg-popover/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-border shadow-lg whitespace-nowrap">
                  {item.label}
                </span>
                <span className="w-12 h-12 rounded-full gradient-primary border border-primary/20 flex items-center justify-center shadow-lg">
                  <item.icon className="w-5 h-5 text-primary-foreground" />
                </span>
              </motion.button>
            ))}
          </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* FAB */}
      <motion.button
        className={cn(
          // Mobile: circle only. Desktop: pill with text
          isMobile
            ? 'h-14 w-14 rounded-full'
            : 'h-14 px-5 rounded-full',
          'gradient-primary backdrop-blur-md border border-primary/20 flex items-center justify-center gap-2 touch-manipulation',
          isLoading && 'pointer-events-none opacity-90'
        )}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.3 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleFabTap}
        style={{
          boxShadow: '0 6px 24px -6px hsl(var(--primary) / 0.4)',
        }}
        aria-label={menuOpen ? 'Close menu' : 'Create new resume'}
      >
        {pulse && !isLoading && !menuOpen && (
          <motion.span
            className="absolute inset-0 rounded-full border-2 border-primary/50"
            animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          />
        )}
        {isLoading ? (
          <Loader2 className="w-6 h-6 text-primary-foreground relative z-10 animate-spin" />
        ) : menuOpen && isMobile ? (
          <X className="w-6 h-6 text-primary-foreground relative z-10" />
        ) : (
          <Plus className="w-6 h-6 text-primary-foreground relative z-10" />
        )}
        {!isMobile && (
          <span className="text-sm font-semibold text-primary-foreground relative z-10">
            {isLoading ? 'Creating…' : 'New Resume'}
          </span>
        )}
      </motion.button>
    </div>,
    document.body
  );
}
