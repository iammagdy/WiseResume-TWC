 import { useEffect } from 'react';
 import { motion, AnimatePresence } from 'framer-motion';
 import { Fingerprint, ScanFace, Eye, Lock } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { AppLogo } from '@/components/brand/AppLogo';
 
 interface BiometricLockScreenProps {
   biometryType: 'faceId' | 'fingerprint' | 'iris' | 'none';
   isAuthenticating: boolean;
   onAuthenticate: () => Promise<boolean>;
 }
 
 export function BiometricLockScreen({
   biometryType,
   isAuthenticating,
   onAuthenticate,
 }: BiometricLockScreenProps) {
   // Auto-trigger authentication on mount
   useEffect(() => {
     const timer = setTimeout(() => {
       onAuthenticate();
     }, 500);
     return () => clearTimeout(timer);
   }, [onAuthenticate]);
 
   const getIcon = () => {
     switch (biometryType) {
       case 'faceId':
         return <ScanFace className="w-16 h-16" />;
       case 'iris':
         return <Eye className="w-16 h-16" />;
       case 'fingerprint':
         return <Fingerprint className="w-16 h-16" />;
       default:
         return <Lock className="w-16 h-16" />;
     }
   };
 
   const getPromptText = () => {
     switch (biometryType) {
       case 'faceId':
         return 'Look to unlock';
       case 'iris':
         return 'Look to unlock';
       case 'fingerprint':
         return 'Touch to unlock';
       default:
         return 'Authenticate to unlock';
     }
   };
 
   const getButtonText = () => {
     switch (biometryType) {
       case 'faceId':
         return 'Use Face ID';
       case 'iris':
         return 'Use Iris Scan';
       case 'fingerprint':
         return 'Use Fingerprint';
       default:
         return 'Use Password';
     }
   };
 
   return (
     <AnimatePresence>
       <motion.div
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         exit={{ opacity: 0, scale: 1.1 }}
         transition={{ duration: 0.3 }}
         className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background pt-safe pb-safe"
       >
         {/* App branding */}
         <motion.div
           initial={{ opacity: 0, y: -20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.1 }}
           className="mb-12"
         >
           <AppLogo size="lg" />
         </motion.div>
 
         {/* Lock icon with pulse animation */}
         <motion.div
           initial={{ scale: 0.8, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
           className="relative mb-8"
         >
           <motion.div
             animate={isAuthenticating ? { scale: [1, 1.1, 1] } : {}}
             transition={{ repeat: Infinity, duration: 1.5 }}
             className="p-6 rounded-full bg-primary/10 text-primary"
           >
             {getIcon()}
           </motion.div>
           
           {/* Pulse ring when authenticating */}
           {isAuthenticating && (
             <motion.div
               initial={{ scale: 1, opacity: 0.5 }}
               animate={{ scale: 1.5, opacity: 0 }}
               transition={{ repeat: Infinity, duration: 1.5 }}
               className="absolute inset-0 rounded-full border-2 border-primary"
             />
           )}
         </motion.div>
 
         {/* Prompt text */}
         <motion.p
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ delay: 0.3 }}
           className="text-lg font-medium text-foreground mb-2"
         >
           {isAuthenticating ? 'Authenticating...' : getPromptText()}
         </motion.p>
 
         <motion.p
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ delay: 0.4 }}
           className="text-sm text-muted-foreground mb-12 text-center px-8"
         >
           Your resume data is protected
         </motion.p>
 
         {/* Authentication button */}
         <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.5 }}
           className="w-full px-8"
         >
           <Button
             onClick={onAuthenticate}
             disabled={isAuthenticating}
             className="w-full h-12 text-base"
             variant="default"
           >
             {isAuthenticating ? 'Authenticating...' : getButtonText()}
           </Button>
         </motion.div>
 
         {/* Fallback option */}
         <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ delay: 0.6 }}
           className="mt-4"
         >
           <Button
             variant="ghost"
             onClick={onAuthenticate}
             disabled={isAuthenticating}
             className="text-muted-foreground h-12"
           >
             Use Device Password
           </Button>
         </motion.div>
       </motion.div>
     </AnimatePresence>
   );
 }