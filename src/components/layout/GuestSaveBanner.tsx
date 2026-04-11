import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useResumeStore } from '@/store/resumeStore';

export function GuestSaveBanner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentResume } = useResumeStore();

  if (user || !currentResume) {
    return null;
  }

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
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-destructive/10 border-b-2 border-destructive/40 px-4 py-3"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
          <p className="text-sm text-foreground">
            <span className="font-semibold text-destructive">Your resume will be lost</span>
            <span className="text-muted-foreground"> if you leave without signing in.</span>
          </p>
        </div>
        <Button
          size="sm"
          variant="destructive"
          className="h-8 text-xs px-3 shrink-0"
          onClick={() => navigate('/auth')}
        >
          Sign Up Free
        </Button>
      </div>
    </motion.div>
  );
}
