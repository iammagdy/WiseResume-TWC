import { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Square, Keyboard, Sparkles } from 'lucide-react';
import { InterviewSetup } from '@/components/interview/InterviewSetup';
import { InterviewToggle } from '@/components/interview/InterviewToggle';
import { TranscriptBubble, TypingBubble } from '@/components/interview/TranscriptBubble';
import { InterviewSummary } from '@/components/interview/InterviewSummary';
import { InterviewPreview } from '@/components/interview/InterviewPreview';
import { AnswerScoreSheet } from '@/components/interview/AnswerScoreSheet';
import { useVoiceInterview } from '@/hooks/useVoiceInterview';
import { useResumeStore } from '@/store/resumeStore';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { haptics } from '@/lib/haptics';

type InterviewPhase = 'setup' | 'preview' | 'active' | 'summary';

export default function InterviewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentResume } = useResumeStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [pendingJobDescription, setPendingJobDescription] = useState<string | undefined>();

  // Resume guard - require a resume for interview practice
  const hasValidResume = currentResume && currentResume.contactInfo?.fullName;
  
  useEffect(() => {
    if (!hasValidResume) {
      toast({
        title: 'Resume Required',
        description: 'Create or upload a resume first to start interview practice.',
        variant: 'default',
      });
      navigate(user ? '/upload' : '/auth');
    }
  }, [hasValidResume, navigate, user]);

  const {
    status,
    transcript,
    isStarted,
    summary,
    error,
    interimText,
    speechSupported,
    elapsedSeconds,
    silenceDetected,
    voiceGender,
    setVoiceGender,
    scores,
    latestScore,
    dismissScore,
    countdown,
    audioLevel,
    roleAnalysis,
    isAnalyzingRole,
    analyzeRole,
    startInterview,
    startListening,
    stopListening,
    sendTextMessage,
    endInterview,
    resetInterview,
  } = useVoiceInterview(currentResume);

  // Derive phase
  const phase: InterviewPhase = summary
    ? 'summary'
    : isStarted
    ? 'active'
    : pendingJobDescription !== undefined
    ? 'preview'
    : 'setup';

  // Auto-scroll transcript
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, interimText, status]);

  // Show errors as toast
  useEffect(() => {
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    }
  }, [error]);

  // Haptic feedback for countdown
  useEffect(() => {
    if (countdown !== null) {
      haptics.light();
    }
  }, [countdown]);

  const handleSetupStart = useCallback((jobDescription?: string) => {
    if (jobDescription) {
      // Go to preview phase for job-targeted interviews
      setPendingJobDescription(jobDescription);
      analyzeRole(jobDescription);
    } else {
      // General interview — skip preview, start directly
      startInterview();
    }
  }, [analyzeRole, startInterview]);

  const handlePreviewReady = useCallback(() => {
    startInterview(pendingJobDescription);
    setPendingJobDescription(undefined);
  }, [startInterview, pendingJobDescription]);

  const handleToggle = () => {
    if (status === 'listening') {
      stopListening();
    } else if (status === 'idle' || status === 'ready') {
      startListening();
    } else if (status === 'speaking') {
      // Allow interrupting AI
      window.speechSynthesis.cancel();
      startListening();
    }
  };

  const handleSendText = () => {
    if (!textInput.trim()) return;
    sendTextMessage(textInput.trim());
    setTextInput('');
  };

  const handleReset = useCallback(() => {
    resetInterview();
    setPendingJobDescription(undefined);
  }, [resetInterview]);

  const mins = Math.floor(elapsedSeconds / 60);
  const secs = elapsedSeconds % 60;

  // Summary screen
  if (phase === 'summary') {
    return (
      <div className="flex-1 flex flex-col">
        <InterviewSummary
          summary={summary!}
          duration={elapsedSeconds}
          scores={scores}
          onRestart={handleReset}
          onGoHome={() => navigate('/dashboard')}
        />
      </div>
    );
  }

  // Preview screen (job-targeted only)
  if (phase === 'preview') {
    return (
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-3 px-4 pt-3 pb-2">
          <button onClick={() => { setPendingJobDescription(undefined); }} className="touch-manipulation p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h1 className="text-lg font-bold text-foreground">Interview Preview</h1>
          </div>
        </div>
        <InterviewPreview
          roleAnalysis={roleAnalysis}
          isLoading={isAnalyzingRole}
          onReady={handlePreviewReady}
        />
      </div>
    );
  }

  // Setup screen
  if (phase === 'setup') {
    return (
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-3 px-4 pt-3 pb-2">
          <button onClick={() => navigate('/preview')} className="touch-manipulation p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h1 className="text-lg font-bold text-foreground">Wise AI Interview</h1>
          </div>
        </div>
        <InterviewSetup
          hasResume={!!currentResume && !!currentResume.contactInfo.fullName}
          speechSupported={speechSupported}
          voiceGender={voiceGender}
          onVoiceGenderChange={setVoiceGender}
          onStart={handleSetupStart}
        />
      </div>
    );
  }

  // Active interview
  return (
    <div className="flex-1 flex flex-col">
      {/* Premium glassmorphism header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border/20 bg-card/50 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/preview')} className="touch-manipulation p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Sparkles className="w-4 h-4 text-primary" />
            </motion.div>
            <h1 className="text-lg font-bold text-foreground">Wise AI</h1>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/25 shadow-[0_0_10px_hsl(var(--primary)/0.1)]">
          <motion.span 
            className="w-2 h-2 rounded-full bg-primary" 
            animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <span className="text-xs font-mono font-semibold text-primary tabular-nums">
            {mins}:{secs.toString().padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* Transcript area */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3"
      >
        {transcript.map((entry) => (
          <TranscriptBubble key={entry.id} entry={entry} />
        ))}
        
        {/* Show typing indicator when AI is thinking */}
        <AnimatePresence>
          {status === 'thinking' && <TypingBubble />}
        </AnimatePresence>
        
        {interimText && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            className="flex justify-end"
          >
            <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-3 bg-primary/20 backdrop-blur-sm border border-primary/30 text-foreground text-sm italic shadow-[0_4px_15px_hsl(var(--primary)/0.15)]">
              {interimText}
            </div>
          </motion.div>
        )}
      </div>

      {/* Controls */}
      <div className="shrink-0 border-t border-border/20 bg-card/50 backdrop-blur-xl px-4 py-4 space-y-3 pb-24">
        <div className="flex flex-col items-center gap-2">
          <InterviewToggle 
            status={status} 
            onPress={handleToggle} 
            silenceDetected={silenceDetected}
            audioLevel={audioLevel}
          />
          
          {/* Premium countdown overlay */}
          <AnimatePresence>
            {countdown !== null && status === 'speaking' && (
              <motion.div
                key={countdown}
                initial={{ scale: 0.3, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 1.3, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="flex flex-col items-center gap-1"
              >
                <span className="text-3xl font-black text-primary tabular-nums drop-shadow-[0_0_15px_hsl(var(--primary)/0.5)]">
                  {countdown}
                </span>
                <span className="text-[10px] text-muted-foreground font-medium">
                  Get ready to speak
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Text input fallback */}
        {showTextInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex gap-2 pt-2"
          >
            <Input
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Type your answer..."
              onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
              disabled={status === 'thinking'}
              className="bg-card/60 backdrop-blur-sm border-border/40"
            />
            <Button
              size="sm"
              onClick={handleSendText}
              disabled={!textInput.trim() || status === 'thinking'}
              className="bg-primary/90 shadow-[0_0_15px_hsl(var(--primary)/0.2)]"
            >
              Send
            </Button>
          </motion.div>
        )}

        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTextInput(!showTextInput)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Keyboard className="w-4 h-4 mr-1" />
            {showTextInput ? 'Hide' : 'Type'}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={endInterview}
            disabled={status === 'thinking'}
            className="shadow-[0_0_15px_hsl(var(--destructive)/0.3)]"
          >
            <Square className="w-4 h-4 mr-1" />
            End Interview
          </Button>
        </div>
      </div>

      {/* Per-answer score sheet */}
      <AnswerScoreSheet score={latestScore} onDismiss={dismissScore} />
    </div>
  );
}