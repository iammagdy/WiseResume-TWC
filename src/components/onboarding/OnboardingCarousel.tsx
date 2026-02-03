import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, Sparkles, Download, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OnboardingStep } from './OnboardingStep';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';

const steps = [
  {
    icon: Upload,
    title: 'Upload or Start Fresh',
    description: 'Import your existing resume or create a new one from scratch with our guided editor.',
    gradient: 'primary' as const,
  },
  {
    icon: Sparkles,
    title: 'AI-Powered Tailoring',
    description: 'Paste any job description and let AI optimize your resume for maximum impact.',
    gradient: 'secondary' as const,
  },
  {
    icon: Download,
    title: 'Export Professionally',
    description: 'Download your polished resume as a stunning PDF, ready for your dream job.',
    gradient: 'accent' as const,
  },
];

interface OnboardingCarouselProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function OnboardingCarousel({ onComplete, onSkip }: OnboardingCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLastStep = activeIndex === steps.length - 1;

  // Handle scroll to update active index
  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const handleScroll = () => {
      const scrollLeft = scrollEl.scrollLeft;
      const width = scrollEl.offsetWidth;
      const newIndex = Math.round(scrollLeft / width);
      
      if (newIndex !== activeIndex && newIndex >= 0 && newIndex < steps.length) {
        setActiveIndex(newIndex);
        haptics.selection();
      }
    };

    scrollEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollEl.removeEventListener('scroll', handleScroll);
  }, [activeIndex]);

  const scrollToIndex = (index: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        left: index * scrollRef.current.offsetWidth,
        behavior: 'smooth',
      });
    }
  };

  const handleNext = () => {
    haptics.light();
    if (isLastStep) {
      onComplete();
    } else {
      scrollToIndex(activeIndex + 1);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Skip button */}
      <div className="flex justify-end p-4 pt-safe">
        <Button
          variant="ghost"
          onClick={() => {
            haptics.light();
            onSkip();
          }}
          className="text-muted-foreground"
        >
          Skip
        </Button>
      </div>

      {/* Carousel */}
      <div
        ref={scrollRef}
        className="flex-1 flex overflow-x-auto snap-x-mandatory scrollbar-hide"
      >
        {steps.map((step, index) => (
          <OnboardingStep
            key={index}
            {...step}
            isActive={index === activeIndex}
          />
        ))}
      </div>

      {/* Dots and CTA */}
      <div className="p-6 pb-safe space-y-6">
        {/* Dots */}
        <div className="flex justify-center gap-2">
          {steps.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                haptics.selection();
                scrollToIndex(index);
              }}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                index === activeIndex
                  ? 'w-8 bg-primary'
                  : 'w-2 bg-muted-foreground/30'
              )}
            />
          ))}
        </div>

        {/* CTA Button */}
        <Button
          size="lg"
          onClick={handleNext}
          className="w-full h-14 text-lg font-semibold gradient-primary"
          style={{
            boxShadow: '0 8px 32px -8px hsl(var(--primary) / 0.5)',
          }}
        >
          {isLastStep ? 'Get Started' : 'Next'}
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}
