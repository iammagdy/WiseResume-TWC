import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { AppLogo } from '@/components/brand/AppLogo';
import { AppHeroVisual } from '@/components/landing/AppHeroVisual';
import { FeatureCarousel } from '@/components/landing/FeatureCarousel';
import { Button } from '@/components/ui/button';

const Index = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/upload');
  };

  const handleSignIn = () => {
    navigate('/auth');
  };

  return (
    <MobileLayout>
      <div className="min-h-full flex flex-col">
        {/* App Header with Logo */}
        <header className="pt-safe pt-8 pb-4 px-4">
          <AppLogo size="lg" showTagline />
        </header>

        {/* Hero Visual - Takes up middle section */}
        <div className="flex-1 flex items-center justify-center py-4">
          <AppHeroVisual />
        </div>

        {/* Feature Carousel */}
        <section className="py-4">
          <FeatureCarousel />
        </section>

        {/* CTA Section */}
        <footer className="px-6 pb-8 pb-safe space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Button
              size="lg"
              className="w-full h-14 text-lg font-semibold gradient-primary hover:opacity-90 transition-all active:scale-[0.98] touch-manipulation group"
              onClick={handleGetStarted}
              style={{
                boxShadow: '0 8px 32px -8px hsl(var(--primary) / 0.5)',
              }}
            >
              Get Started
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>

          <motion.div
            className="text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <button
              onClick={handleSignIn}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
            >
              Already have an account?{' '}
              <span className="text-primary font-medium">Sign In</span>
            </button>
          </motion.div>
        </footer>
      </div>
    </MobileLayout>
  );
};

export default Index;
