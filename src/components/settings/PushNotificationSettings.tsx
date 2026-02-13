import { Bell, BellRing, Smartphone, AlertCircle, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { Separator } from '@/components/ui/separator';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function PushNotificationSettings() {
  const { user } = useAuth();
  const {
    isSupported,
    isSubscribed,
    permission,
    isLoading,
    isiOS,
    isPWA,
    subscribe,
    unsubscribe,
    sendTest,
  } = usePushNotifications();

  // Not signed in
  if (!user) return null;

  // iOS but not installed as PWA
  if (isiOS && !isPWA) {
    return (
      <>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Push Notifications</p>
            <p className="text-xs text-muted-foreground">
              To receive push notifications on iOS, add WiseResume to your Home Screen first (Share → Add to Home Screen).
            </p>
          </div>
        </div>
        <Separator className="bg-border/30" />
      </>
    );
  }

  // Browser doesn't support push
  if (!isSupported) {
    return (
      <>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground">Push Notifications</p>
            <p className="text-xs text-muted-foreground">Not supported in this browser.</p>
          </div>
        </div>
        <Separator className="bg-border/30" />
      </>
    );
  }

  // Permission denied
  if (permission === 'denied') {
    return (
      <>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-4 h-4 text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Push Notifications Blocked</p>
            <p className="text-xs text-muted-foreground">
              Update your browser notification settings to enable push notifications.
            </p>
          </div>
        </div>
        <Separator className="bg-border/30" />
      </>
    );
  }

  const handleToggle = async (checked: boolean) => {
    try {
      if (checked) {
        await subscribe();
        toast.success('Push notifications enabled!');
      } else {
        await unsubscribe();
        toast.success('Push notifications disabled');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update push notifications');
    }
  };

  const handleSendTest = async () => {
    try {
      await sendTest();
      toast.success('Test notification sent!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send test notification');
    }
  };

  return (
    <>
      <SettingsRow
        type="toggle"
        label="Push Notifications"
        description={isSubscribed ? 'Receiving push alerts' : 'Get notified even when the app is closed'}
        icon={isSubscribed ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
        checked={isSubscribed}
        onCheckedChange={handleToggle}
        loading={isLoading}
      />
      {isSubscribed && (
        <div className="px-4 pb-3 pt-1 pl-15">
          <Button
            size="sm"
            variant="outline"
            onClick={handleSendTest}
            disabled={isLoading}
            className="ml-11 gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Send Test Notification
          </Button>
        </div>
      )}
      <Separator className="bg-border/30" />
    </>
  );
}
