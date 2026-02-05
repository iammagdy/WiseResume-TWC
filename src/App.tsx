import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
 import { ErrorBoundary } from "@/components/ErrorBoundary";
 import { useBackButton } from "@/hooks/useBackButton";
 import { useStatusBarThemeSync } from "@/hooks/useStatusBar";
 import { BiometricLockScreen } from "@/components/BiometricLockScreen";
 import { useBiometricLock } from "@/hooks/useBiometricLock";
 import { useSettingsStore } from "@/store/settingsStore";
import Index from "./pages/Index";
import UploadPage from "./pages/UploadPage";
import EditorPage from "./pages/EditorPage";
import PreviewPage from "./pages/PreviewPage";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

 // Inner component to use hooks that require Router context
 function AppRoutes() {
   useBackButton();
   useStatusBarThemeSync();
   
   const { biometricLockEnabled, biometricLockTimeout } = useSettingsStore();
   const { isLocked, isAvailable, biometryType, isAuthenticating, authenticate } = useBiometricLock(biometricLockEnabled, biometricLockTimeout);
   
   // Show lock screen if biometric lock is enabled and app is locked
   if (biometricLockEnabled && isLocked && isAvailable) {
     return (
       <BiometricLockScreen
         biometryType={biometryType}
         isAuthenticating={isAuthenticating}
         onAuthenticate={authenticate}
       />
     );
   }
   
   return (
     <Routes>
       <Route path="/" element={<Index />} />
       <Route path="/upload" element={<UploadPage />} />
       <Route path="/editor" element={<EditorPage />} />
       <Route path="/preview" element={<PreviewPage />} />
       <Route path="/auth" element={<AuthPage />} />
       <Route path="/dashboard" element={<DashboardPage />} />
       <Route path="/settings" element={<SettingsPage />} />
       <Route path="*" element={<NotFound />} />
     </Routes>
   );
 }
 
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
       <ErrorBoundary>
         <Toaster />
         <Sonner />
         <BrowserRouter>
           <AppRoutes />
         </BrowserRouter>
       </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
