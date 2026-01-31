import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Sparkles, Download } from 'lucide-react';

const features = [
  {
    icon: Target,
    title: 'AI Scoring',
    description: 'Match your resume to any job',
    gradient: 'from-primary to-primary/60',
  },
  {
    icon: Sparkles,
    title: 'Smart Tailor',
    description: 'Optimize for each application',
    gradient: 'from-secondary to-secondary/60',
  },
  {
    icon: Download,
    title: 'Instant PDF',
    description: 'Export professional resumes',
    gradient: 'from-accent to-accent/60',
  },
];

export function FeatureCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollRef.current) return;
      
      const scrollLeft = scrollRef.current.scrollLeft;
      const cardWidth = 180 + 16; // card width + gap
      const newIndex = Math.round(scrollLeft / cardWidth);
      
      setActiveIndex(Math.min(newIndex, features.length - 1));
    };

    const ref = scrollRef.current;
    ref?.addEventListener('scroll', handleScroll);
    return () => ref?.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="w-full">
      {/* Scrollable cards */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto px-6 pb-4 snap-x snap-mandatory scrollbar-hide"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            className="flex-shrink-0 w-[180px] snap-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 + 0.3 }}
          >
            <div
              className="h-[160px] rounded-2xl glass border border-border/50 p-5 flex flex-col items-center justify-center text-center touch-manipulation active:scale-[0.98] transition-transform"
              style={{
                boxShadow: activeIndex === index 
                  ? '0 8px 32px -8px hsl(var(--primary) / 0.3)' 
                  : 'none',
              }}
            >
              {/* Icon container */}
              <div
                className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-3`}
                style={{
                  boxShadow: '0 4px 16px -4px hsl(var(--primary) / 0.3)',
                }}
              >
                <feature.icon className="w-7 h-7 text-primary-foreground" />
              </div>

              {/* Title */}
              <h3 className="font-semibold text-base mb-1">{feature.title}</h3>

              {/* Description */}
              <p className="text-xs text-muted-foreground leading-tight">
                {feature.description}
              </p>
            </div>
          </motion.div>
        ))}
        
        {/* Spacer for last card */}
        <div className="flex-shrink-0 w-4" />
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-2 mt-2">
        {features.map((_, index) => (
          <motion.div
            key={index}
            className="w-2 h-2 rounded-full transition-colors duration-200"
            style={{
              backgroundColor: activeIndex === index 
                ? 'hsl(var(--primary))' 
                : 'hsl(var(--muted-foreground) / 0.3)',
            }}
            animate={{
              scale: activeIndex === index ? 1.2 : 1,
            }}
            transition={{ duration: 0.2 }}
          />
        ))}
      </div>
    </div>
  );
}
