import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Square, Keyboard } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { InterviewSetup } from '@/components/interview/InterviewSetup';
import { InterviewToggle } from '@/components/interview/InterviewToggle';
import { TranscriptBubble } from '@/components/interview/TranscriptBubble';
import { InterviewSummary } from '@/components/interview/InterviewSummary';
import { useVoiceInterview } from '@/hooks/useVoiceInterview';
import { useResumeStore } from '@/store/resumeStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

export default function InterviewPage() {
  const navigate = useNavigate();
  const { currentResume } = useResumeStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);

  const {
    status,
    transcript,
    isStarted,
    summary,
    error,
    interimText,
    speechSupported,
    elapsedSeconds,
    startInterview,
    startListening,
    stopListening,
    sendTextMessage,
    endInterview,
    resetInterview,
  } = useVoiceInterview(currentResume);

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

  const handleToggle = () => {
    if (status === 'listening') {
      stopListening();
    } else if (status === 'idle') {
      startListening();
    } else if (status === 'speaking') {
      // Stop TTS and let user speak
      window.speechSynthesis.cancel();
      startListening();
    }
  };

  const handleSendText = () => {
    if (!textInput.trim()) return;
    sendTextMessage(textInput.trim());
    setTextInput('');
  };

  const mins = Math.floor(elapsedSeconds / 60);
  const secs = elapsedSeconds % 60;

  // Summary screen
  if (summary) {
    return (
      <MobileLayout>
        <InterviewSummary
          summary={summary}
          duration={elapsedSeconds}
          onRestart={resetInterview}
          onGoHome={() => navigate('/dashboard')}
        />
      </MobileLayout>
    );
  }

  // Setup screen
  if (!isStarted) {
    return (
      <MobileLayout>
        <div className="flex items-center gap-3 px-4 pt-3 pb-2">
          <button onClick={() => navigate(-1)} className="touch-manipulation p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">AI Interview</h1>
        </div>
        <InterviewSetup
          hasResume={!!currentResume && !!currentResume.contactInfo.fullName}
          speechSupported={speechSupported}
          onStart={startInterview}
        />
      </MobileLayout>
    );
  }

  // Active interview
  return (
    <MobileLayout>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="touch-manipulation p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Mock Interview</h1>
        </div>
        <span className="text-sm font-mono text-muted-foreground tabular-nums">
          {mins}:{secs.toString().padStart(2, '0')}
        </span>
      </div>

      {/* Transcript area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
        style={{ maxHeight: 'calc(100vh - 280px)' }}
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
            <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-3 bg-primary/20 text-foreground text-sm italic">
              {interimText}
            </div>
          </motion.div>
        )}
      </div>

      {/* Controls */}
      <div className="border-t border-border bg-background px-4 py-4 space-y-3 pb-safe">
        {/* Toggle */}
        <div className="flex justify-center py-2">
          <InterviewToggle status={status} onPress={handleToggle} />
        </div>

        {/* Text input fallback */}
        {showTextInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex gap-2"
          >
            <Input
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Type your answer..."
              onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
              disabled={status === 'thinking'}
            />
            <Button
              size="sm"
              onClick={handleSendText}
              disabled={!textInput.trim() || status === 'thinking'}
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
          >
            <Square className="w-4 h-4 mr-1" />
            End Interview
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
}
