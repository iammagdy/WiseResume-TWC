 import { useState, useEffect, useCallback } from 'react';
 import { NativeBiometric, BiometryType } from '@capgo/capacitor-native-biometric';
 import { App } from '@capacitor/app';
 import { Capacitor } from '@capacitor/core';
 import { haptics } from '@/lib/haptics';
 
 type BiometryTypeString = 'faceId' | 'fingerprint' | 'iris' | 'none';
 
 interface UseBiometricLockReturn {
   isAvailable: boolean;
   biometryType: BiometryTypeString;
   isLocked: boolean;
   isAuthenticating: boolean;
   authenticate: () => Promise<boolean>;
   checkAvailability: () => Promise<void>;
   unlock: () => void;
  lock: () => void;
}

export function useBiometricLock(enabled: boolean, lockTimeout: number = 30000): UseBiometricLockReturn {
   const [isAvailable, setIsAvailable] = useState(false);
   const [biometryType, setBiometryType] = useState<BiometryTypeString>('none');
   const [isLocked, setIsLocked] = useState(true);
   const [isAuthenticating, setIsAuthenticating] = useState(false);
   const [backgroundTime, setBackgroundTime] = useState<number | null>(null);
 
   const mapBiometryType = (type: BiometryType): BiometryTypeString => {
     switch (type) {
       case BiometryType.FACE_ID:
         return 'faceId';
       case BiometryType.TOUCH_ID:
       case BiometryType.FINGERPRINT:
         return 'fingerprint';
       default:
         return 'none';
     }
   };
 
   const checkAvailability = useCallback(async () => {
     if (!Capacitor.isNativePlatform()) {
       setIsAvailable(false);
       setBiometryType('none');
       return;
     }
 
     try {
       const result = await NativeBiometric.isAvailable();
       setIsAvailable(result.isAvailable);
       setBiometryType(mapBiometryType(result.biometryType));
     } catch (error) {
       console.warn('Biometric check failed:', error);
       setIsAvailable(false);
       setBiometryType('none');
     }
   }, []);
 
   const authenticate = useCallback(async (): Promise<boolean> => {
     if (!isAvailable || isAuthenticating) return false;
 
     setIsAuthenticating(true);
     
     try {
       await NativeBiometric.verifyIdentity({
         reason: 'Unlock WiseResume to access your resumes',
         title: 'Authenticate',
         subtitle: 'Use biometrics to unlock',
         description: 'Protect your sensitive resume data',
         useFallback: true,
         fallbackTitle: 'Use Device Password',
       });
       
       haptics.success();
       setIsLocked(false);
       setIsAuthenticating(false);
       return true;
     } catch (error) {
       haptics.error();
       setIsAuthenticating(false);
       console.warn('Biometric authentication failed:', error);
       return false;
     }
   }, [isAvailable, isAuthenticating]);
 
   const unlock = useCallback(() => {
     setIsLocked(false);
   }, []);
 
   const lock = useCallback(() => {
     setIsLocked(true);
   }, []);
 
   // Check availability on mount
   useEffect(() => {
     checkAvailability();
   }, [checkAvailability]);
 
   // Handle app state changes for background lock
   useEffect(() => {
     if (!Capacitor.isNativePlatform() || !enabled) return;
 
     let listenerHandle: { remove: () => void } | null = null;
 
     const setupListener = async () => {
       listenerHandle = await App.addListener('appStateChange', ({ isActive }) => {
         if (!isActive) {
           // App went to background - record the time
           setBackgroundTime(Date.now());
          } else if (backgroundTime) {
            // App returned to foreground - check if we need to lock
            const timeInBackground = Date.now() - backgroundTime;
            // If timeout is 0 (immediately), always lock when returning
            if (lockTimeout === 0 || timeInBackground >= lockTimeout) {
              setIsLocked(true);
            }
            setBackgroundTime(null);
          }
        });
      };

      setupListener();

      return () => {
        listenerHandle?.remove();
      };
    }, [enabled, backgroundTime, lockTimeout]);

    // If not enabled, always unlock
   useEffect(() => {
     if (!enabled) {
       setIsLocked(false);
     }
   }, [enabled]);
 
   return {
     isAvailable,
     biometryType,
     isLocked,
     isAuthenticating,
     authenticate,
     checkAvailability,
     unlock,
     lock,
   };
 }