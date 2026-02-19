import { Star, Rocket, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const stats = [
  { icon: Star, value: '4.9', label: 'Stellar', color: 'text-[hsl(var(--space-star))]' },
  { icon: Rocket, value: '12,000+', label: 'Missions', color: 'text-primary' },
  { icon: Zap, value: 'Free', label: 'To Launch', color: 'text-secondary' },
];

const testimonials = [
  { quote: 'Got 3 callbacks in a week after tailoring my resume with the AI.', name: 'Marcus T.', role: 'Software Engineer' },
  { quote: 'The voice interview feature helped me stop rambling. Game changer.', name: 'Priya K.', role: 'Product Manager' },
  { quote: 'ATS score went from 42% to 91% after one tailoring session.', name: 'James O.', role: 'Data Analyst' },
];

export function SocialProofBar() {
  return (
    <motion.section
      className="py-6 px-4"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, amount: 0.2 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* Stats row */}
      <motion.div
        className="flex items-center justify-center mb-5"
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: false, amount: 0.3 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <div className="inline-flex items-center gap-5 sm:gap-8 px-5 py-3 rounded-2xl bg-card/40 backdrop-blur-sm border border-border/20">
          {stats.map((stat, index) => (
            <div key={index} className="flex items-center gap-2">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
              <div className="text-center">
                <p className="font-display font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Testimonial cards — horizontally scrollable on mobile */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory max-w-2xl mx-auto">
        {testimonials.map((t, index) => (
          <motion.div
            key={t.name}
            className="flex-shrink-0 snap-start w-[260px] sm:w-auto sm:flex-1 p-4 rounded-2xl bg-card/40 backdrop-blur-sm border border-border/20"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{ delay: index * 0.1, duration: 0.4, ease: 'easeOut' }}
          >
            <p className="text-xs text-muted-foreground italic mb-3 leading-relaxed">"{t.quote}"</p>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                {t.name.charAt(0)}
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">{t.name}</p>
                <p className="text-[10px] text-muted-foreground">{t.role}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
