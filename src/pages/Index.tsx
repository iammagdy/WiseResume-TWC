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

  // Always show landing page - users can access dashboard via navigation

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
