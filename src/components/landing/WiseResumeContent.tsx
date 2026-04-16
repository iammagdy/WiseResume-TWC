import { lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { FileText, Wand2, Globe, Mic, Briefcase } from 'lucide-react';

const LazyFeatureSection = lazy(() =>
  import('@/components/landing/FeatureSection').then((m) => ({ default: m.FeatureSection }))
);
const LazyTrustSection = lazy(() =>
  import('@/components/landing/TrustSection').then((m) => ({ default: m.TrustSection }))
);
const LazyFooter = lazy(() =>
  import('@/components/landing/Footer').then((m) => ({ default: m.Footer }))
);

const FEATURES = [
  {
    icon: FileText,
    title: 'ATS-Optimized Resumes',
    desc: 'Build resumes that pass applicant tracking systems and impress hiring managers.',
  },
  {
    icon: Wand2,
    title: 'AI Tailoring',
    desc: 'One-click tailoring to match any job description. Score higher on every application.',
  },
  {
    icon: Globe,
    title: 'Portfolio Websites',
    desc: 'A beautiful portfolio site generated from your resume. Share your work anywhere.',
  },
  {
    icon: Mic,
    title: 'Interview Coaching',
    desc: 'Practice with an AI interviewer and get real-time feedback to ace your interviews.',
  },
  {
    icon: Briefcase,
    title: 'Job Tracking',
    desc: 'Track applications, follow-ups, and interview stages all in one place.',
  },
];

interface WiseResumeContentProps {
  prefersReducedMotion: boolean | null;
  isDark: boolean;
  onCTA: (plan?: string) => void;
}

export function WiseResumeContent({ prefersReducedMotion, onCTA }: WiseResumeContentProps) {
  return (
    <>
      <section style={{ padding: '4rem 1.25rem', maxWidth: 1100, margin: '0 auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: i * 0.07, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              style={{
                padding: '1.5rem',
                borderRadius: '12px',
                border: '1px solid var(--lp-border, rgba(0,0,0,0.08))',
                background: 'var(--lp-card-bg, rgba(255,255,255,0.5))',
              }}
            >
              <f.icon
                size={24}
                style={{ color: '#b91c1c', marginBottom: '0.75rem' }}
              />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--lp-text, #111)' }}>
                {f.title}
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--lp-muted, #666)', lineHeight: 1.6 }}>
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      <Suspense fallback={null}>
        <LazyTrustSection />
      </Suspense>

      <section style={{ padding: '4rem 1.25rem', textAlign: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', fontWeight: 800, marginBottom: '1rem', color: 'var(--lp-text, #111)' }}>
            Ready to land your next role?
          </h2>
          <p style={{ color: 'var(--lp-muted, #666)', marginBottom: '1.75rem', lineHeight: 1.65 }}>
            Join thousands of job seekers using WiseResume to get hired faster.
          </p>
          <button
            onClick={() => onCTA()}
            style={{
              padding: '0.8rem 2rem',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #b91c1c 0%, #9E1B22 100%)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '1rem',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 16px rgba(185,28,28,0.35)',
            }}
          >
            Start for Free
          </button>
        </div>
      </section>

      <Suspense fallback={null}>
        <LazyFooter lpMode />
      </Suspense>
    </>
  );
}
