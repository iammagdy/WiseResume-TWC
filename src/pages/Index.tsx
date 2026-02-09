import { useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Target, Wand2, Plus, Mic } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
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
import { ResumeCardSkeleton, ActionCardsGridSkeleton } from '@/components/home/HomeSkeletons';
import { HomeBackground } from '@/components/home/HomeBackground';
import { HomeHeroSection } from '@/components/home/HomeHeroSection';
import { ActionPill } from '@/components/home/ActionPill';
import haptics from '@/lib/haptics';

// Lazy load heavy components not needed for initial render
const ResumeCard = lazy(() => import('@/components/home/ResumeCard').then(m => ({ default: m.ResumeCard })));
const JobAnalysisSheet = lazy(() => import('@/components/editor/JobAnalysisSheet').then(m => ({ default: m.JobAnalysisSheet })));
const TailorSheet = lazy(() => import('@/components/editor/TailorSheet').then(m => ({ default: m.TailorSheet })));
const SpaceBackground = lazy(() => import('@/components/landing/SpaceBackground').then(m => ({ default: m.SpaceBackground })));
const HeroSection = lazy(() => import('@/components/landing/HeroSection').then(m => ({ default: m.HeroSection })));
const SocialProofBar = lazy(() => import('@/components/landing/SocialProofBar').then(m => ({ default: m.SocialProofBar })));
const WhyWiseResume = lazy(() => import('@/components/landing/WhyWiseResume').then(m => ({ default: m.WhyWiseResume })));
const HowItWorks = lazy(() => import('@/components/landing/HowItWorks').then(m => ({ default: m.HowItWorks })));
const FeatureGrid = lazy(() => import('@/components/landing/FeatureGrid').then(m => ({ default: m.FeatureGrid })));
const TemplateGallery = lazy(() => import('@/components/landing/TemplateGallery').then(m => ({ default: m.TemplateGallery })));
const BottomCTA = lazy(() => import('@/components/landing/BottomCTA').then(m => ({ default: m.BottomCTA })));
const AlertDialog = lazy(() => import('@/components/ui/alert-dialog').then(m => ({ default: m.AlertDialog })));
const AlertDialogAction = lazy(() => import('@/components/ui/alert-dialog').then(m => ({ default: m.AlertDialogAction })));
const AlertDialogCancel = lazy(() => import('@/components/ui/alert-dialog').then(m => ({ default: m.AlertDialogCancel })));
const AlertDialogContent = lazy(() => import('@/components/ui/alert-dialog').then(m => ({ default: m.AlertDialogContent })));
const AlertDialogDescription = lazy(() => import('@/components/ui/alert-dialog').then(m => ({ default: m.AlertDialogDescription })));
const AlertDialogFooter = lazy(() => import('@/components/ui/alert-dialog').then(m => ({ default: m.AlertDialogFooter })));
const AlertDialogHeader = lazy(() => import('@/components/ui/alert-dialog').then(m => ({ default: m.AlertDialogHeader })));
const AlertDialogTitle = lazy(() => import('@/components/ui/alert-dialog').then(m => ({ default: m.AlertDialogTitle })));

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
            {/* Premium Animated Header */}
            <HomeHeroSection userName={currentResume.contactInfo.fullName || undefined} />

            {/* Returning User Dashboard */}
            <div className="flex-1 flex flex-col px-4 pb-safe">
              {/* Current Resume Card */}
              <motion.section 
                className="mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h2 className="text-sm font-medium text-muted-foreground mb-3">
                  Continue your journey
                </h2>
                <Suspense fallback={<ResumeCardSkeleton />}>
                  <ResumeCard
                    resume={currentResume}
                    matchScore={matchScore}
                    onContinue={handleContinueEditing}
                    onDelete={() => setShowDeleteConfirm(true)}
                  />
                </Suspense>
              </motion.section>

              {/* AI Actions as Pills */}
              <motion.section 
                className="mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-sm font-medium text-muted-foreground mb-3">
                  Quick Actions
                </h2>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-2">
                  <ActionPill
                    icon={Target}
                    label="Match"
                    color="emerald"
                    onClick={() => setShowJobSheet(true)}
                  />
                  <ActionPill
                    icon={Wand2}
                    label="Tailor"
                    color="purple"
                    onClick={() => setShowTailor(true)}
                  />
                  <ActionPill
                    icon={Mic}
                    label="Interview"
                    color="orange"
                    onClick={() => navigate('/interview')}
                  />
                </div>
              </motion.section>

              {/* Animated Create New Button */}
              <motion.section 
                className="mt-auto pb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <motion.button
                  className="relative w-full h-14 rounded-2xl overflow-hidden touch-manipulation group"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    haptics.medium();
                    handleUpload();
                  }}
                >
                  {/* Rotating gradient border */}
                  <div className="absolute inset-0 rotating-border rounded-2xl" />
                  
                  {/* Inner content */}
                  <div className="absolute inset-[2px] rounded-[14px] bg-background/95 flex items-center justify-center gap-2 transition-colors group-hover:bg-background/80">
                    <Plus className="w-5 h-5 text-primary" />
                    <span className="font-medium text-foreground">Create New Resume</span>
                  </div>

                  {/* Shimmer overlay */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  />
                </motion.button>
              </motion.section>

              {/* Sign In Link */}
              <motion.div
                className="text-center pb-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
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
            <Suspense fallback={null}>
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
            </Suspense>
          </div>
        </HomeBackground>
      </MobileLayout>
    );
  }

  // New user: show space-themed landing page
  return (
    <Suspense fallback={<HeroSkeleton />}>
      <SpaceBackground>
        <main className="min-h-screen">
          <Suspense fallback={<HeroSkeleton />}>
            <HeroSection />
          </Suspense>
          <LazySection skeleton={<SocialProofSkeleton />}>
            <SocialProofBar />
          </LazySection>
          <LazySection skeleton={<FeatureGridSkeleton />}>
            <WhyWiseResume />
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
    </Suspense>
  );
};

export default Index;
