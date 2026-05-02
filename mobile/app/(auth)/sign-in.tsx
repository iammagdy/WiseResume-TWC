import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing, typography } from '@/theme/tokens';
import { signInWithKinde } from '@/lib/auth';
import { useAuthStore } from '@/state/authStore';

export default function SignIn() {
  const theme = useTheme();
  const [busy, setBusy] = useState(false);
  const setIdentity = useAuthStore((s) => s.setIdentity);

  const handleSignIn = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const id = await signInWithKinde();
      if (id) {
        setIdentity(id);
        router.replace('/(tabs)/dashboard');
      }
    } catch (err) {
      Alert.alert('Sign in failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen contentStyle={styles.container}>
      <View style={{ gap: spacing.md }}>
        <Text style={[typography.display, { color: theme.text }]}>Welcome back</Text>
        <Text style={[typography.body, { color: theme.textMuted }]}>
          Sign in with the same WiseResume account you use on the web.
        </Text>
      </View>
      <View style={{ gap: spacing.md }}>
        <Button testID="sign-in-button" title="Continue with WiseResume" onPress={handleSignIn} loading={busy} />
        <Button
          testID="sign-up-button"
          title="Create an account"
          variant="ghost"
          onPress={handleSignIn}
        />
        <Text style={[typography.small, { color: theme.textMuted, textAlign: 'center' }]}>
          By continuing you agree to the WiseResume Terms and Privacy Policy.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', paddingVertical: spacing.xxl },
});
