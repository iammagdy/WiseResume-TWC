import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, Briefcase, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type InterviewMode = 'general' | 'job-targeted';

interface InterviewSetupProps {
  hasResume: boolean;
  speechSupported: boolean;
  onStart: (jobDescription?: string) => void;
}

export function InterviewSetup({ hasResume, speechSupported, onStart }: InterviewSetupProps) {
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
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Mic className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">AI Mock Interview</h2>
        <p className="text-sm text-muted-foreground">
          Practice with an AI interviewer that adapts to your resume
        </p>
      </div>

      {!speechSupported && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <p>Voice is not supported in this browser. You can still type your answers.</p>
        </div>
      )}

      {!hasResume && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted text-muted-foreground text-sm">
          <FileText className="w-4 h-4 mt-0.5 shrink-0" />
          <p>No resume loaded. The interviewer will ask general questions. Load a resume for personalized questions.</p>
        </div>
      )}

      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">Interview Mode</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setMode('general')}
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all touch-manipulation',
              mode === 'general'
                ? 'border-primary bg-primary/5'
                : 'border-border bg-card hover:border-primary/40'
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
              'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all touch-manipulation',
              mode === 'job-targeted'
                ? 'border-primary bg-primary/5'
                : 'border-border bg-card hover:border-primary/40'
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
            className="min-h-[120px] resize-none"
          />
        </motion.div>
      )}

      <Button
        onClick={handleStart}
        size="lg"
        className="w-full text-base"
        disabled={mode === 'job-targeted' && !jobDescription.trim()}
      >
        <Mic className="w-5 h-5 mr-2" />
        Start Interview
      </Button>
    </motion.div>
  );
}
