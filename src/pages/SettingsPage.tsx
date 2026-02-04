import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, RotateCcw, Info } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { ThemeToggle } from '@/components/settings/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { haptics } from '@/lib/haptics';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [loading, user, navigate]);

  const handleSignOut = async () => {
    haptics.medium();
    await signOut();
    navigate('/');
  };

  const handleResetOnboarding = async () => {
    if (user) {
      await supabase
        .from('profiles')
        .update({ onboarding_completed: false })
        .eq('user_id', user.id);
      haptics.success();
      toast.success('Onboarding reset. Refresh to see it again.');
    }
  };

  // Get user initials for avatar fallback
  const getInitials = () => {
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  if (loading) {
    return (
      <MobileLayout showBottomNav>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout showBottomNav>
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="pt-safe pt-4 pb-3 px-4 border-b border-border">
          <h1 className="text-xl font-bold">Settings</h1>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {/* Profile Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border"
          >
            <Avatar className="h-14 w-14">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{user?.email}</p>
              <p className="text-sm text-muted-foreground">Account</p>
            </div>
          </motion.div>

          {/* Appearance Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">
              APPEARANCE
            </h2>
            <div className="p-4 rounded-xl bg-card border border-border">
              <ThemeToggle className="w-full justify-center" />
            </div>
          </motion.div>

          {/* Account Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">
              ACCOUNT
            </h2>
            <div className="rounded-xl bg-card border border-border overflow-hidden">
              <Button
                variant="ghost"
                className="w-full justify-start h-12 px-4 rounded-none"
                onClick={handleResetOnboarding}
              >
                <RotateCcw className="w-4 h-4 mr-3" />
                Reset Onboarding
              </Button>
              <Separator />
              <Button
                variant="ghost"
                className="w-full justify-start h-12 px-4 rounded-none text-destructive hover:text-destructive"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4 mr-3" />
                Sign Out
              </Button>
            </div>
          </motion.div>

          {/* About Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">
              ABOUT
            </h2>
            <div className="p-4 rounded-xl bg-card border border-border">
              <div className="flex items-center gap-3">
                <Info className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  WiseResume v1.0.0
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </MobileLayout>
  );
}
