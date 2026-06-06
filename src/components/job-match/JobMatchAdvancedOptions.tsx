import { useState } from 'react';
import { ChevronDown, ChevronUp, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TailorSectionId } from '@/types/resume';
import type { TailorIntensity } from '@/lib/aiTailor';

const INTENSITY_OPTIONS: { value: TailorIntensity; label: string; hint: string }[] = [
  { value: 'light',    label: 'Light',    hint: 'Minimal edits' },
  { value: 'moderate', label: 'Moderate', hint: 'Balanced' },
  { value: 'aggressive', label: 'Aggressive', hint: 'Deep rewrite' },
];

const SECTION_OPTIONS: { id: TailorSectionId; label: string }[] = [
  { id: 'summary',       label: 'Summary' },
  { id: 'skills',        label: 'Skills' },
  { id: 'experience',    label: 'Experience' },
  { id: 'education',     label: 'Education' },
  { id: 'projects',      label: 'Projects' },
  { id: 'certifications',label: 'Certifications' },
  { id: 'awards',        label: 'Awards' },
];

const CUSTOM_INSTRUCTIONS_KEY = 'wr-tailor-custom-instructions';

interface JobMatchAdvancedOptionsProps {
  intensity: TailorIntensity;
  onIntensityChange: (v: TailorIntensity) => void;
  enabledSections: TailorSectionId[];
  onSectionsChange: (sections: TailorSectionId[]) => void;
  className?: string;
}

export function JobMatchAdvancedOptions({
  intensity,
  onIntensityChange,
  enabledSections,
  onSectionsChange,
  className,
}: JobMatchAdvancedOptionsProps) {
  const [open, setOpen] = useState(false);
  const [customInstructions, setCustomInstructions] = useState(
    () => localStorage.getItem(CUSTOM_INSTRUCTIONS_KEY) || '',
  );

  const handleCustomChange = (val: string) => {
    setCustomInstructions(val);
    if (val) localStorage.setItem(CUSTOM_INSTRUCTIONS_KEY, val);
    else localStorage.removeItem(CUSTOM_INSTRUCTIONS_KEY);
  };

  const toggleSection = (id: TailorSectionId) => {
    if (enabledSections.includes(id)) {
      if (enabledSections.length > 1) {
        onSectionsChange(enabledSections.filter((s) => s !== id));
      }
    } else {
      onSectionsChange([...enabledSections, id]);
    }
  };

  return (
    <div className={cn('jmw-advanced', className)}>
      <button
        type="button"
        className="jmw-advanced__trigger"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex items-center gap-2">
          <Settings2 className="w-3.5 h-3.5" aria-hidden />
          Advanced options
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4" aria-hidden />
        ) : (
          <ChevronDown className="w-4 h-4" aria-hidden />
        )}
      </button>

      {open && (
        <div className="jmw-advanced__body">
          {/* Intensity */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Tailoring intensity</p>
            <div className="jmw-intensity-grid">
              {INTENSITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className="jmw-intensity-btn"
                  data-active={intensity === opt.value ? 'true' : 'false'}
                  onClick={() => onIntensityChange(opt.value)}
                  aria-pressed={intensity === opt.value}
                >
                  <span>{opt.label}</span>
                  <span className="text-[10px] font-normal opacity-70">{opt.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sections */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Sections to optimize</p>
            <div className="flex flex-wrap gap-1.5">
              {SECTION_OPTIONS.map((sec) => {
                const active = enabledSections.includes(sec.id);
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => toggleSection(sec.id)}
                    aria-pressed={active}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors min-h-[32px]',
                      active
                        ? 'bg-primary/12 border-primary/40 text-primary'
                        : 'bg-background/50 border-border/60 text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {sec.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom instructions */}
          <div>
            <label
              htmlFor="jmw-custom-instructions"
              className="text-xs font-semibold text-muted-foreground block mb-2"
            >
              Custom instructions{' '}
              <span className="font-normal opacity-70">(optional)</span>
            </label>
            <textarea
              id="jmw-custom-instructions"
              className="jmw-textarea"
              style={{ minHeight: '4.5rem' }}
              rows={3}
              placeholder="e.g. Emphasize leadership skills, use British English…"
              value={customInstructions}
              onChange={(e) => handleCustomChange(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
