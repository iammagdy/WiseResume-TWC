import { useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Target, Wand2, Plus, Mic } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { AppLogo } from '@/components/brand/AppLogo';
import { Button } from '@/components/ui/button';
import { useResumeStore } from '@/store/resumeStore';
import { useAuth } from '@/hooks/useAuth';
import { 
  HeroSkeleton,
  SocialProofSkeleton,
  HowItWorksSkeleton,
  FeatureGridSkeleton,
  TemplateGallerySkeleton,
  BottomCTASkeleton
} from '@/components/landing/LandingSkeletons';
import { LazySection } from '@/components/landing/LazySection';
import { HomeBackground } from '@/components/home/HomeBackground';
import { ResumeCard } from '@/components/home/ResumeCard';
import { ActionCard } from '@/components/home/ActionCard';
import { SpaceBackground } from '@/components/landing/SpaceBackground';
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

// Lazy load heavy components not needed for initial render
const JobAnalysisSheet = lazy(() => import('@/components/editor/JobAnalysisSheet').then(m => ({ default: m.JobAnalysisSheet })));
const TailorSheet = lazy(() => import('@/components/editor/TailorSheet').then(m => ({ default: m.TailorSheet })));
const HeroSection = lazy(() => import('@/components/landing/HeroSection').then(m => ({ default: m.HeroSection })));
const SocialProofBar = lazy(() => import('@/components/landing/SocialProofBar').then(m => ({ default: m.SocialProofBar })));
const WhyWiseResume = lazy(() => import('@/components/landing/WhyWiseResume').then(m => ({ default: m.WhyWiseResume })));
const HowItWorks = lazy(() => import('@/components/landing/HowItWorks').then(m => ({ default: m.HowItWorks })));
const FeatureGrid = lazy(() => import('@/components/landing/FeatureGrid').then(m => ({ default: m.FeatureGrid })));
const TemplateGallery = lazy(() => import('@/components/landing/TemplateGallery').then(m => ({ default: m.TemplateGallery })));
const BottomCTA = lazy(() => import('@/components/landing/BottomCTA').then(m => ({ default: m.BottomCTA })));

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
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

  // Return existing user dashboard if they have a resume in progress
  if (hasResume) {
    return (
      <MobileLayout>
        <HomeBackground>
          <div className="min-h-full flex flex-col">
            {/* App Header */}
            <header className="pt-safe pt-6 pb-6 px-4 flex flex-col items-center">
              <AppLogo size="md" />
            </header>

            {/* Returning User Dashboard */}
            <div className="flex-1 flex flex-col px-4 pb-safe">
              {/* Current Resume Card */}
              <motion.section 
                className="mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <h2 className="text-sm font-medium text-muted-foreground mb-3">
                  Continue where you left off
                </h2>
                <ResumeCard
                  resume={currentResume}
                  matchScore={matchScore}
                  onContinue={handleContinueEditing}
                  onDelete={() => setShowDeleteConfirm(true)}
                />
              </motion.section>

              {/* AI Actions */}
              <motion.section 
                className="mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
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
              </motion.section>

              {/* Create New */}
              <motion.section 
                className="mt-auto pb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Button
                  variant="outline"
                  className="w-full h-12 gap-2 glass-card hover:border-primary/40"
                  onClick={handleUpload}
                >
                  <Plus className="w-5 h-5" />
                  Create New Resume
                </Button>
              </motion.section>

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

            {/* Sheets - lazy loaded */}
            <Suspense fallback={null}>
              <JobAnalysisSheet open={showJobSheet} onOpenChange={setShowJobSheet} />
              <TailorSheet open={showTailor} onOpenChange={setShowTailor} />
            </Suspense>

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
        </HomeBackground>
      </MobileLayout>
    );
  }

  // New user: show space-themed landing page
  return (
    <SpaceBackground>
      <main className="min-h-screen">
        <Suspense fallback={<HeroSkeleton />}>
          <HeroSection />
        </Suspense>
        <LazySection skeleton={<SocialProofSkeleton />}>
          <SocialProofBar />
        </LazySection>
        <LazySection skeleton={<HowItWorksSkeleton />}>
          <HowItWorks />
        </LazySection>
        <LazySection skeleton={<FeatureGridSkeleton />}>
          <FeatureGrid />
        </LazySection>
        <LazySection skeleton={<TemplateGallerySkeleton />}>
          <TemplateGallery />
        </LazySection>
        <LazySection skeleton={<BottomCTASkeleton />}>
          <BottomCTA />
        </LazySection>
      </main>
    </SpaceBackground>
  );
};

export default Index;
