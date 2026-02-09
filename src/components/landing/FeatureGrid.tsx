import { Target, Wand2, LayoutGrid, Mic, Shield, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';

const features = [
  {
    icon: Target,
    title: 'ATS Match Score',
    description: 'Instantly see how well you match any job posting',
    gradient: 'from-emerald-500/30 to-emerald-500/5',
    glowColor: 'hsl(160 60% 45% / 0.3)',
    iconColor: 'text-emerald-500',
  },
  {
    icon: Wand2,
    title: 'Smart Tailor',
    description: 'AI adapts your resume to each job automatically',
    gradient: 'from-primary/30 to-primary/5',
    glowColor: 'hsl(var(--primary) / 0.3)',
    iconColor: 'text-primary',
  },
  {
    icon: Mic,
    title: 'Voice Interview',
    description: 'Practice with AI voice coaching and real-time feedback',
    gradient: 'from-orange-500/30 to-orange-500/5',
    glowColor: 'hsl(25 95% 53% / 0.3)',
    iconColor: 'text-orange-500',
  },
  {
    icon: Users,
    title: '4 AI Recruiters',
    description: 'Get feedback from Fortune 500, Startup, Tech & Executive perspectives',
    gradient: 'from-rose-500/30 to-rose-500/5',
    glowColor: 'hsl(350 89% 60% / 0.3)',
    iconColor: 'text-rose-500',
  },
  {
    icon: Shield,
    title: 'AI Humanizer',
    description: 'Rewrite AI-generated content to pass detection',
    gradient: 'from-violet-500/30 to-violet-500/5',
    glowColor: 'hsl(250 91% 66% / 0.3)',
    iconColor: 'text-violet-500',
  },
  {
    icon: LayoutGrid,
    title: '12 Pro Templates',
    description: 'Professional, ATS-friendly designs for any role',
    gradient: 'from-blue-500/30 to-blue-500/5',
    glowColor: 'hsl(217 91% 60% / 0.3)',
    iconColor: 'text-blue-500',
  },
];

export function FeatureGrid() {
  return (
    <section className="py-12 sm:py-16 px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-8 sm:mb-10"
      >
        <p className="text-secondary text-xs sm:text-sm font-medium tracking-wider uppercase mb-2">
          ⚡ AI-Powered Features
        </p>
        <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
          Everything You Need to Land the Job
        </h2>
      </motion.div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 max-w-3xl mx-auto">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
          >
            <Card 
              className="group relative overflow-hidden border-border/30 bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-all duration-500 h-full"
            >
              {/* Gradient background */}
              <div 
                className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                aria-hidden="true"
              />
              
              {/* Star particles effect on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 overflow-hidden" aria-hidden="true">
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-white rounded-full"
                    style={{
                      left: `${20 + i * 25}%`,
                      top: `${30 + (i % 2) * 30}%`,
                    }}
                    animate={{
                      opacity: [0.2, 0.8, 0.2],
                      scale: [0.8, 1.2, 0.8],
                    }}
                    transition={{
                      duration: 2,
                      delay: i * 0.3,
                      repeat: Infinity,
                    }}
                  />
                ))}
              </div>
              
              <CardContent className="relative p-4 sm:p-5">
                {/* Icon */}
                <motion.div 
                  className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl mb-3"
                  style={{
                    background: `radial-gradient(circle, hsl(var(--card)) 0%, hsl(var(--background)) 100%)`,
                    border: '1px solid hsl(var(--border) / 0.5)',
                  }}
                  whileHover={{ 
                    y: -4,
                    boxShadow: `0 10px 30px ${feature.glowColor}`,
                  }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <feature.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${feature.iconColor}`} />
                </motion.div>

                <h3 className="font-display font-semibold text-sm sm:text-base text-foreground mb-1">
                  {feature.title}
                </h3>

                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
