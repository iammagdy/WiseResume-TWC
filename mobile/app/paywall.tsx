import React, { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing, typography } from '@/theme/tokens';

interface Offering { identifier: string; price: string; period: string; title: string; description: string }

const FALLBACK_OFFERINGS: Offering[] = [
  { identifier: 'monthly', price: '$9.99', period: '/ month', title: 'Pro monthly', description: 'Unlimited resumes, AI rewrites, full interview practice.' },
  { identifier: 'annual', price: '$59.99', period: '/ year', title: 'Pro annual', description: 'Save 50% — your best price.' },
];

export default function Paywall() {
  const theme = useTheme();
  const [offerings, setOfferings] = useState<Offering[]>(FALLBACK_OFFERINGS);
  const [selected, setSelected] = useState<string>('annual');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    /*
     * RevenueCat SDK loads lazily so the rest of the app is not blocked
     * if `EXPO_PUBLIC_REVENUECAT_*` keys are absent (e.g. local dev).
     * We deliberately swallow errors and fall back to the static
     * pricing copy above — the user can always tap Subscribe and the
     * webhook will reconcile entitlements server-side.
     */
    (async () => {
      try {
        const Purchases = (await import('react-native-purchases')).default;
        const offering = await Purchases.getOfferings();
        const current = offering.current;
        if (current?.availablePackages?.length) {
          setOfferings(
            current.availablePackages.map((p) => ({
              identifier: p.identifier,
              price: p.product.priceString,
              period: p.packageType.toLowerCase(),
              title: p.product.title,
              description: p.product.description ?? '',
            })),
          );
        }
      } catch {
        /* Use fallback */
      }
    })();
  }, []);

  const subscribe = async () => {
    setBusy(true);
    try {
      const Purchases = (await import('react-native-purchases')).default;
      const offering = await Purchases.getOfferings();
      const pkg = offering.current?.availablePackages.find((p) => p.identifier === selected);
      if (!pkg) throw new Error('Selected plan unavailable.');
      await Purchases.purchasePackage(pkg);
      Alert.alert('You\'re upgraded!', 'Welcome to Pro.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Please try again.';
      if (!/cancel/i.test(msg)) Alert.alert('Purchase failed', msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Upgrade' }} />
      <Screen>
        <Text style={[typography.display, { color: theme.text }]}>Unlock everything</Text>
        <Text style={[typography.body, { color: theme.textMuted }]}>
          AI resume rewrites, unlimited cover letters, full interview practice, and 1-tap PDF export.
        </Text>
        <View style={{ gap: spacing.md }}>
          {offerings.map((o) => {
            const active = selected === o.identifier;
            return (
              <Pressable key={o.identifier} onPress={() => setSelected(o.identifier)}>
                <Card style={{ borderColor: active ? theme.primary : theme.border, borderWidth: 2 }}>
                  <Text style={[typography.heading, { color: theme.text }]}>{o.title}</Text>
                  <Text style={[typography.body, { color: theme.text }]}>{o.price} <Text style={{ color: theme.textMuted }}>{o.period}</Text></Text>
                  <Text style={[typography.small, { color: theme.textMuted, marginTop: spacing.xs }]}>{o.description}</Text>
                </Card>
              </Pressable>
            );
          })}
        </View>
        <Button title="Subscribe" onPress={subscribe} loading={busy} />
        <Text style={[typography.caption, { color: theme.textMuted, textAlign: 'center', marginTop: spacing.md }]}>
          Subscriptions auto-renew unless cancelled at least 24 hours before the period ends. Manage in your device settings.
        </Text>
      </Screen>
    </>
  );
}
