import { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Square, Keyboard, Sparkles } from 'lucide-react';
import { InterviewSetup } from '@/components/interview/InterviewSetup';
import { InterviewToggle } from '@/components/interview/InterviewToggle';
import { TranscriptBubble } from '@/components/interview/TranscriptBubble';
import { InterviewSummary } from '@/components/interview/InterviewSummary';
import { InterviewPreview } from '@/components/interview/InterviewPreview';
import { AnswerScoreSheet } from '@/components/interview/AnswerScoreSheet';
import { useVoiceInterview } from '@/hooks/useVoiceInterview';
import { useResumeStore } from '@/store/resumeStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

type InterviewPhase = 'setup' | 'preview' | 'active' | 'summary';

export default function InterviewPage() {
  const navigate = useNavigate();
  const { currentResume } = useResumeStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [pendingJobDescription, setPendingJobDescription] = useState<string | undefined>();

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
  }, [transcript, interimText]);

  // Show errors as toast
  useEffect(() => {
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    }
  }, [error]);

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
          <button onClick={() => navigate('/dashboard')} className="touch-manipulation p-1">
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
      {/* Glassmorphism header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border/30 bg-card/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="touch-manipulation p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h1 className="text-lg font-bold text-foreground">Wise AI</h1>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-mono text-primary tabular-nums">
            {mins}:{secs.toString().padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* Transcript area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
        style={{ maxHeight: 'calc(100vh - 320px)' }}
      >
        {transcript.map((entry) => (
          <TranscriptBubble key={entry.id} entry={entry} />
        ))}
        {interimText && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            className="flex justify-end"
          >
            <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-3 bg-primary/15 backdrop-blur-sm border border-primary/20 text-foreground text-sm italic">
              {interimText}
            </div>
          </motion.div>
        )}
      </div>

      {/* Controls */}
      <div className="border-t border-border/30 bg-card/40 backdrop-blur-md px-4 py-4 space-y-3 pb-safe">
        <div className="flex flex-col items-center gap-1.5 py-1">
          <InterviewToggle status={status} onPress={handleToggle} />
          {countdown !== null && status === 'speaking' && (
            <motion.div
              key={countdown}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="text-2xl font-bold text-primary tabular-nums"
            >
              {countdown}
            </motion.div>
          )}
          {status === 'ready' && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-[hsl(45_90%_55%)] font-medium"
            >
              Your turn — tap the mic to answer
            </motion.p>
          )}
          {silenceDetected && status === 'listening' && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs text-muted-foreground animate-pulse"
            >
              Sending soon…
            </motion.p>
          )}
          {status === 'listening' && !silenceDetected && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              className="text-[10px] text-muted-foreground"
            >
              Tap the mic when you're done
            </motion.p>
          )}
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
              className="bg-card/50 backdrop-blur-sm border-border/50"
            />
            <Button
              size="sm"
              onClick={handleSendText}
              disabled={!textInput.trim() || status === 'thinking'}
              className="bg-primary/90"
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
            className="text-muted-foreground"
          >
            <Keyboard className="w-4 h-4 mr-1" />
            {showTextInput ? 'Hide' : 'Type'}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={endInterview}
            disabled={status === 'thinking'}
            className="shadow-[0_0_10px_hsl(var(--destructive)/0.3)]"
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
