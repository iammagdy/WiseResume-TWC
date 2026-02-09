import { motion } from 'framer-motion';
import { ArrowRight, Mic, Users, FileCheck, LayoutGrid } from 'lucide-react';
import { Card } from '@/components/ui/card';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export function WhyWiseResume() {
  return (
    <section className="py-16 px-4 sm:px-6">
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-10"
      >
        <p className="text-secondary text-xs sm:text-sm font-medium tracking-wider uppercase mb-2">
          ✦ What Makes Us Different
        </p>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
          Why WiseResume?
        </h2>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="max-w-md mx-auto space-y-4"
      >
        {/* Before/After Transformation Card */}
        <motion.div variants={itemVariants}>
          <BulletTransformCard />
        </motion.div>

        {/* Feature Grid */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div variants={itemVariants}>
            <FeatureCard
              icon={<Users className="w-5 h-5 text-rose-500" />}
              title="4 AI Recruiters"
              description="Get feedback from different perspectives"
              gradient="from-rose-500/20 to-rose-500/5"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <FeatureCard
              icon={<Mic className="w-5 h-5 text-orange-500" />}
              title="Voice Interview"
              description="Practice with real-time AI coaching"
              gradient="from-orange-500/20 to-orange-500/5"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <FeatureCard
              icon={<FileCheck className="w-5 h-5 text-emerald-500" />}
              title="ATS Optimized"
              description="Pass automated screening systems"
              gradient="from-emerald-500/20 to-emerald-500/5"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <FeatureCard
              icon={<LayoutGrid className="w-5 h-5 text-blue-500" />}
              title="12 Templates"
              description="Professional designs for any role"
              gradient="from-blue-500/20 to-blue-500/5"
            />
          </motion.div>
        </div>

        {/* ATS Score Preview */}
        <motion.div variants={itemVariants}>
          <ATSScoreCard />
        </motion.div>
      </motion.div>
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
          <p className="text-xs text-muted-foreground">From vague to impactful</p>
        </div>
      </div>
      
      <div className="space-y-3">
        {/* Before */}
        <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
          <p className="text-xs text-destructive font-medium mb-1">Before</p>
          <p className="text-sm text-muted-foreground">"Worked on frontend development"</p>
        </div>
        
        {/* Arrow */}
        <div className="flex justify-center">
          <motion.div
            animate={{ y: [0, 4, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"
          >
            <ArrowRight className="w-4 h-4 text-primary rotate-90" />
          </motion.div>
        </div>
        
        {/* After */}
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

function ATSScoreCard() {
  return (
    <Card className="p-5 border-border/30 bg-card/50 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <FileCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="font-semibold text-sm">ATS Match Score</span>
        </div>
        <span className="text-2xl font-bold text-emerald-500">92%</span>
      </div>
      
      {/* Progress bar */}
      <div className="h-2 rounded-full bg-muted/50 overflow-hidden mb-3">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: '92%' }}
          viewport={{ once: true }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
        />
      </div>
      
      {/* Keywords */}
      <div className="flex flex-wrap gap-1.5">
        {['React', 'TypeScript', 'Node.js', 'AWS', '+8 more'].map((keyword, i) => (
          <span 
            key={keyword}
            className={`px-2 py-0.5 rounded-full text-xs ${
              i < 4 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'
            }`}
          >
            {keyword}
          </span>
        ))}
      </div>
    </Card>
  );
}
