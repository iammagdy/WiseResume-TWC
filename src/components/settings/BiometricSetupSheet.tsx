 import { useState } from 'react';
 import { motion } from 'framer-motion';
 import { Fingerprint, ScanFace, Eye, Shield, CheckCircle2 } from 'lucide-react';
 import {
   Sheet,
   SheetContent,
   SheetDescription,
   SheetHeader,
   SheetTitle,
 } from '@/components/ui/sheet';
 import { Button } from '@/components/ui/button';
 import { haptics } from '@/lib/haptics';
 
 interface BiometricSetupSheetProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   biometryType: 'faceId' | 'fingerprint' | 'iris' | 'none';
   onEnable: () => Promise<boolean>;
 }
 
 export function BiometricSetupSheet({
   open,
   onOpenChange,
   biometryType,
   onEnable,
 }: BiometricSetupSheetProps) {
   const [isEnabling, setIsEnabling] = useState(false);
   const [setupComplete, setSetupComplete] = useState(false);
 
   const getIcon = () => {
     switch (biometryType) {
       case 'faceId':
         return <ScanFace className="w-12 h-12" />;
       case 'iris':
         return <Eye className="w-12 h-12" />;
       case 'fingerprint':
         return <Fingerprint className="w-12 h-12" />;
       default:
         return <Shield className="w-12 h-12" />;
     }
   };
 
   const getBiometryName = () => {
     switch (biometryType) {
       case 'faceId':
         return 'Face ID';
       case 'iris':
         return 'Iris Scan';
       case 'fingerprint':
         return 'Fingerprint';
       default:
         return 'Biometric Lock';
     }
   };
 
   const handleEnable = async () => {
     haptics.medium();
     setIsEnabling(true);
     
     const success = await onEnable();
     
     if (success) {
       setSetupComplete(true);
       haptics.success();
       // Close after showing success
       setTimeout(() => {
         onOpenChange(false);
         setSetupComplete(false);
       }, 1500);
     } else {
       setIsEnabling(false);
       haptics.error();
     }
   };
 
   const handleClose = () => {
     if (!isEnabling) {
       onOpenChange(false);
       setSetupComplete(false);
     }
   };
 
   return (
     <Sheet open={open} onOpenChange={handleClose}>
       <SheetContent side="bottom" className="rounded-t-2xl pb-safe">
         <SheetHeader className="text-center pb-4">
           <SheetTitle>Enable {getBiometryName()}</SheetTitle>
           <SheetDescription>
             Protect your sensitive resume data
           </SheetDescription>
         </SheetHeader>
 
         <div className="flex flex-col items-center py-6">
           {/* Icon */}
           <motion.div
             initial={{ scale: 0.8, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             className={`p-6 rounded-full mb-6 ${
               setupComplete 
                 ? 'bg-green-500/10 text-green-600' 
                 : 'bg-primary/10 text-primary'
             }`}
           >
             {setupComplete ? (
               <CheckCircle2 className="w-12 h-12" />
             ) : (
               getIcon()
             )}
           </motion.div>
 
           {setupComplete ? (
             <motion.p
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="text-lg font-medium text-primary"
             >
               Biometric Lock Enabled!
             </motion.p>
           ) : (
             <>
               {/* Protection details */}
               <div className="w-full space-y-3 mb-8">
                 <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                   <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                   <div>
                     <p className="text-sm font-medium">App Access Protection</p>
                     <p className="text-xs text-muted-foreground">
                       Require {getBiometryName().toLowerCase()} when opening WiseResume
                     </p>
                   </div>
                 </div>
                 <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                   <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                   <div>
                     <p className="text-sm font-medium">Resume Data Protected</p>
                     <p className="text-xs text-muted-foreground">
                       Personal info, work history, and contact details stay secure
                     </p>
                   </div>
                 </div>
               </div>
 
               {/* Actions */}
               <div className="w-full space-y-3">
                 <Button
                   onClick={handleEnable}
                   disabled={isEnabling}
                   className="w-full h-12 text-base"
                 >
                   {isEnabling ? 'Verifying...' : `Enable ${getBiometryName()}`}
                 </Button>
                 <Button
                   variant="ghost"
                   onClick={handleClose}
                   disabled={isEnabling}
                   className="w-full h-12"
                 >
                   Cancel
                 </Button>
               </div>
             </>
           )}
         </div>
       </SheetContent>
     </Sheet>
   );
 }