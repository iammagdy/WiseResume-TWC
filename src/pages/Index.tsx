import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { HeroSection, FeatureHighlights } from '@/components/landing/HeroSection';
import { HowItWorks } from '@/components/landing/HowItWorks';

const Index = () => {
  const navigate = useNavigate();

  const handleUploadClick = () => {
    navigate('/upload');
  };

  const handleSignInClick = () => {
    navigate('/auth');
  };

  return (
    <MobileLayout>
      <div className="min-h-full">
        <HeroSection 
          onUploadClick={handleUploadClick}
          onSignInClick={handleSignInClick}
        />
        
        <FeatureHighlights />
        
        <HowItWorks />

        {/* Bottom safe area spacer */}
        <div className="h-8" />

        {/* Floating bottom indicator */}
        <motion.div 
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 pb-safe"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
        >
          <div className="px-5 py-2.5 rounded-full glass border border-border text-sm text-muted-foreground">
            No account required to start
          </div>
        </motion.div>
      </div>
    </MobileLayout>
  );
};

export default Index;
