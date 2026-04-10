import React, { useState } from 'react';
import { ArrowLeft, Activity, Users, Tag, Settings, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DevKitRunner } from '@/components/dev-kit/DevKitRunner';
import { AdminUsersPanel } from '@/components/dev-kit/AdminUsersPanel';
import { CouponsPanel } from '@/components/dev-kit/CouponsPanel';
import { AppSettingsPanel } from '@/components/dev-kit/AppSettingsPanel';
import { AuditLogPanel } from '@/components/dev-kit/AuditLogPanel';
import { DEV_KIT_VERSION } from '@/components/dev-kit/config';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Tab = 'health' | 'users' | 'coupons' | 'settings' | 'activity';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'health', label: 'Health', icon: Activity },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'coupons', label: 'Coupons', icon: Tag },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'activity', label: 'Activity', icon: Clock },
];

export default function DevToolsPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('health');
  const [userCount, setUserCount] = useState<number | null>(null);
  const navigate = useNavigate();

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pw.trim()) return;

    setIsVerifying(true);
    setPwError(false);

    try {
      const { data, error } = await edgeFunctions.functions.invoke('verify-dev-kit', {
        body: { password: pw }
      });

      if (error) {
        if (error.message?.includes('Failed to fetch') || error.status === 404) {
          toast.error('Verification Function Not Found', {
            description: 'Please deploy the "verify-dev-kit" Edge Function to your Supabase project.',
            duration: 6000
          });
        } else {
          toast.error('Verification failed: ' + error.message);
        }
        return;
      }

      if (data?.success) {
        setUnlocked(true);
      } else {
        setPwError(true);
      }
    } catch (err) {
      toast.error('System error during verification');
    } finally {
      setIsVerifying(false);
    }
  };

  if (!unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-sm space-y-4 bg-card border border-border rounded-2xl p-8 shadow-2xl">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold text-foreground">Dev-Kit</h1>
            <p className="text-sm text-muted-foreground">Admin access required</p>
          </div>
          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="space-y-1">
              <Input
                type="password"
                placeholder="Developer Password"
                value={pw}
                onChange={e => { setPw(e.target.value); setPwError(false); }}
                disabled={isVerifying}
                className={`h-12 bg-background/50 ${pwError ? 'border-destructive ring-destructive/20' : ''}`}
              />
              {pwError && <p className="text-xs text-destructive font-medium pl-1 italic">Invalid password</p>}
            </div>
            <Button type="submit" disabled={isVerifying} className="w-full h-12 text-base font-semibold transition-all">
              {isVerifying ? 'Verifying...' : 'Unlock Tools'}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background/40 backdrop-blur-sm relative z-10">
      <div className="max-w-4xl mx-auto px-4 py-8 pb-32 space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between sticky top-0 py-4 bg-background/95 backdrop-blur-sm z-40 px-2 rounded-xl mb-2 border border-border shadow-sm">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="hover:bg-background/20 rounded-full h-10 w-10">
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Developer Kit</h1>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{DEV_KIT_VERSION}</p>
            </div>
          </div>
        </header>

        {/* Tab switcher — scrollable on mobile */}
        <div className="overflow-x-auto -mx-1 px-1">
          <div className="flex gap-1 p-1 bg-muted/50 rounded-xl border border-border w-fit min-w-full sm:min-w-0">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
                    activeTab === tab.id
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label}</span>
                  {tab.id === 'users' && userCount !== null && (
                    <span className="text-xs text-muted-foreground ml-0.5">({userCount})</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab content */}
        {activeTab === 'health' && <DevKitRunner />}

        {activeTab === 'users' && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">
                User Management
                {userCount !== null && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">({userCount} total)</span>
                )}
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              View all registered users. Click any row to manage — set plans, grant trials, suspend accounts, adjust credits, and add admin notes.
            </p>
            <AdminUsersPanel password={pw} onCountChange={setUserCount} />
          </div>
        )}

        {activeTab === 'coupons' && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Coupon Management</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Create and manage discount codes. Users can redeem codes on the subscription page to get free plan upgrades or discounts.
            </p>
            <CouponsPanel password={pw} />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">App Settings</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Control app-wide settings. Toggle maintenance mode, post announcements, and enable or disable features for all users.
            </p>
            <AppSettingsPanel password={pw} />
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Admin Activity Log</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              A record of all admin actions — plan changes, trial grants, suspensions, credit overrides, and coupon redemptions.
            </p>
            <AuditLogPanel password={pw} />
          </div>
        )}

        <footer className="py-12 border-t border-border text-center">
          <p className="text-xs text-muted-foreground/60 font-mono italic">
            {DEV_KIT_VERSION} · Build ID: {new Date().toISOString().split('T')[0].replace(/-/g, '')}
          </p>
          <p className="text-xs text-muted-foreground/40 mt-1">
            Edge functions require deployment. Ensure SUPABASE_ACCESS_TOKEN + DEV_KIT_PASSWORD are set.
          </p>
        </footer>
      </div>
    </div>
  );
}
