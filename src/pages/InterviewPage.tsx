import { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Square, Keyboard, KeyboardOff, Sparkles, History, Lightbulb, RotateCcw, SkipForward } from 'lucide-react';
import { BackButton } from '@/components/ui/BackButton';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { InterviewSetup } from '@/components/interview/InterviewSetup';
import { InterviewToggle } from '@/components/interview/InterviewToggle';
import { TranscriptBubble, TypingBubble } from '@/components/interview/TranscriptBubble';
import { InterviewSummary } from '@/components/interview/InterviewSummary';
import { InterviewPreview } from '@/components/interview/InterviewPreview';
import { AnswerScoreSheet } from '@/components/interview/AnswerScoreSheet';
import { InterviewHistorySheet } from '@/components/interview/InterviewHistorySheet';
import { InterviewTipsSheet } from '@/components/interview/InterviewTipsSheet';
import { InterviewStatsCard } from '@/components/interview/InterviewStatsCard';
import { useVoiceInterview } from '@/hooks/useVoiceInterview';
import { useSaveInterviewSession } from '@/hooks/useInterviewHistory';
import { useResumeStore, useResumeStoreHydration } from '@/store/resumeStore';
import { useAuth } from '@/hooks/useAuth';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageLoadingSpinner } from '@/components/ui/PageLoadingSpinner';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { activityTracker } from '@/lib/activityTracker';

type InterviewPhase = 'setup' | 'preview' | 'active' | 'summary';

function InterviewPageContent() {
  useEffect(() => {
    activityTracker.setActiveFeature('Mock Interview');
    return () => { activityTracker.setActiveFeature(null); };
  }, []);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentResume } = useResumeStore();
  const hydrated = useResumeStoreHydration();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [pendingJobDescription, setPendingJobDescription] = useState<string | undefined>();
  const [showHistory, setShowHistory] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [sessionSaved, setSessionSaved] = useState(false);
  const activeJobDescriptionRef = useRef<string | undefined>();
  const activeInterviewTypeRef = useRef<string>('general');
  const saveSession = useSaveInterviewSession();

  // Resume guard - require a resume for interview practice (only after hydration)
  const hasValidResume = currentResume && currentResume.contactInfo?.fullName;

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
    sttEngine,
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
  
  // No navigation redirect — show an in-page empty state instead

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

  // Show errors as toast with specific messages and auto-show text input
  useEffect(() => {
    if (error) {
      let title = 'Error';
      let description = error;
      if (error.toLowerCase().includes('microphone') && error.toLowerCase().includes('denied')) {
        title = 'Microphone Blocked';
        description = 'Please allow microphone access in your browser settings, or use the Type button.';
        setShowTextInput(true);
      } else if (error.toLowerCase().includes('not supported')) {
        title = 'Speech Recognition Unavailable';
        setShowTextInput(true);
      } else if (error.toLowerCase().includes('timed out') || error.toLowerCase().includes('connection error')) {
        title = 'Connection Issue';
        description = error + ' You can use the Type button instead.';
        setShowTextInput(true);
      }
      toast.error(title, { description });
    }
  }, [error]);

  // Haptic feedback for countdown
  useEffect(() => {
    if (countdown !== null) {
      haptics.light();
    }
  }, [countdown]);

  const handleSetupStart = useCallback((jobDescription?: string, options?: { quickPractice?: boolean }) => {
    if (options?.quickPractice) {
      // Quick practice — skip preview, start directly with quickPractice flag
      activeInterviewTypeRef.current = 'quick-practice';
      activeJobDescriptionRef.current = undefined;
      startInterview(undefined, true);
    } else if (jobDescription) {
      // Go to preview phase for job-targeted interviews
      activeInterviewTypeRef.current = 'job-targeted';
      activeJobDescriptionRef.current = jobDescription;
      setPendingJobDescription(jobDescription);
      analyzeRole(jobDescription);
    } else {
      // General interview — skip preview, start directly
      activeInterviewTypeRef.current = 'general';
      activeJobDescriptionRef.current = undefined;
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
      window.speechSynthesis?.cancel();
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

  // Auto-save session when summary is shown
  useEffect(() => {
    if (summary && !sessionSaved && user) {
      setSessionSaved(true);
      // Parse score from summary
      const scoreMatch = summary.match(/Score:\s*(\d+)\/10/i);
      const overallScore = scoreMatch ? parseInt(scoreMatch[1]) : undefined;
      // Parse strengths and improvements
      const strengthsMatch = summary.match(/\*\*Strengths:\*\*\n([\s\S]*?)(?=\n\*\*)/);
      const improvementsMatch = summary.match(/\*\*Areas to Improve:\*\*\n([\s\S]*?)(?=\n\*\*)/);
      const strengths = strengthsMatch ? strengthsMatch[1].split('\n').filter(l => l.trim().startsWith('-')).map(l => l.replace(/^-\s*/, '').trim()) : [];
      const improvements = improvementsMatch ? improvementsMatch[1].split('\n').filter(l => l.trim().startsWith('-')).map(l => l.replace(/^-\s*/, '').trim()) : [];

      saveSession.mutate({
        interview_type: activeInterviewTypeRef.current,
        job_description: activeJobDescriptionRef.current,
        messages: transcript as any,
        overall_score: overallScore,
        strengths,
        improvements,
        duration_seconds: elapsedSeconds,
      });
    }
  }, [summary, sessionSaved, user, transcript, elapsedSeconds, saveSession]);

  // Show loading while store hydrates
  if (!hydrated) {
    return <PageLoadingSpinner />;
  }

  // Empty state — no resume loaded
  if (!hasValidResume) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-muted-foreground opacity-50" />
        </div>
        <div>
          <h2 className="font-semibold text-lg mb-1 text-foreground">No Resume Selected</h2>
          <p className="text-sm text-muted-foreground max-w-xs">Select or create a resume from your dashboard to start interview practice.</p>
        </div>
        <Button onClick={() => navigate('/ai-studio')} className="min-h-[48px] px-6">
          Go to Dashboard
        </Button>
      </div>
    );
  }

  if (phase === 'summary') {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
        <InterviewSummary
          summary={summary!}
          duration={elapsedSeconds}
          scores={scores}
          onRestart={() => { setSessionSaved(false); handleReset(); }}
          onGoHome={() => navigate('/ai-studio')}
          onShowTips={() => setShowTips(true)}
        />
        <InterviewTipsSheet open={showTips} onOpenChange={setShowTips} />
        </div>
      </div>
    );
  }

  // Preview screen (job-targeted only)
  if (phase === 'preview') {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-4 pt-3 pb-2">
          <BackButton 
            onBeforeBack={() => { 
              setPendingJobDescription(undefined); 
              return true; 
            }} 
            className="text-foreground" 
          />
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h1 className="text-lg font-bold text-foreground">Interview Preview</h1>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <InterviewPreview
            roleAnalysis={roleAnalysis}
            isLoading={isAnalyzingRole}
            onReady={handlePreviewReady}
          />
        </div>
      </div>
    );
  }

  // Setup screen
  if (phase === 'setup') {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-4 pt-3 pb-2">
          <BackButton />
          <div className="flex items-center gap-2 flex-1">
            <Sparkles className="w-4 h-4 text-primary" />
            <h1 className="text-lg font-bold text-foreground">Wise AI Interview</h1>
          </div>
          <button onClick={() => setShowTips(true)} className="touch-manipulation p-2 rounded-full hover:bg-muted active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-muted-foreground" />
          </button>
          <button onClick={() => setShowHistory(true)} className="touch-manipulation p-2 rounded-full hover:bg-muted active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <History className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <InterviewStatsCard onViewHistory={() => setShowHistory(true)} />
          <InterviewSetup
            hasResume={!!currentResume && !!currentResume.contactInfo.fullName}
            speechSupported={speechSupported}
            voiceGender={voiceGender}
            onVoiceGenderChange={setVoiceGender}
            onStart={handleSetupStart}
            resumeData={currentResume ? { summary: currentResume.summary ?? undefined, experience: currentResume.experience as any, skills: currentResume.skills as any } : undefined}
          />
        </div>
        <InterviewHistorySheet open={showHistory} onOpenChange={setShowHistory} />
        <InterviewTipsSheet open={showTips} onOpenChange={setShowTips} />
      </div>
    );
  }

  // Active interview
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Premium glassmorphism header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border/20 bg-card/50 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <BackButton />
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

      {/* Progress indicator */}
      {(() => {
        const interviewType = activeInterviewTypeRef.current;
        const currentQuestion = transcript.filter(e => e.role === 'interviewer').length;
        const isQuick = interviewType === 'quick-practice';
        const totalQuestions = 5;
        const progress = isQuick ? Math.min((currentQuestion / totalQuestions) * 100, 100) : 0;
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-0">
            <div className="w-full h-[3px] bg-muted/30">
              {isQuick ? (
                <div
                  className="h-full bg-primary rounded-r-full"
                  style={{ width: `${progress}%`, transition: 'width 500ms ease-in-out' }}
                />
              ) : (
                <motion.div
                  className="h-full bg-primary/70 rounded-r-full"
                  animate={{ width: ['0%', '60%', '0%'] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
            </div>
            {isQuick && currentQuestion > 0 && (
              <p className="text-muted-foreground text-xs text-center mt-1">
                Question {Math.min(currentQuestion, totalQuestions)} of {totalQuestions}
              </p>
            )}
          </motion.div>
        );
      })()}

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
      <div className="shrink-0 border-t border-border/20 bg-card/50 backdrop-blur-xl px-4 py-4 space-y-3 pb-safe">
        <div className="flex items-center justify-center gap-6">
          {/* Replay button */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileTap={{ scale: 1.15 }}
            onClick={() => {
              const lastQ = [...transcript].reverse().find(e => e.role === 'interviewer');
              if (!lastQ) return;
              haptics.light();
              window.speechSynthesis?.cancel();
              const utter = new SpeechSynthesisUtterance(lastQ.text);
              const voices = window.speechSynthesis?.getVoices() ?? [];
              const preferred = voices.find(v => voiceGender === 'female' ? /female|zira|samantha/i.test(v.name) : /male|david|daniel/i.test(v.name));
              if (preferred) utter.voice = preferred;
              window.speechSynthesis?.speak(utter);
            }}
            disabled={status === 'speaking' || status === 'thinking' || !transcript.some(e => e.role === 'interviewer')}
            className="flex flex-col items-center gap-1 min-w-[44px] min-h-[44px] rounded-full text-foreground/70 disabled:opacity-30 active:bg-foreground/10 touch-manipulation transition-opacity"
          >
            <RotateCcw className="w-5 h-5" />
            <span className="text-muted-foreground text-[10px]">Replay</span>
          </motion.button>

          <InterviewToggle 
            status={status} 
            onPress={handleToggle} 
            silenceDetected={silenceDetected}
            audioLevel={audioLevel}
            sttEngine={sttEngine}
          />

          {/* Skip button */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileTap={{ scale: 1.15 }}
            onClick={() => {
              haptics.light();
              sendTextMessage('(skipped)');
            }}
            disabled={status === 'thinking'}
            className="flex flex-col items-center gap-1 min-w-[44px] min-h-[44px] rounded-full text-foreground/70 disabled:opacity-30 active:bg-foreground/10 touch-manipulation transition-opacity"
          >
            <SkipForward className="w-5 h-5" />
            <span className="text-muted-foreground text-[10px]">Skip</span>
          </motion.button>
          
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
            className="text-muted-foreground hover:text-foreground min-h-[44px]"
          >
            {showTextInput ? <KeyboardOff className="w-4 h-4 mr-1" /> : <Keyboard className="w-4 h-4 mr-1" />}
            {showTextInput ? 'Close' : 'Type'}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowEndConfirm(true)}
            disabled={status === 'thinking'}
            className="shadow-[0_0_15px_hsl(var(--destructive)/0.3)] min-h-[44px]"
          >
            <Square className="w-4 h-4 mr-1" />
            End Interview
          </Button>
        </div>
      </div>

      {/* Per-answer score sheet */}
      <AnswerScoreSheet score={latestScore} onDismiss={dismissScore} />

      {/* End interview confirmation sheet */}
      <Sheet open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <SheetContent side="bottom" hideCloseButton className="px-6 pb-8">
          <SheetTitle className="text-lg font-bold text-foreground text-center">End Interview?</SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground text-center mt-1">
            Your progress will be saved and you'll receive your feedback.
          </SheetDescription>
          <div className="flex flex-col gap-3 mt-6">
            <Button
              variant="destructive"
              className="w-full py-3 rounded-xl font-semibold min-h-[48px]"
              onClick={() => { setShowEndConfirm(false); endInterview(); }}
            >
              Yes, End Interview
            </Button>
            <Button
              variant="ghost"
              className="w-full py-3 rounded-xl font-medium bg-muted/50 min-h-[48px]"
              onClick={() => setShowEndConfirm(false)}
            >
              Keep Going
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function InterviewPage() {
  return (
    <ErrorBoundary>
      <InterviewPageContent />
    </ErrorBoundary>
  );
}