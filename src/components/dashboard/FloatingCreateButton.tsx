import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Sparkles } from 'lucide-react';
import { haptics } from '@/lib/haptics';
import { useState } from 'react';

interface FloatingCreateButtonProps {
  onClick: () => void;
  hidden?: boolean;
}

export function FloatingCreateButton({ onClick, hidden = false }: FloatingCreateButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  const handlePress = () => {
    setIsPressed(true);
    haptics.medium();
    onClick();
    // Reset after animation
    setTimeout(() => setIsPressed(false), 300);
  };

  return (
    <AnimatePresence>
      {!hidden && (
        <motion.button
          className="fixed bottom-24 right-4 z-40 w-16 h-16 rounded-full gradient-primary backdrop-blur-md border border-primary/20 flex items-center justify-center touch-manipulation overflow-hidden"
          initial={{ scale: 0, opacity: 0, y: 20 }}
          animate={{ 
            scale: 1, 
            opacity: 1, 
            y: 0,
          }}
          exit={{ scale: 0, opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          whileTap={{ scale: 0.9 }}
          onTouchStart={() => setIsPressed(true)}
          onTouchEnd={() => setIsPressed(false)}
          onClick={handlePress}
          style={{
            boxShadow: '0 8px 32px -8px hsl(var(--primary) / 0.5), 0 0 0 1px hsl(var(--primary) / 0.2)',
          }}
          aria-label="Create new resume"
        >
          {/* Animated icon */}
          <motion.div
            animate={isPressed ? { rotate: 90, scale: 1.1 } : { rotate: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            <Plus className="w-7 h-7 text-primary-foreground" />
          </motion.div>
          
          {/* Sparkle effect on press */}
          <AnimatePresence>
            {isPressed && (
              <>
                {[...Array(6)].map((_, i) => (
                  <motion.span
                    key={i}
                    className="absolute w-1.5 h-1.5 rounded-full bg-white"
                    initial={{ 
                      x: 0, 
                      y: 0, 
                      scale: 0,
                      opacity: 1 
                    }}
                    animate={{ 
                      x: Math.cos((i * 60) * Math.PI / 180) * 30,
                      y: Math.sin((i * 60) * Math.PI / 180) * 30,
                      scale: 1,
                      opacity: 0 
                    }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                ))}
              </>
            )}
          </AnimatePresence>
          
          {/* Pulse ring */}
          <motion.span
            className="absolute inset-0 rounded-full gradient-primary"
            animate={{
              scale: [1, 1.4, 1],
              opacity: [0.4, 0, 0.4],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          
          {/* Inner glow */}
          <motion.span
            className="absolute inset-0 rounded-full"
            animate={{
              boxShadow: [
                'inset 0 0 20px hsl(var(--primary-foreground) / 0.1)',
                'inset 0 0 30px hsl(var(--primary-foreground) / 0.2)',
                'inset 0 0 20px hsl(var(--primary-foreground) / 0.1)',
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
