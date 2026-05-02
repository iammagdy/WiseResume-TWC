import React, { useEffect } from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing, typography } from '@/theme/tokens';
import { useBiometricGate } from '@/hooks/useBiometricGate';

/**
 * Full-screen modal that blocks the app whenever the biometric gate
 * reports `isLocked`. Mounted once at the root so it covers every
 * navigator. Auto-prompts on mount so users don't have to tap twice
 * after coming back from background.
 */
export function BiometricLockOverlay() {
  const theme = useTheme();
  const { isLocked, authenticate, available } = useBiometricGate();

  useEffect(() => {
    if (isLocked && available) {
      authenticate().catch(() => {});
    }
  }, [isLocked, available, authenticate]);

  if (!isLocked) return null;

  return (
    <Modal visible animationType="fade" transparent={false}>
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <Ionicons name="lock-closed" size={64} color={theme.primary} />
        <Text style={[typography.heading, { color: theme.text, marginTop: spacing.lg }]}>
          WiseResume is locked
        </Text>
        <Text
          style={[typography.body, { color: theme.textMuted, textAlign: 'center', marginTop: spacing.sm, marginHorizontal: spacing.xl }]}
        >
          Use Face ID, Touch ID, or your device passcode to continue.
        </Text>
        <Button title="Unlock" onPress={authenticate} style={{ marginTop: spacing.xl, minWidth: 200 }} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
});
