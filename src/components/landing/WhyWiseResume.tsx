import { ArrowRight, Mic, Users, FileCheck, LayoutGrid } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';

export function WhyWiseResume() {
  return (
    <section className="py-16 px-4 sm:px-6">
      <motion.div
        className="text-center mb-10"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <p className="text-secondary text-xs sm:text-sm font-medium tracking-wider uppercase mb-2">
          What Makes Us Different
        </p>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
          Why WiseResume?
        </h2>
      </motion.div>

      <div className="max-w-md mx-auto space-y-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, filter: 'blur(4px)' }}
          whileInView={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <BulletTransformCard />
        </motion.div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: <Users className="w-5 h-5 text-rose-500" />, title: '4 AI Recruiter Personas', description: 'Fortune 500, Startup, Tech & Executive all review your resume', gradient: 'from-rose-500/20 to-rose-500/5' },
            { icon: <Mic className="w-5 h-5 text-orange-500" />, title: 'Real Voice Coach', description: 'Speak out loud — AI listens, evaluates, and coaches you live', gradient: 'from-orange-500/20 to-orange-500/5' },
            { icon: <FileCheck className="w-5 h-5 text-emerald-500" />, title: 'Beat the ATS Filter', description: 'See your exact match score, then AI fixes every gap instantly', gradient: 'from-emerald-500/20 to-emerald-500/5' },
            { icon: <LayoutGrid className="w-5 h-5 text-blue-500" />, title: '12 Pro Templates', description: 'Polished designs built to impress across every industry', gradient: 'from-blue-500/20 to-blue-500/5' },
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, x: -30, rotate: -1 }}
              whileInView={{ opacity: 1, x: 0, rotate: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: i * 0.1, duration: 0.5, ease: 'easeOut' }}
            >
              <FeatureCard {...feature} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BulletTransformCard() {
  return (
    <Card className="p-5 border-border/30 bg-card/50 backdrop-blur-sm overflow-hidden">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-lg">✨</span>
        </div>
        <div>
          <h3 className="font-semibold text-sm">AI Bullet Transformation</h3>
          <p className="text-xs text-muted-foreground">From vague to impactful in one tap</p>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
          <p className="text-xs text-destructive font-medium mb-1">Before</p>
          <p className="text-sm text-muted-foreground">"Worked on frontend development"</p>
        </div>
        
        <div className="flex justify-center">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center animate-bounce-gentle">
            <ArrowRight className="w-4 h-4 text-primary rotate-90" />
          </div>
        </div>
        
        <div className="p-3 rounded-lg bg-success/5 border border-success/20">
          <p className="text-xs text-success font-medium mb-1">After</p>
          <p className="text-sm text-foreground">
            "Built <span className="text-primary font-medium">15+ React components</span> serving <span className="text-primary font-medium">50K+ users</span>, reducing load time by <span className="text-primary font-medium">40%</span>"
          </p>
        </div>
      </div>
    </Card>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
}

function FeatureCard({ icon, title, description, gradient }: FeatureCardProps) {
  return (
    <Card className="p-4 border-border/30 bg-card/50 backdrop-blur-sm h-full">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <h3 className="font-semibold text-sm mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </Card>
  );
}
