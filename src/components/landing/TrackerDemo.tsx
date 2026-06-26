import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useInView } from '@/hooks/useInView';

const COLUMNS = ['Applied', 'Interview', 'Offer'] as const;
type Column = typeof COLUMNS[number];

interface Card {
  id: string;
  company: string;
  role: string;
  col: Column;
  color: string;
}

const INITIAL_CARDS: Card[] = [
  { id: 'a', company: 'Acme Corp', role: 'PM', col: 'Applied', color: 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300' },
  { id: 'b', company: 'Globex', role: 'Lead', col: 'Applied', color: 'bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300' },
  { id: 'c', company: 'Initech', role: 'Senior', col: 'Interview', color: 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300' },
];

const MOVES: Array<{ id: string; to: Column }> = [
  { id: 'a', to: 'Interview' },
  { id: 'b', to: 'Interview' },
  { id: 'c', to: 'Offer' },
  { id: 'a', to: 'Offer' },
];

export function TrackerDemo() {
  const prefersReducedMotion = useReducedMotion();
  const [cards, setCards] = useState<Card[]>(INITIAL_CARDS);
  const [moveIdx, setMoveIdx] = useState(0);
  const { ref, inView } = useInView({ threshold: 0.05, triggerOnce: false });

  useEffect(() => {
    if (prefersReducedMotion || !inView) return;
    const t = setTimeout(() => {
      if (moveIdx < MOVES.length) {
        const move = MOVES[moveIdx];
        setCards((prev) => prev.map((c) => c.id === move.id ? { ...c, col: move.to } : c));
        setMoveIdx((i) => i + 1);
      } else {
        setTimeout(() => {
          setCards(INITIAL_CARDS);
          setMoveIdx(0);
        }, 1800);
      }
    }, moveIdx === 0 ? 1000 : 900);
    return () => clearTimeout(t);
  }, [moveIdx, inView, prefersReducedMotion]);

  const colColors: Record<Column, string> = {
    Applied: 'text-blue-600 dark:text-blue-400',
    Interview: 'text-amber-600 dark:text-amber-400',
    Offer: 'text-emerald-600 dark:text-emerald-400',
  };

  return (
    <div ref={ref} className="flex flex-col items-center">
      <div className="w-[260px] rounded-[28px] border-2 border-border bg-card shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-2 pb-1">
          <span className="text-[10px] text-muted-foreground font-medium">9:41</span>
          <div className="w-3.5 h-2 rounded-sm border border-muted-foreground/40 relative">
            <div className="absolute inset-[1px] right-[2px] rounded-[1px] bg-muted-foreground/50" />
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-1.5 border-b border-border">
          <span className="text-[11px] font-semibold text-foreground">Job Tracker</span>
          <span className="text-[8px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground uppercase tracking-wider">Example</span>
        </div>

        <div className="px-3 py-3 min-h-[200px]">
          <div className="grid grid-cols-3 gap-1.5">
            {COLUMNS.map((col) => (
              <div key={col} className="flex flex-col gap-1.5">
                <p className={`text-[8px] font-semibold uppercase tracking-wider text-center pb-1 ${colColors[col]}`}>
                  {col}
                </p>
                <div className="min-h-[120px] flex flex-col gap-1.5">
                  <AnimatePresence>
                    {cards.filter((c) => c.col === col).map((card) => (
                      <motion.div
                        key={card.id}
                        layout
                        initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.85 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className={`rounded-lg border p-1.5 ${card.color}`}
                      >
                        <p className="text-[9px] font-semibold leading-none">{card.company}</p>
                        <p className="text-[8px] opacity-70 mt-0.5">{card.role}</p>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
