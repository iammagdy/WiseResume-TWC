import { ShieldOff, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { openExternal } from '@/lib/openExternal';

interface SuspendedScreenProps {
  reason?: string | null;
  onSignOut?: () => void;
}

export function SuspendedScreen({ reason, onSignOut }: SuspendedScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
          <ShieldOff className="w-8 h-8 text-red-500" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Account Suspended</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Your account has been suspended and you cannot access WiseResume at this time.
          </p>
          {reason && (
            <div className="mt-3 p-3 rounded-xl bg-muted/50 border border-border text-sm text-left">
              <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">Reason</span>
              <p className="mt-1 text-foreground">{reason}</p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <Button
            className="w-full"
            onClick={() => openExternal('mailto:support@thewise.cloud?subject=Account%20Suspension%20Appeal')}
          >
            <Mail className="w-4 h-4 mr-2" />
            Contact Support
          </Button>
          {onSignOut && (
            <Button variant="outline" className="w-full" onClick={onSignOut}>
              Sign out
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          If you believe this is a mistake, please contact support and include your email address.
        </p>
      </div>
    </div>
  );
}
