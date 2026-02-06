import { useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, FileText, AlertCircle, Sparkles, Rocket, User, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { VoiceGender } from '@/hooks/useVoiceInterview';

type InterviewMode = 'general' | 'job-targeted';

interface InterviewSetupProps {
  hasResume: boolean;
  speechSupported: boolean;
  voiceGender: VoiceGender;
  onVoiceGenderChange: (gender: VoiceGender) => void;
  onStart: (jobDescription?: string) => void;
}

export function InterviewSetup({ hasResume, speechSupported, voiceGender, onVoiceGenderChange, onStart }: InterviewSetupProps) {
  const [mode, setMode] = useState<InterviewMode>('general');
  const [jobDescription, setJobDescription] = useState('');

  const handleStart = () => {
    onStart(mode === 'job-targeted' ? jobDescription : undefined);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-6 px-4 py-6 max-w-lg mx-auto"
    >
      {/* Glowing orb header */}
      <div className="text-center space-y-3">
        <div className="relative w-24 h-24 mx-auto">
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle, hsl(var(--primary) / 0.4) 0%, transparent 70%)',
            }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="absolute inset-3 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 backdrop-blur-sm border border-primary/30 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-foreground">Wise AI Interview</h2>
        <p className="text-sm text-muted-foreground">
          Practice with Wise AI — your intelligent interview coach
        </p>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
            Powered by Wise AI
          </span>
        </div>
      </div>

      {!speechSupported && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm backdrop-blur-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <p>Voice is not supported in this browser. You can still type your answers.</p>
        </div>
      )}

      {!hasResume && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/50 border border-border/50 text-muted-foreground text-sm backdrop-blur-sm">
          <FileText className="w-4 h-4 mt-0.5 shrink-0" />
          <p>No resume loaded. Wise AI will ask general questions. Load a resume for personalized questions.</p>
        </div>
      )}

      {/* Voice Gender Toggle */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">AI Voice</p>
        <div className="flex rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
          <button
            onClick={() => onVoiceGenderChange('female')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-all touch-manipulation',
              voiceGender === 'female'
                ? 'bg-primary/15 text-primary border-r border-primary/20'
                : 'text-muted-foreground hover:text-foreground border-r border-border/30'
            )}
          >
            <UserRound className="w-4 h-4" />
            Female
          </button>
          <button
            onClick={() => onVoiceGenderChange('male')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-all touch-manipulation',
              voiceGender === 'male'
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <User className="w-4 h-4" />
            Male
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">Interview Mode</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setMode('general')}
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all touch-manipulation backdrop-blur-sm',
              mode === 'general'
                ? 'border-primary/50 bg-primary/10 shadow-[0_0_15px_hsl(var(--primary)/0.15)]'
                : 'border-border/50 bg-card/50 hover:border-primary/30'
            )}
          >
            <FileText className={cn('w-6 h-6', mode === 'general' ? 'text-primary' : 'text-muted-foreground')} />
            <span className={cn('text-sm font-medium', mode === 'general' ? 'text-primary' : 'text-foreground')}>
              General
            </span>
            <span className="text-xs text-muted-foreground text-center">Based on your CV</span>
          </button>
          <button
            onClick={() => setMode('job-targeted')}
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all touch-manipulation backdrop-blur-sm',
              mode === 'job-targeted'
                ? 'border-primary/50 bg-primary/10 shadow-[0_0_15px_hsl(var(--primary)/0.15)]'
                : 'border-border/50 bg-card/50 hover:border-primary/30'
            )}
          >
            <Briefcase className={cn('w-6 h-6', mode === 'job-targeted' ? 'text-primary' : 'text-muted-foreground')} />
            <span className={cn('text-sm font-medium', mode === 'job-targeted' ? 'text-primary' : 'text-foreground')}>
              Job-Targeted
            </span>
            <span className="text-xs text-muted-foreground text-center">Paste a job description</span>
          </button>
        </div>
      </div>

      {mode === 'job-targeted' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-2"
        >
          <label className="text-sm font-medium text-foreground">Job Description</label>
          <Textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job description here..."
            className="min-h-[120px] resize-none bg-card/50 backdrop-blur-sm border-border/50"
          />
        </motion.div>
      )}

      <Button
        onClick={handleStart}
        size="lg"
        className="w-full text-base bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
        disabled={mode === 'job-targeted' && !jobDescription.trim()}
      >
        <Rocket className="w-5 h-5 mr-2" />
        Launch Interview
      </Button>
    </motion.div>
  );
}
