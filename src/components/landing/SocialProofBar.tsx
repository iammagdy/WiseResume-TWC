import { Star, FileCheck, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';

function AnimatedCounter({ end, duration = 2000 }: { end: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          let start = 0;
          const increment = end / (duration / 16);
          const timer = setInterval(() => {
            start += increment;
            if (start >= end) {
              setCount(end);
              clearInterval(timer);
            } else {
              setCount(Math.floor(start));
            }
          }, 16);
          return () => clearInterval(timer);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [end, duration, hasAnimated]);

  return <span ref={ref}>{count.toLocaleString()}</span>;
}

export function SocialProofBar() {
  const stats = [
    {
      icon: Star,
      value: '4.9',
      label: 'Rating',
      isStatic: true,
    },
    {
      icon: FileCheck,
      value: 12000,
      label: 'Resumes',
      suffix: '+',
    },
    {
      icon: Zap,
      value: 'Free',
      label: 'to Start',
      isStatic: true,
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="py-6 px-4"
    >
      <div className="flex items-center justify-center gap-6 sm:gap-10">
        {stats.map((stat, index) => (
          <div key={index} className="flex items-center gap-2">
            <stat.icon className="w-5 h-5 text-primary" />
            <div className="text-center">
              <p className="font-display font-bold text-foreground">
                {stat.isStatic ? (
                  stat.value
                ) : (
                  <>
                    <AnimatedCounter end={stat.value as number} />
                    {stat.suffix}
                  </>
                )}
              </p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
