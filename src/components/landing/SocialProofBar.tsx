import { Star, Rocket, Zap } from 'lucide-react';

const stats = [
  { icon: Star, value: '4.9', label: 'Stellar', color: 'text-[hsl(var(--space-star))]' },
  { icon: Rocket, value: '12,000+', label: 'Missions', color: 'text-primary' },
  { icon: Zap, value: 'Free', label: 'To Launch', color: 'text-secondary' },
];

export function SocialProofBar() {
  return (
    <section className="py-6 px-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
      <div className="flex items-center justify-center">
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
      </div>
    </section>
  );
}
