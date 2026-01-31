import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, FileText, Target, Wand2, Plus } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { AppLogo } from '@/components/brand/AppLogo';
import { FeatureCarousel } from '@/components/landing/FeatureCarousel';
import { Button } from '@/components/ui/button';
import { ResumeCard } from '@/components/home/ResumeCard';
import { ChoiceCard } from '@/components/home/ChoiceCard';
import { ActionCard } from '@/components/home/ActionCard';
import { JobAnalysisSheet } from '@/components/editor/JobAnalysisSheet';
import { TailorSheet } from '@/components/editor/TailorSheet';
import { useResumeStore } from '@/store/resumeStore';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const Index = () => {
  const navigate = useNavigate();
  const { currentResume, matchScore, clearAll, setCurrentResume } = useResumeStore();
  
  const [showJobSheet, setShowJobSheet] = useState(false);
  const [showTailor, setShowTailor] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const hasResume = currentResume !== null;

  const handleUpload = () => {
    navigate('/upload');
  };

  const handleStartBlank = () => {
    setCurrentResume({
      contactInfo: { fullName: '', email: '', phone: '', location: '' },
      summary: '',
      experience: [],
      education: [],
      skills: [],
      certifications: [],
      templateId: 'modern',
    });
    navigate('/editor');
  };

  const handleContinueEditing = () => {
    navigate('/editor');
  };

  const handleDeleteResume = () => {
    clearAll();
    setShowDeleteConfirm(false);
  };

  const handleSignIn = () => {
    navigate('/auth');
  };

  return (
    <MobileLayout>
      <div className="min-h-full flex flex-col">
        {/* App Header */}
        <header className="pt-safe pt-6 pb-4 px-4">
          <AppLogo size="md" />
        </header>

        {hasResume ? (
          /* Returning User Dashboard */
          <div className="flex-1 flex flex-col px-4 pb-safe">
            {/* Current Resume Card */}
            <section className="mb-6">
              <h2 className="text-sm font-medium text-muted-foreground mb-3">
                Continue where you left off
              </h2>
              <ResumeCard
                resume={currentResume}
                matchScore={matchScore}
                onContinue={handleContinueEditing}
                onDelete={() => setShowDeleteConfirm(true)}
              />
            </section>

            {/* AI Actions */}
            <section className="mb-6">
              <h2 className="text-sm font-medium text-muted-foreground mb-3">
                AI-Powered Actions
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <ActionCard
                  icon={Target}
                  title="Score Match"
                  description="Analyze job compatibility"
                  onClick={() => setShowJobSheet(true)}
                />
                <ActionCard
                  icon={Wand2}
                  title="Tailor Resume"
                  description="Customize for a job"
                  onClick={() => setShowTailor(true)}
                />
              </div>
            </section>

            {/* Create New */}
            <section className="mt-auto pb-6">
              <Button
                variant="outline"
                className="w-full h-12 gap-2"
                onClick={handleUpload}
              >
                <Plus className="w-5 h-5" />
                Create New Resume
              </Button>
            </section>

            {/* Sign In Link */}
            <motion.div
              className="text-center pb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <button
                onClick={handleSignIn}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
              >
                Already have an account?{' '}
                <span className="text-primary font-medium">Sign In</span>
              </button>
            </motion.div>
          </div>
        ) : (
          /* New User Welcome */
          <div className="flex-1 flex flex-col px-4 pb-safe">
            {/* Welcome Message */}
            <motion.div
              className="text-center mb-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="text-2xl font-display font-bold mb-2">
                Create Your Resume
              </h1>
              <p className="text-muted-foreground">
                Build a professional resume in minutes with AI assistance
              </p>
            </motion.div>

            {/* Choice Cards */}
            <section className="space-y-3 mb-6">
              <ChoiceCard
                icon={Upload}
                title="Upload Existing PDF"
                description="We'll extract and enhance it"
                onClick={handleUpload}
                delay={0.1}
              />
              <ChoiceCard
                icon={FileText}
                title="Start from Scratch"
                description="Build step by step with AI"
                onClick={handleStartBlank}
                delay={0.2}
              />
            </section>

            {/* Feature Carousel */}
            <section className="flex-1 flex flex-col justify-center py-4">
              <FeatureCarousel />
            </section>

            {/* Sign In Link */}
            <motion.div
              className="text-center pb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <button
                onClick={handleSignIn}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
              >
                Already have an account?{' '}
                <span className="text-primary font-medium">Sign In</span>
              </button>
            </motion.div>
          </div>
        )}

        {/* Sheets */}
        <JobAnalysisSheet open={showJobSheet} onOpenChange={setShowJobSheet} />
        <TailorSheet open={showTailor} onOpenChange={setShowTailor} />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Resume?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete your current resume and all its content.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteResume}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MobileLayout>
  );
};

export default Index;
