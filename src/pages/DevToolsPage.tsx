import React, { useState } from 'react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DevKitRunner } from '@/components/dev-kit/DevKitRunner';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { toast } from 'sonner';

export default function DevToolsPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
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
      <div className="max-w-3xl mx-auto px-4 py-8 pb-32 space-y-8">
        <header className="flex items-center justify-between sticky top-0 py-4 bg-background/95 backdrop-blur-sm z-40 px-2 rounded-xl mb-4 border border-border shadow-sm">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="hover:bg-background/20 rounded-full h-10 w-10">
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Developer Kit</h1>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Health & Diagnostics</p>
            </div>
          </div>
        </header>

        <DevKitRunner />
        
        <footer className="py-12 border-t border-border text-center">
          <p className="text-xs text-muted-foreground/60 font-mono italic">
            v1.3.0 · Build ID: {new Date().toISOString().split('T')[0].replace(/-/g, '')}
          </p>
        </footer>
      </div>
    </div>
  );
}
