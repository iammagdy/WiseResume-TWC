import { Suspense, ReactNode } from 'react';
import { useInView } from '@/hooks/useInView';

interface LazySectionProps {
  children: ReactNode;
  skeleton: ReactNode;
  rootMargin?: string;
}

export function LazySection({ children, skeleton, rootMargin = '200px' }: LazySectionProps) {
  const { ref, inView } = useInView({ rootMargin, triggerOnce: true });

  return (
    <div ref={ref}>
      {inView ? (
        <Suspense fallback={skeleton}>
          {children}
        </Suspense>
      ) : (
        skeleton
      )}
    </div>
  );
}
