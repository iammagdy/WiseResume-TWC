import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Brain, Compass, Sparkles } from 'lucide-react';
import wiseAiLogo from '@/assets/wise-ai-logo.png';

interface WiseAIModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WiseAIModal({ open, onOpenChange }: WiseAIModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-white/10 bg-[hsl(240_20%_6%)] text-white p-0 overflow-hidden">
        <div className="flex flex-col items-center px-6 py-8">
          {/* Animated Avatar */}
          <div className="relative w-24 h-24 mb-6">
            {/* Pulsing rings */}
            <div
              className="absolute inset-[-12px] rounded-full border border-white/10 animate-ping"
              style={{ animationDuration: '3s' }}
            />
            <div
              className="absolute inset-[-6px] rounded-full border border-white/5 animate-ping"
              style={{ animationDuration: '2s', animationDelay: '0.5s' }}
            />

            {/* Core avatar */}
            <div className="relative w-full h-full rounded-full bg-gradient-to-br from-amber-400/20 to-orange-600/20 border border-white/10 flex items-center justify-center overflow-hidden">
              <img src={wiseAiLogo} alt="Wise AI" className="w-14 h-14 object-contain" />
            </div>

            {/* Orbiting sparkles */}
            {[0, 120, 240].map((angle, i) => (
              <div
                key={i}
                className="absolute w-2 h-2"
                style={{
                  top: '50%',
                  left: '50%',
                  animation: `orbit ${3 + i}s linear infinite`,
                  transformOrigin: '0 0',
                  transform: `rotate(${angle}deg) translateX(40px)`,
                }}
              >
                <Sparkles className="w-2 h-2 text-amber-300/60" />
              </div>
            ))}
          </div>

          {/* Title */}
          <h2 className="text-xl font-display font-bold tracking-wider mb-1">
            WISE AI
          </h2>

          <p className="text-sm text-white/50 text-center mb-6">
            The omniscient guide of your universe
          </p>

          {/* Feature cards */}
          <div className="grid grid-cols-2 gap-3 w-full mb-6">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 flex flex-col items-center gap-2 text-center">
              <Compass className="w-5 h-5 text-amber-400" />
              <p className="text-[11px] text-white/70 leading-tight">Navigate your career journey</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 flex flex-col items-center gap-2 text-center">
              <Brain className="w-5 h-5 text-amber-400" />
              <p className="text-[11px] text-white/70 leading-tight">Intelligent suggestions</p>
            </div>
          </div>

          {/* Awakening indicator */}
          <div className="flex items-center gap-2 text-white/40 text-xs">
            <div className="relative flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-amber-400/60 animate-pulse" />
              <div className="absolute w-2 h-2 rounded-full bg-amber-400/30 animate-ping" />
            </div>
            Awakening Soon
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
