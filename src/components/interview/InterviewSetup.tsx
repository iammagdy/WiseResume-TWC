import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, FileText, AlertCircle, Sparkles, Rocket, User, UserRound, Zap, Mic, CheckCircle2, XCircle, Building2, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import type { VoiceGender } from '@/hooks/useVoiceInterview';
import { CompanyBriefingSheet } from './CompanyBriefingSheet';

type InterviewMode = 'general' | 'job-targeted' | 'quick-practice';

interface InterviewSetupProps {
  hasResume: boolean;
  speechSupported: boolean;
  speechRecognitionAvailable: boolean;
  voiceGender: VoiceGender;
  onVoiceGenderChange: (gender: VoiceGender) => void;
  onStart: (jobDescription?: string, options?: { quickPractice?: boolean }) => void;
  resumeData?: {
    summary?: string;
    experience?: Array<{ position?: string; company?: string }>;
    skills?: Array<{ name?: string; skill?: string } | string>;
  };
}

export function InterviewSetup({ hasResume, speechSupported, speechRecognitionAvailable, voiceGender, onVoiceGenderChange, onStart, resumeData }: InterviewSetupProps) {
  const [mode, setMode] = useState<InterviewMode>(() => {
    const saved = localStorage.getItem('wiseresume_interview_mode');
    return (saved === 'general' || saved === 'job-targeted' || saved === 'quick-practice') ? saved : 'general';
  });
  const micResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [micTestStatus, setMicTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [micLevel, setMicLevel] = useState(0);
  const [showBriefing, setShowBriefing] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const handleStart = () => {
    if (mode === 'job-targeted' && !jobDescription.trim()) {
      setShowValidation(true);
      haptics.light();
      return;
    }
    haptics.medium();
    if (mode === 'job-targeted') {
      onStart(jobDescription);
    } else if (mode === 'quick-practice') {
      onStart(undefined, { quickPractice: true });
    } else {
      onStart(undefined);
    }
  };

  const handleModeChange = (newMode: InterviewMode) => {
    haptics.selection();
    setMode(newMode);
    localStorage.setItem('wiseresume_interview_mode', newMode);
  };

  const handleVoiceChange = (gender: VoiceGender) => {
    haptics.selection();
    onVoiceGenderChange(gender);
    localStorage.setItem('wiseresume_interview_voice', gender);
  };

  // Auto-reset mic test after success/failure
  useEffect(() => {
    if (micTestStatus === 'success' || micTestStatus === 'failed') {
      micResetTimerRef.current = setTimeout(() => setMicTestStatus('idle'), 3000);
    }
    return () => {
      if (micResetTimerRef.current) clearTimeout(micResetTimerRef.current);
    };
  }, [micTestStatus]);

  const handleMicTest = useCallback(async () => {
    setMicTestStatus('testing');
    setMicLevel(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let maxLevel = 0;
      const startTime = Date.now();
      const tick = () => {
        if (Date.now() - startTime > 3000) {
          stream.getTracks().forEach(t => t.stop());
          ctx.close().catch(() => {});
          setMicTestStatus(maxLevel > 0.05 ? 'success' : 'failed');
          setMicLevel(0);
          return;
        }
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length / 255;
        const level = Math.min(1, avg * 3);
        if (level > maxLevel) maxLevel = level;
        setMicLevel(level);
        requestAnimationFrame(tick);
      };
      tick();
    } catch {
      setMicTestStatus('failed');
      setMicLevel(0);
    }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-6 px-4 py-6 max-w-lg mx-auto"
    >
      {/* Premium glowing orb header */}
      <div className="text-center space-y-4">
        <div className="relative w-28 h-28 mx-auto">
          {/* Outer glow */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle, hsl(var(--primary) / 0.5) 0%, transparent 70%)',
            }}
            animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* Inner glow */}
          <motion.div
            className="absolute inset-2 rounded-full"
            style={{
              background: 'radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 60%)',
            }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          />
          {/* Rotating ring */}
          <motion.div
            className="absolute inset-3 rounded-full"
            style={{
              background: 'conic-gradient(from 0deg, hsl(var(--primary) / 0.4), transparent, hsl(var(--primary) / 0.4))',
              WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #fff calc(100% - 2px))',
              mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #fff calc(100% - 2px))',
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          />
          {/* Center orb */}
          <div className="absolute inset-5 rounded-full bg-gradient-to-br from-primary/40 to-primary/15 backdrop-blur-xl border border-primary/40 flex items-center justify-center shadow-[0_0_40px_hsl(var(--primary)/0.3)]">
            <motion.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Sparkles className="w-8 h-8 text-primary" />
            </motion.div>
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-foreground">Wise AI Interview</h2>
          <p className="text-sm text-muted-foreground">
            Practice with your intelligent interview coach
          </p>
        </div>
        <div 
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/15 border border-primary/30 cursor-default select-none pointer-events-none"
        >
          <Zap className="w-3 h-3 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
            AI-Powered Feedback
          </span>
        </div>
      </div>

      {!speechRecognitionAvailable && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-start gap-3 p-4 rounded-2xl bg-[hsl(45_90%_50%/0.1)] border border-[hsl(45_90%_50%/0.3)] text-foreground text-sm backdrop-blur-xl"
        >
          <Keyboard className="w-4 h-4 mt-0.5 shrink-0 text-[hsl(45_90%_50%)]" />
          <p>Voice input is not available on this device. You can type your answers during the interview using the text input button.</p>
        </motion.div>
      )}

      {speechRecognitionAvailable && !speechSupported && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-start gap-3 p-4 rounded-2xl bg-muted/40 border border-border/40 text-muted-foreground text-sm backdrop-blur-xl"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <p>Microphone access is required for voice interviews. You can also use the text input fallback.</p>
        </motion.div>
      )}

      {!hasResume && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-start gap-3 p-4 rounded-2xl bg-muted/40 border border-border/40 text-muted-foreground text-sm backdrop-blur-xl"
        >
          <FileText className="w-4 h-4 mt-0.5 shrink-0" />
          <p>No resume loaded. Wise AI will ask general questions. Load a resume for personalized questions.</p>
        </motion.div>
      )}

      {/* Voice Gender Toggle */}
      <div className="space-y-2.5">
        <p className="text-sm font-semibold text-foreground">AI Voice</p>
        <div className="flex rounded-2xl border border-border/40 bg-card/60 backdrop-blur-xl overflow-hidden shadow-[0_4px_20px_hsl(var(--primary)/0.05)]">
          <button
            onClick={() => handleVoiceChange('female')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 min-h-[44px] py-3 text-sm transition-colors duration-200 ease-in-out touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              voiceGender === 'female'
                ? 'bg-primary text-primary-foreground font-semibold'
                : 'bg-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <UserRound className="w-4 h-4" />
            Female
          </button>
          <button
            onClick={() => handleVoiceChange('male')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 min-h-[44px] py-3 text-sm transition-colors duration-200 ease-in-out touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              voiceGender === 'male'
                ? 'bg-primary text-primary-foreground font-semibold'
                : 'bg-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <User className="w-4 h-4" />
            Male
          </button>
        </div>

        {/* Mic Test Button - only show when speech recognition is available */}
        {speechRecognitionAvailable && (
        <div className="mt-3">
          <button
            onClick={handleMicTest}
            disabled={micTestStatus === 'testing'}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all touch-manipulation w-full justify-center',
              micTestStatus === 'idle' && 'bg-muted/40 border border-border/40 text-muted-foreground hover:border-primary/40 hover:text-foreground',
              micTestStatus === 'testing' && 'bg-primary/10 border border-primary/30 text-primary',
              micTestStatus === 'success' && 'bg-[hsl(142_70%_50%/0.1)] border border-[hsl(142_70%_50%/0.3)] text-[hsl(142_70%_50%)]',
              micTestStatus === 'failed' && 'bg-destructive/10 border border-destructive/30 text-destructive',
            )}
          >
            {micTestStatus === 'idle' && <><Mic className="w-4 h-4" /> Test Microphone</>}
            {micTestStatus === 'testing' && (
              <>
                <Mic className="w-4 h-4" />
                Testing...
                <div className="flex items-end gap-[2px] h-3 ml-1">
                  {[0.2, 0.4, 0.6, 0.4, 0.2].map((t, i) => (
                    <motion.div
                      key={i}
                      className="w-[2px] rounded-full bg-primary"
                      animate={{ height: micLevel > t ? `${4 + micLevel * 8}px` : '2px' }}
                      transition={{ duration: 0.1 }}
                    />
                  ))}
                </div>
              </>
            )}
            {micTestStatus === 'success' && <><CheckCircle2 className="w-4 h-4" /> Microphone working!</>}
            {micTestStatus === 'failed' && <><XCircle className="w-4 h-4" /> Microphone not detected</>}
          </button>
          <AnimatePresence>
            {micTestStatus === 'failed' && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-[11px] text-muted-foreground mt-1.5 text-center"
              >
                You can still use the Type button during the interview.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-foreground">Interview Mode</p>
        <div className="grid grid-cols-3 gap-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => handleModeChange('general')}
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all touch-manipulation backdrop-blur-xl',
              mode === 'general'
                ? 'border-primary/60 bg-primary/15 shadow-[0_0_25px_hsl(var(--primary)/0.2)]'
                : 'border-border/40 bg-card/60 hover:border-primary/40 hover:bg-primary/5'
            )}
          >
            <div className={cn(
              'p-2.5 rounded-xl transition-all',
              mode === 'general' ? 'bg-primary/20' : 'bg-muted/40'
            )}>
              <FileText className={cn('w-5 h-5', mode === 'general' ? 'text-primary' : 'text-muted-foreground')} />
            </div>
            <div className="text-center">
              <span className={cn('text-xs font-bold block', mode === 'general' ? 'text-primary' : 'text-foreground')}>
                General
              </span>
              <span className="text-[10px] text-muted-foreground">Based on CV</span>
            </div>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => handleModeChange('job-targeted')}
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all touch-manipulation backdrop-blur-xl',
              mode === 'job-targeted'
                ? 'border-primary/60 bg-primary/15 shadow-[0_0_25px_hsl(var(--primary)/0.2)]'
                : 'border-border/40 bg-card/60 hover:border-primary/40 hover:bg-primary/5'
            )}
          >
            <div className={cn(
              'p-2.5 rounded-xl transition-all',
              mode === 'job-targeted' ? 'bg-primary/20' : 'bg-muted/40'
            )}>
              <Briefcase className={cn('w-5 h-5', mode === 'job-targeted' ? 'text-primary' : 'text-muted-foreground')} />
            </div>
            <div className="text-center">
              <span className={cn('text-xs font-bold block', mode === 'job-targeted' ? 'text-primary' : 'text-foreground')}>
                Job-Targeted
              </span>
              <span className="text-[10px] text-muted-foreground">Paste JD</span>
            </div>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => handleModeChange('quick-practice')}
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all touch-manipulation backdrop-blur-xl',
              mode === 'quick-practice'
                ? 'border-primary/60 bg-primary/15 shadow-[0_0_25px_hsl(var(--primary)/0.2)]'
                : 'border-border/40 bg-card/60 hover:border-primary/40 hover:bg-primary/5'
            )}
          >
            <div className={cn(
              'p-2.5 rounded-xl transition-all',
              mode === 'quick-practice' ? 'bg-primary/20' : 'bg-muted/40'
            )}>
              <Rocket className={cn('w-5 h-5', mode === 'quick-practice' ? 'text-primary' : 'text-muted-foreground')} />
            </div>
            <div className="text-center">
              <span className={cn('text-xs font-bold block', mode === 'quick-practice' ? 'text-primary' : 'text-foreground')}>
                Quick
              </span>
              <span className="text-[10px] text-muted-foreground">5 questions</span>
            </div>
          </motion.button>
        </div>
      </div>

      {mode === 'job-targeted' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-2.5"
        >
          <label className="text-sm font-semibold text-foreground">Job Description</label>
          <Textarea
            value={jobDescription}
            onChange={(e) => { setJobDescription(e.target.value); setShowValidation(false); }}
            placeholder="Paste the job description here..."
            className="min-h-[120px] resize-none bg-card/60 backdrop-blur-xl border-border/40 rounded-2xl focus:border-primary/50 focus:shadow-[0_0_15px_hsl(var(--primary)/0.1)]"
          />
          <AnimatePresence>
            {showValidation && !jobDescription.trim() && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-destructive text-xs mt-1"
              >
                Please paste a job description to continue
              </motion.p>
            )}
          </AnimatePresence>
          {jobDescription.trim() && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Button
                variant="ghost"
                size="sm"
                className="w-full gap-2 text-muted-foreground hover:text-primary min-h-[44px]"
                onClick={() => { haptics.light(); setShowBriefing(true); }}
              >
                <Building2 className="w-4 h-4" />
                Research Company
              </Button>
            </motion.div>
          )}
        </motion.div>
      )}

      <motion.div whileTap={{ scale: 0.98 }}>
        <Button
          onClick={handleStart}
          size="lg"
          className="w-full text-base font-bold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-[0_4px_30px_hsl(var(--primary)/0.4)] rounded-2xl h-14 transition-opacity duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={mode === 'job-targeted' && !jobDescription.trim()}
        >
          <Rocket className="w-5 h-5 mr-2" />
          Launch Interview
        </Button>
      </motion.div>
      <CompanyBriefingSheet
        open={showBriefing}
        onOpenChange={setShowBriefing}
        jobDescription={jobDescription}
        resumeData={resumeData}
      />
    </motion.div>
  );
}