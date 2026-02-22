import { useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';

const sectionHeaderSlide = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.25, 0, 0, 1] as const } },
};

export function SectionHeader({ icon, title, style }: { icon: React.ReactNode; title: string; style: string }) {
  const wrapperClass = "flex flex-col gap-0 mb-6";
  const motionProps = {
    variants: sectionHeaderSlide,
    initial: "hidden" as const,
    whileInView: "visible" as const,
    viewport: { once: true, margin: '-40px' },
  };

  const observerRef = useRef<IntersectionObserver | null>(null);
  const lineRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useCallback((node: HTMLHeadingElement | null) => {
    if (observerRef.current) { observerRef.current.disconnect(); observerRef.current = null; }
    if (!node) return;
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          node.classList.add('title-revealed');
          lineRef.current?.classList.add('pf-section-line-drawn');
          observerRef.current?.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observerRef.current.observe(node);
  }, []);
  useEffect(() => () => { observerRef.current?.disconnect(); }, []);

  const lineEl = <div ref={lineRef} className="pf-section-line" style={{ background: 'var(--pf-accent)' }} />;

  // Developer Terminal
  if (style === 'developer-terminal') {
    return (
      <motion.div {...motionProps} className={wrapperClass}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono font-bold" style={{ color: 'var(--pf-accent)' }}>&gt;_</span>
          <h2 ref={titleRef} className="text-lg font-bold tracking-tight pf-section-title font-mono" style={{ color: 'var(--pf-fg, inherit)', fontFamily: "'Fira Code', 'JetBrains Mono', monospace" }}>{title}</h2>
          <div className="flex-1 h-px opacity-15" style={{ background: 'var(--pf-fg, #fff)' }} />
        </div>
        {lineEl}
      </motion.div>
    );
  }

  // Creative Spotlight
  if (style === 'creative-spotlight') {
    return (
      <motion.div {...motionProps} className={wrapperClass}>
        <h2 ref={titleRef} className="text-2xl font-black tracking-tight pf-section-title" style={{
          fontFamily: "'Space Grotesk', var(--pf-heading-font)",
          background: `linear-gradient(135deg, var(--pf-fg, #1a1a2e), var(--pf-accent))`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>{title}</h2>
        {lineEl}
      </motion.div>
    );
  }

  // Executive Suite
  if (style === 'executive-suite') {
    return (
      <motion.div {...motionProps} className={wrapperClass}>
        <div className="flex items-center gap-3">
          <span className="opacity-40" style={{ color: 'var(--pf-fg, inherit)' }}>{icon}</span>
          <h2 ref={titleRef} className="text-lg font-semibold tracking-normal pf-section-title" style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: 'var(--pf-fg, inherit)' }}>{title}</h2>
        </div>
        <div className="h-px mt-2" style={{ background: 'var(--pf-border, #e5e7eb)' }} />
        {lineEl}
      </motion.div>
    );
  }

  // Freelancer Starter
  if (style === 'freelancer-starter') {
    return (
      <motion.div {...motionProps} className={wrapperClass}>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full" style={{ background: 'var(--pf-accent)' }} />
          <h2 ref={titleRef} className="text-xl font-bold pf-section-title" style={{ fontFamily: 'var(--pf-heading-font)', color: 'var(--pf-fg, inherit)' }}>{title}</h2>
        </div>
        {lineEl}
      </motion.div>
    );
  }

  // Neon Cyber
  if (style === 'neon-cyber') {
    return (
      <motion.div {...motionProps} className={wrapperClass}>
        <div className="flex items-center gap-3">
          <span style={{ color: 'var(--pf-accent)' }}>{icon}</span>
          <h2 ref={titleRef} className="text-lg font-bold tracking-tight pf-section-title" style={{ color: 'var(--pf-fg, inherit)', fontFamily: "'Space Grotesk', var(--pf-heading-font)" }}>{title}</h2>
        </div>
        <div ref={lineRef} className="pf-neon-underline mt-1 rounded-full" style={{ height: '2px' }} />
      </motion.div>
    );
  }

  // Classic Clean
  if (style === 'classic-clean') {
    return (
      <motion.div {...motionProps} className={wrapperClass}>
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: 'var(--pf-accent)' }} />
          <h2 ref={titleRef} className="text-xl font-bold pf-section-title" style={{ fontFamily: 'var(--pf-heading-font)', color: 'var(--pf-fg, inherit)' }}>{title}</h2>
          <div className="flex-1 h-px opacity-20" style={{ background: 'var(--pf-fg, #111)' }} />
        </div>
        {lineEl}
      </motion.div>
    );
  }

  // Bold Dark
  if (style === 'bold-dark') {
    return (
      <motion.div {...motionProps} className={wrapperClass}>
        <div className="flex items-center gap-3">
          <span className="text-[var(--pf-accent)]">{icon}</span>
          <h2 ref={titleRef} className="text-2xl font-black tracking-tight pf-section-title" style={{
            fontFamily: 'var(--pf-heading-font)',
            background: `linear-gradient(135deg, var(--pf-accent), color-mix(in srgb, var(--pf-accent) 50%, white))`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>{title}</h2>
        </div>
        {lineEl}
      </motion.div>
    );
  }

  // Default (minimal / glass-pro)
  return (
    <motion.div {...motionProps} className={wrapperClass}>
      <div className="flex items-center gap-3">
        <span style={{ color: 'var(--pf-accent)' }}>{icon}</span>
        <h2 ref={titleRef} className="text-lg font-bold tracking-tight pf-section-title" style={{ color: 'var(--pf-fg, inherit)', fontFamily: 'var(--pf-heading-font)' }}>{title}</h2>
        <div className="flex-1 h-px" style={{ background: 'var(--pf-border, rgba(255,255,255,0.08))' }} />
      </div>
      {lineEl}
    </motion.div>
  );
}
