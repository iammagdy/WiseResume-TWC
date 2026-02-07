import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useResumeStore } from '@/store/resumeStore';

export function GuestSaveBanner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentResume } = useResumeStore();
  const [dismissed, setDismissed] = useState(false);

  // Only show for guests with a resume in progress
  if (user || !currentResume || dismissed) {
    return null;
  }

  // Check if user has made meaningful progress
  const hasProgress = 
    currentResume.contactInfo?.fullName ||
    currentResume.summary?.length > 20 ||
    currentResume.experience?.length > 0 ||
    currentResume.education?.length > 0 ||
    currentResume.skills?.length > 0;

  if (!hasProgress) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-primary/10 border-b border-primary/20 px-4 py-2.5"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Cloud className="w-4 h-4 text-primary shrink-0" />
            <p className="text-sm text-foreground truncate">
              <span className="font-medium">Your work is saved locally.</span>
              <span className="text-muted-foreground hidden sm:inline"> Sign up to save it to the cloud.</span>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="default"
              className="h-7 text-xs px-3"
              onClick={() => navigate('/auth')}
            >
              Sign Up
            </Button>
            <button
              onClick={() => setDismissed(true)}
              className="p-1 rounded-full hover:bg-muted transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
