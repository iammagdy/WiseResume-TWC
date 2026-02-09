import { Skeleton } from '@/components/ui/skeleton';

// Hero Section Skeleton - no motion, pure CSS
export function HeroSkeleton() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="relative z-10 flex flex-col items-center text-center max-w-md mx-auto">
        <div className="mb-8">
          <Skeleton className="w-32 h-32 rounded-full" />
        </div>
        <div className="mb-2">
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="mb-4">
          <Skeleton className="h-12 w-64" />
        </div>
        <div className="mb-10">
          <Skeleton className="h-6 w-72" />
        </div>
        <div className="w-full space-y-4">
          <Skeleton className="h-14 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
        <div className="mt-8">
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
    </section>
  );
}

// Social Proof Bar Skeleton
export function SocialProofSkeleton() {
  return (
    <section className="py-8 px-4">
      <div className="flex items-center justify-center">
        <div className="inline-flex items-center gap-6 sm:gap-10 px-6 py-4 rounded-2xl bg-card/50 border border-border/30">
          {[0, 1, 2].map((index) => (
            <div key={index} className="flex items-center gap-2">
              <Skeleton className="w-5 h-5 rounded" />
              <div className="text-center space-y-1">
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-3 w-10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// How It Works Skeleton
export function HowItWorksSkeleton() {
  return (
    <section className="py-16 px-6">
      <div className="text-center mb-10">
        <Skeleton className="h-4 w-24 mx-auto mb-2" />
        <Skeleton className="h-8 w-40 mx-auto" />
      </div>
      <div className="flex items-start justify-center gap-4 sm:gap-8 max-w-md mx-auto">
        {[0, 1, 2].map((index) => (
          <div key={index} className="flex flex-col items-center text-center flex-1">
            <div className="relative mb-4">
              <Skeleton className="w-16 h-16 rounded-full" />
            </div>
            <Skeleton className="h-5 w-14 rounded-full mb-1" />
            <Skeleton className="h-4 w-16 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    </section>
  );
}

// Feature Grid Skeleton
export function FeatureGridSkeleton() {
  return (
    <section className="py-16 px-6">
      <div className="text-center mb-10">
        <Skeleton className="h-4 w-28 mx-auto mb-2" />
        <Skeleton className="h-8 w-48 mx-auto" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
        {[0, 1, 2].map((index) => (
          <div key={index} className="rounded-xl border border-border/30 bg-card/50 p-6">
            <Skeleton className="w-14 h-14 rounded-full mx-auto mb-4" />
            <Skeleton className="h-5 w-24 mx-auto mb-2" />
            <Skeleton className="h-4 w-32 mx-auto" />
          </div>
        ))}
      </div>
    </section>
  );
}

// Template Gallery Skeleton
export function TemplateGallerySkeleton() {
  return (
    <section className="py-16">
      <div className="text-center mb-10 px-6">
        <Skeleton className="h-4 w-24 mx-auto mb-2" />
        <Skeleton className="h-8 w-52 mx-auto" />
      </div>
      <div className="flex gap-6 px-8 pb-6 overflow-hidden">
        {[0, 1, 2].map((index) => (
          <div key={index} className="flex-shrink-0 w-[75%] min-w-[200px] sm:w-[40%]">
            <Skeleton className="aspect-[3/4] rounded-xl" />
            <div className="text-center mt-4 space-y-2">
              <Skeleton className="h-5 w-20 mx-auto" />
              <Skeleton className="h-3 w-14 mx-auto" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-2 mt-2">
        {[0, 1, 2].map((index) => (
          <Skeleton
            key={index}
            className={`h-2 rounded-full ${index === 1 ? 'w-6' : 'w-2'}`}
          />
        ))}
      </div>
    </section>
  );
}

// Bottom CTA Skeleton
export function BottomCTASkeleton() {
  return (
    <section className="py-20 px-6 relative overflow-hidden">
      <div className="max-w-md mx-auto text-center">
        <Skeleton className="w-16 h-16 rounded-full mx-auto mb-6" />
        <Skeleton className="h-9 w-64 mx-auto mb-4" />
        <Skeleton className="h-5 w-72 mx-auto mb-8" />
        <Skeleton className="h-14 w-full rounded-lg mb-8" />
        <Skeleton className="h-4 w-40 mx-auto" />
      </div>
    </section>
  );
}

// Full Landing Page Skeleton
export function LandingPageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <HeroSkeleton />
      <SocialProofSkeleton />
      <HowItWorksSkeleton />
      <FeatureGridSkeleton />
      <TemplateGallerySkeleton />
      <BottomCTASkeleton />
    </div>
  );
}
