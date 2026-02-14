import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { haptics } from '@/lib/haptics';
import { ExampleCard } from '@/components/examples/ExampleCard';
import { ExampleDetailSheet } from '@/components/examples/ExampleDetailSheet';
import { UseTemplateSheet } from '@/components/examples/UseTemplateSheet';
import { ExampleIdeasSheet } from '@/components/examples/ExampleIdeasSheet';
import { resumeExamples } from '@/lib/resumeExamples';
import { INDUSTRIES, EXPERIENCE_LEVELS } from '@/types/resumeExamples';
import type { ResumeExample, Industry, ExperienceLevel } from '@/types/resumeExamples';

const PAGE_SIZE = 10;

export default function ExamplesPage() {
  const navigate = useNavigate();
  const [selectedIndustry, setSelectedIndustry] = useState<Industry | 'All'>('All');
  const [selectedLevel, setSelectedLevel] = useState<ExperienceLevel | 'All'>('All');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [detailExample, setDetailExample] = useState<ResumeExample | null>(null);
  const [useExample, setUseExample] = useState<ResumeExample | null>(null);
  const [ideasExample, setIdeasExample] = useState<ResumeExample | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    return resumeExamples.filter(ex => {
      if (selectedIndustry !== 'All' && ex.industry !== selectedIndustry) return false;
      if (selectedLevel !== 'All' && ex.experienceLevel !== selectedLevel) return false;
      return true;
    });
  }, [selectedIndustry, selectedLevel]);

  const visible = filtered.slice(0, visibleCount);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && visibleCount < filtered.length) {
          setVisibleCount(c => Math.min(c + PAGE_SIZE, filtered.length));
        }
      },
      { rootMargin: '200px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [visibleCount, filtered.length]);

  // Reset visible count on filter change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [selectedIndustry, selectedLevel]);

  const handleView = useCallback((ex: ResumeExample) => setDetailExample(ex), []);
  const handleUseTemplate = useCallback((ex: ResumeExample) => {
    setDetailExample(null);
    setUseExample(ex);
  }, []);
  const handleGetIdeas = useCallback((ex: ResumeExample) => {
    setDetailExample(null);
    setIdeasExample(ex);
  }, []);

  return (
    <div className="min-h-full flex flex-col">
      {/* Header */}
      <header className="pt-safe pt-3 pb-2 px-4 flex items-center gap-3 glass-header">
        <button
          onClick={() => { haptics.light(); navigate('/dashboard'); }}
          className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-full touch-manipulation active:scale-90"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-fluid-lg font-bold text-foreground">Resume Examples</h1>
      </header>

      {/* Industry filter chips */}
      <div className="px-4 pt-3 pb-1 overflow-x-auto scrollbar-none" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="flex gap-2 w-max">
          <FilterChip label="All" active={selectedIndustry === 'All'} onTap={() => setSelectedIndustry('All')} />
          {INDUSTRIES.map(ind => (
            <FilterChip key={ind} label={ind} active={selectedIndustry === ind} onTap={() => setSelectedIndustry(ind)} />
          ))}
        </div>
      </div>

      {/* Level filter chips */}
      <div className="px-4 pt-1 pb-3 overflow-x-auto scrollbar-none" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="flex gap-2 w-max">
          <FilterChip label="All Levels" active={selectedLevel === 'All'} onTap={() => setSelectedLevel('All')} />
          {EXPERIENCE_LEVELS.map(lv => (
            <FilterChip key={lv.value} label={lv.label} active={selectedLevel === lv.value} onTap={() => setSelectedLevel(lv.value)} />
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-safe min-h-0">
        <p className="text-xs text-muted-foreground mb-3">{filtered.length} example{filtered.length !== 1 ? 's' : ''}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {visible.map((ex, i) => (
            <motion.div
              key={ex.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.25 }}
            >
              <ExampleCard example={ex} onView={handleView} onUseTemplate={handleUseTemplate} />
            </motion.div>
          ))}
        </div>
        <div ref={sentinelRef} className="h-4" />
      </div>

      {/* Sheets */}
      <ExampleDetailSheet
        example={detailExample}
        open={!!detailExample}
        onOpenChange={(o) => !o && setDetailExample(null)}
        onUseTemplate={handleUseTemplate}
        onGetIdeas={handleGetIdeas}
      />
      <UseTemplateSheet
        example={useExample}
        open={!!useExample}
        onOpenChange={(o) => !o && setUseExample(null)}
      />
      <ExampleIdeasSheet
        example={ideasExample}
        open={!!ideasExample}
        onOpenChange={(o) => !o && setIdeasExample(null)}
      />
    </div>
  );
}

function FilterChip({ label, active, onTap }: { label: string; active: boolean; onTap: () => void }) {
  return (
    <button
      onClick={() => { haptics.selection(); onTap(); }}
      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors touch-manipulation active:scale-95
        ${active ? 'bg-primary text-primary-foreground' : 'glass-surface text-muted-foreground'}`}
      style={{ touchAction: 'pan-y' }}
    >
      {label}
    </button>
  );
}
