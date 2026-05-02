import { Redirect } from 'expo-router';
import { useAuthStore } from '@/state/authStore';
import { useSettingsStore } from '@/state/settingsStore';

export default function IndexRoute() {
  const identity = useAuthStore((s) => s.identity);
  const onboarded = useSettingsStore((s) => s.hasCompletedOnboarding);

  if (!identity) {
    return <Redirect href={onboarded ? '/(auth)/sign-in' : '/(auth)/onboarding'} />;
  }
  return <Redirect href="/(tabs)/dashboard" />;
}
