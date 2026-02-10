import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import haptics from '@/lib/haptics';
import { getBackRoute, shouldExitOnBack } from '@/lib/navigation';

/**
 * Hook to handle Android hardware/gesture back button
 * Uses explicit route mapping instead of unreliable history.length checks.
 * This ensures consistent behavior in Capacitor WebViews and deep-linked sessions.
 */
export function useBackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only add listener on native platforms
    if (!Capacitor.isNativePlatform()) return;

    const handleBackButton = async () => {
      haptics.light();
      
      if (shouldExitOnBack(location.pathname)) {
        // On main screens, exit the app
        await App.exitApp();
      } else {
        // Navigate to the explicit parent route
        const backRoute = getBackRoute(location.pathname);
        navigate(backRoute);
      }
    };

    // Add back button listener
    const listener = App.addListener('backButton', handleBackButton);

    return () => {
      listener.then(l => l.remove());
    };
  }, [navigate, location.pathname]);
}