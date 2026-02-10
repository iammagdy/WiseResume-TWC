import { Target, Wand2, Mic, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const features = [
  {
    icon: Target,
    title: 'ATS Match Score',
    description: 'Instantly see how well you match any job posting',
    gradient: 'from-emerald-500/30 to-emerald-500/5',
    iconColor: 'text-emerald-500',
  },
  {
    icon: Wand2,
    title: 'Smart Tailor',
    description: 'AI adapts your resume to each job automatically',
    gradient: 'from-primary/30 to-primary/5',
    iconColor: 'text-primary',
  },
  {
    icon: Mic,
    title: 'Voice Interview',
    description: 'Practice with AI voice coaching and real-time feedback',
    gradient: 'from-orange-500/30 to-orange-500/5',
    iconColor: 'text-orange-500',
  },
  {
    icon: Users,
    title: '4 AI Recruiters',
    description: 'Get feedback from Fortune 500, Startup, Tech & Executive perspectives',
    gradient: 'from-rose-500/30 to-rose-500/5',
    iconColor: 'text-rose-500',
  },
];

export function FeatureGrid() {
  return (
    <section className="py-12 sm:py-16 px-4 sm:px-6">
      <div className="text-center mb-8 sm:mb-10 animate-fade-in-up">
        <p className="text-secondary text-xs sm:text-sm font-medium tracking-wider uppercase mb-2">
          AI-Powered Features
        </p>
        <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
          Everything You Need to Land the Job
        </h2>
      </div>

      <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4 max-w-lg mx-auto">
        {features.map((feature, index) => (
          <div
            key={feature.title}
            className="animate-fade-in-up"
            style={{ animationDelay: `${index * 0.08}s` }}
          >
            <Card 
              className="group relative overflow-hidden border-border/30 bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-all duration-500 h-full"
            >
              {/* Gradient background on hover */}
              <div 
                className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                aria-hidden="true"
              />
              
              <CardContent className="relative p-4 sm:p-5">
                <div 
                  className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl mb-3 transition-transform duration-300 group-hover:-translate-y-1"
                  style={{
                    background: `radial-gradient(circle, hsl(var(--card)) 0%, hsl(var(--background)) 100%)`,
                    border: '1px solid hsl(var(--border) / 0.5)',
                  }}
                >
                  <feature.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${feature.iconColor}`} />
                </div>

                <h3 className="font-display font-semibold text-sm sm:text-base text-foreground mb-1">
                  {feature.title}
                </h3>

                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </section>
  );
}
