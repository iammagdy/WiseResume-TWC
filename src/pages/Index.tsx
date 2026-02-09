import { lazy, Suspense } from 'react';
import { 
  HeroSkeleton,
  SocialProofSkeleton,
  HowItWorksSkeleton,
  FeatureGridSkeleton,
  TemplateGallerySkeleton,
  BottomCTASkeleton
} from '@/components/landing/LandingSkeletons';
import { LazySection } from '@/components/landing/LazySection';
import { SpaceBackground } from '@/components/landing/SpaceBackground';

// Lazy load heavy components not needed for initial render
const HeroSection = lazy(() => import('@/components/landing/HeroSection').then(m => ({ default: m.HeroSection })));
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
