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
import { lazyWithRetry } from '@/lib/lazyWithRetry';

const SocialProofBar = lazyWithRetry(() => import('@/components/landing/SocialProofBar').then(m => ({ default: m.SocialProofBar })));
const WhyWiseResume = lazyWithRetry(() => import('@/components/landing/WhyWiseResume').then(m => ({ default: m.WhyWiseResume })));
const HowItWorks = lazyWithRetry(() => import('@/components/landing/HowItWorks').then(m => ({ default: m.HowItWorks })));
const FeatureGrid = lazyWithRetry(() => import('@/components/landing/FeatureGrid').then(m => ({ default: m.FeatureGrid })));
const TemplateGallery = lazyWithRetry(() => import('@/components/landing/TemplateGallery').then(m => ({ default: m.TemplateGallery })));
const BottomCTA = lazyWithRetry(() => import('@/components/landing/BottomCTA').then(m => ({ default: m.BottomCTA })));

const Index = () => {
  return (
    <SpaceBackground>
      <main className="min-h-screen">
        {/* Hero loads immediately - no Suspense for LCP */}
        <HeroSection />
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
