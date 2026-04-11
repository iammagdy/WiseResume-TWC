import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { haptics } from '@/lib/haptics';

export type ScrollEffect = 'fade' | 'parallax' | 'tilt-3d' | 'cinematic';

interface ScrollEffectOption {
  id: ScrollEffect;
  label: string;
  description: string;
  preview: React.FC;
}

function FadePreview() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep(s => (s + 1) % 4), 700);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="w-full h-full flex flex-col justify-end gap-1 p-1.5">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          animate={{ opacity: step > i ? 1 : 0.1, y: step > i ? 0 : 6 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="rounded h-2"
          style={{ background: 'var(--pf-accent, #e84545)', opacity: 0.1, height: i === 0 ? 10 : 6 }}
        />
      ))}
    </div>
  );
}

function ParallaxPreview() {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    let dir = 1;
    const id = setInterval(() => {
      setOffset(v => {
        const next = v + dir * 0.8;
        if (next > 8 || next < -8) dir *= -1;
        return next;
      });
    }, 30);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="w-full h-full flex flex-col justify-center gap-1.5 p-1.5 overflow-hidden">
      {[0, 0.5, 1].map((factor, i) => (
        <motion.div
          key={i}
          animate={{ y: offset * factor }}
          className="rounded"
          style={{ background: `var(--pf-accent, #e84545)`, opacity: 0.3 + factor * 0.5, height: i === 1 ? 10 : 6 }}
        />
      ))}
    </div>
  );
}

function Tilt3DPreview() {
  const [angle, setAngle] = useState(0);
  useEffect(() => {
    let t = 0;
    const id = setInterval(() => {
      t += 0.05;
      setAngle(Math.sin(t) * 12);
    }, 30);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="w-full h-full flex items-center justify-center p-2" style={{ perspective: 200 }}>
      <motion.div
        animate={{ rotateY: angle, rotateX: angle * 0.4 }}
        style={{ width: '80%', height: '55%', borderRadius: 6, background: 'var(--pf-accent, #e84545)', opacity: 0.75 }}
      />
    </div>
  );
}

function CinematicPreview() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPhase(p => (p + 1) % 3), 900);
    return () => clearInterval(id);
  }, []);

  const variants = [
    { x: -20, y: 0, scale: 0.9, opacity: 0 },
    { x: 0, y: 0, scale: 1, opacity: 1 },
    { x: 20, y: 0, scale: 0.9, opacity: 0 },
  ] as const;

  return (
    <div className="w-full h-full flex items-center justify-center p-2 overflow-hidden">
      <motion.div
        animate={variants[phase]}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
        style={{ width: '80%', height: '55%', borderRadius: 6, background: 'var(--pf-accent, #e84545)', opacity: 0.75 }}
      />
    </div>
  );
}

const EFFECTS: ScrollEffectOption[] = [
  {
    id: 'fade',
    label: 'Smooth Fade',
    description: 'Content fades in as it enters the viewport.',
    preview: FadePreview,
  },
  {
    id: 'parallax',
    label: 'Parallax Drift',
    description: 'Sections shift at different scroll speeds for depth.',
    preview: ParallaxPreview,
  },
  {
    id: 'tilt-3d',
    label: '3D Tilt Cards',
    description: 'Cards rotate in 3D as they scroll into view.',
    preview: Tilt3DPreview,
  },
  {
    id: 'cinematic',
    label: 'Cinematic Reveal',
    description: 'Sections slide and scale in like a film sequence.',
    preview: CinematicPreview,
  },
];

interface ScrollEffectPickerProps {
  value: ScrollEffect;
  onChange: (val: ScrollEffect) => void;
}

export function ScrollEffectPicker({ value, onChange }: ScrollEffectPickerProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {EFFECTS.map(effect => {
        const PreviewComponent = effect.preview;
        const isSelected = value === effect.id;
        return (
          <button
            key={effect.id}
            onClick={() => { haptics.light(); onChange(effect.id); }}
            className={`flex flex-col rounded-xl border transition-all active:scale-95 overflow-hidden text-left min-h-[44px] touch-manipulation ${
              isSelected ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-border/80'
            }`}
          >
            <div
              className="w-full h-16 relative overflow-hidden"
              style={{ background: 'var(--pf-bg, rgba(0,0,0,0.1))' }}
            >
              <PreviewComponent />
              {isSelected && (
                <div
                  className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-white"
                  style={{ background: 'var(--primary, #e84545)', fontSize: 9 }}
                >
                  ✓
                </div>
              )}
            </div>
            <div className="px-2 py-1.5">
              <p className="text-xs font-semibold leading-tight">{effect.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{effect.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
