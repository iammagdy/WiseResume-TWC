import { lazy, Suspense } from 'react';
import { 
  SocialProofSkeleton,
  HowItWorksSkeleton,
  FeatureGridSkeleton,
  TemplateGallerySkeleton,
  BottomCTASkeleton
} from '@/components/landing/LandingSkeletons';
import { LazySection } from '@/components/landing/LazySection';
import { SpaceBackground } from '@/components/landing/SpaceBackground';
import { HeroSection } from '@/components/landing/HeroSection';
import { QuickActions } from '@/components/landing/QuickActions';
const SocialProofBar = lazy(() => import('@/components/landing/SocialProofBar').then(m => ({ default: m.SocialProofBar })));
const WhyWiseResume = lazy(() => import('@/components/landing/WhyWiseResume').then(m => ({ default: m.WhyWiseResume })));
const HowItWorks = lazy(() => import('@/components/landing/HowItWorks').then(m => ({ default: m.HowItWorks })));
const FeatureGrid = lazy(() => import('@/components/landing/FeatureGrid').then(m => ({ default: m.FeatureGrid })));
const TemplateGallery = lazy(() => import('@/components/landing/TemplateGallery').then(m => ({ default: m.TemplateGallery })));
const BottomCTA = lazy(() => import('@/components/landing/BottomCTA').then(m => ({ default: m.BottomCTA })));

const Index = () => {
  return (
    <SpaceBackground>
      <main className="min-h-screen">
        {/* Hero loads immediately - no Suspense for LCP */}
        <HeroSection />
        <QuickActions />
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
