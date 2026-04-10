import { Wrench } from 'lucide-react';

export function MaintenanceScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
          <Wrench className="w-8 h-8 text-amber-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Under Maintenance</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            WiseResume is currently undergoing scheduled maintenance. We'll be back shortly.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Follow <strong>@WiseResumeApp</strong> for updates.
        </p>
      </div>
    </div>
  );
}
