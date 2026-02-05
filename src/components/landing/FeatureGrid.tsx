import { Target, Sparkles, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';

const features = [
  {
    icon: Target,
    title: 'AI Score',
    description: 'Match to any job posting instantly',
    gradient: 'from-primary/20 to-primary/5',
  },
  {
    icon: Sparkles,
    title: 'Smart Tailor',
    description: 'Optimize each application automatically',
    gradient: 'from-accent/20 to-accent/5',
  },
  {
    icon: FileText,
    title: 'Pro Export',
    description: 'Polished PDF in one tap',
    gradient: 'from-success/20 to-success/5',
  },
];

export function FeatureGrid() {
  return (
    <section className="py-12 px-6">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="font-display text-2xl font-bold text-center text-foreground mb-8"
      >
        Powered by AI
      </motion.h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="group relative overflow-hidden border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              {/* Gradient background */}
              <div 
                className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-50 group-hover:opacity-100 transition-opacity`}
                aria-hidden="true"
              />
              
              <CardContent className="relative p-6 text-center">
                {/* Floating icon */}
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-background/80 mb-4 group-hover:animate-float">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>

                <h3 className="font-display font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>

                <p className="text-sm text-muted-foreground">
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
