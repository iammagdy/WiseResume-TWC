import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PartyPopper, RefreshCw, Globe, Bell, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { haptics } from '@/lib/haptics';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/safeClient';
import { toast } from 'sonner';

// Simple confetti particle
function Confetti() {
  const colors = [
    'hsl(var(--primary))',
    'hsl(var(--secondary))',
    'hsl(var(--accent))',
    '#FFD700',
    '#FF69B4',
  ];
  const particles = Array.from({ length: 40 });
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
      {particles.map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-sm"
          style={{
            left: `${Math.random() * 100}%`,
            backgroundColor: colors[i % colors.length],
            top: '-8px',
          }}
          initial={{ y: -20, opacity: 1, rotate: 0 }}
          animate={{
            y: `${250 + Math.random() * 150}px`,
            opacity: [1, 1, 0],
            rotate: Math.random() * 360,
            x: (Math.random() - 0.5) * 100,
          }}
          transition={{
            duration: 1.5 + Math.random() * 1,
            delay: Math.random() * 0.5,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}

interface HiredCelebrationModalProps {
  open: boolean;
  onClose: () => void;
  jobTitle: string;
  company: string;
  resumeId?: string | null;
}

export function HiredCelebrationModal({ open, onClose, jobTitle, company, resumeId }: HiredCelebrationModalProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, updateProfile } = useProfile(user?.id, user);
  const [didFireHaptics, setDidFireHaptics] = useState(false);

  useEffect(() => {
    if (open && !didFireHaptics) {
      haptics.success();
      setDidFireHaptics(true);
      // Record hired_at on the profile
      if (user?.id) {
        updateProfile({ hired_at: new Date().toISOString() } as Parameters<typeof updateProfile>[0]);
      }
    }
    if (!open) setDidFireHaptics(false);
  }, [open]);

  const handleTurnOffOpenToWork = async () => {
    haptics.light();
    await updateProfile({ open_to_work: false } as Parameters<typeof updateProfile>[0]);
    toast.success('Open to Work turned off on your portfolio');
    onClose();
  };

  const handleSetReminder = async () => {
    haptics.light();
    if (!user?.id) return;
    const reminderDate = new Date();
    reminderDate.setMonth(reminderDate.getMonth() + 3);
    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'system',
      title: '⏰ Time to update your resume!',
      message: `It's been 3 months since you started at ${company}. Add your new role and achievements to stay ready.`,
      link: resumeId ? `/resume/${resumeId}` : '/dashboard',
    });
    toast.success('3-month reminder set! We\'ll nudge you to update your resume.');
    onClose();
  };

  const handleUpdateResume = () => {
    haptics.light();
    if (resumeId) navigate(`/resume/${resumeId}`);
    else navigate('/dashboard');
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="relative z-10 w-full max-w-sm glass-elevated rounded-3xl p-6 overflow-hidden"
            initial={{ y: 60, scale: 0.95, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 60, scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          >
            <Confetti />

            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-xl hover:bg-muted/50 min-w-[44px] min-h-[44px] flex items-center justify-center z-10"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="text-center mb-6 relative z-10">
              <motion.div
                className="text-5xl mb-3"
                animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.2, 1] }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                🎉
              </motion.div>
              <h2 className="text-2xl font-bold mb-1">You got the job!</h2>
              <p className="text-muted-foreground text-sm">
                Congratulations on your offer at <span className="font-semibold text-foreground">{company}</span>!
              </p>
            </div>

            {/* What's Next */}
            <div className="space-y-3 relative z-10">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">What's next</p>

              <button
                onClick={handleUpdateResume}
                className="w-full flex items-center gap-3 p-4 rounded-2xl border border-border/50 hover:bg-muted/30 active:scale-95 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <RefreshCw className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">Update your resume</p>
                  <p className="text-xs text-muted-foreground">Add your new role at {company}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={handleTurnOffOpenToWork}
                className="w-full flex items-center gap-3 p-4 rounded-2xl border border-border/50 hover:bg-muted/30 active:scale-95 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                  <Globe className="w-5 h-5 text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">Turn off "Open to Work"</p>
                  <p className="text-xs text-muted-foreground">Update your portfolio status</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={handleSetReminder}
                className="w-full flex items-center gap-3 p-4 rounded-2xl border border-border/50 hover:bg-muted/30 active:scale-95 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                  <Bell className="w-5 h-5 text-accent-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">Set a 3-month reminder</p>
                  <p className="text-xs text-muted-foreground">Keep your resume fresh after settling in</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <Button variant="ghost" className="w-full mt-4 relative z-10" onClick={onClose}>
              Close
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
