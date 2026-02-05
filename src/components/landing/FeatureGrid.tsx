import { Target, Zap, Radio } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';

const features = [
  {
    icon: Target,
    title: 'Orbit Score',
    description: 'Match to any job posting instantly',
    gradient: 'from-primary/30 to-primary/5',
    glowColor: 'hsl(var(--primary) / 0.3)',
  },
  {
    icon: Zap,
    title: 'Warp Tailor',
    description: 'Optimize each application at lightspeed',
    gradient: 'from-secondary/30 to-secondary/5',
    glowColor: 'hsl(var(--secondary) / 0.3)',
  },
  {
    icon: Radio,
    title: 'Beam Export',
    description: 'Transmit polished PDF in one tap',
    gradient: 'from-accent/30 to-accent/5',
    glowColor: 'hsl(var(--accent) / 0.3)',
  },
];

export function FeatureGrid() {
  return (
    <section className="py-16 px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-10"
      >
        <p className="text-secondary text-sm font-medium tracking-wider uppercase mb-2">
          ⚡ Powered by AI
        </p>
        <h2 className="font-display text-2xl font-bold text-foreground">
          Cosmic Capabilities
        </h2>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.15 }}
          >
            <Card 
              className="group relative overflow-hidden border-border/30 bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-all duration-500"
              style={{
                boxShadow: `0 0 0 transparent`,
              }}
            >
              {/* Gradient background */}
              <div 
                className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                aria-hidden="true"
              />
              
              {/* Star particles effect on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 overflow-hidden" aria-hidden="true">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-white rounded-full"
                    style={{
                      left: `${20 + i * 15}%`,
                      top: `${30 + (i % 3) * 20}%`,
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
              
              <CardContent className="relative p-6 text-center">
                {/* Floating icon with glow */}
                <motion.div 
                  className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4"
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
                  <feature.icon className="w-7 h-7 text-primary" />
                </motion.div>

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
