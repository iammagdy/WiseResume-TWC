import React from 'react';
import { Switch, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing, typography } from '@/theme/tokens';
import { useSettingsStore, type ThemePreference } from '@/state/settingsStore';

const THEMES: ThemePreference[] = ['system', 'light', 'dark'];

export default function SettingsScreen() {
  const theme = useTheme();
  const themePref = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const bioEnabled = useSettingsStore((s) => s.biometricLockEnabled);
  const setBioEnabled = useSettingsStore((s) => s.setBiometricLockEnabled);
  const notifications = useSettingsStore((s) => s.notifications);
  const setNotificationPref = useSettingsStore((s) => s.setNotificationPref);

  const Row = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm }}>
      <Text style={[typography.body, { color: theme.text }]}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Settings' }} />
      <Screen>
        <Card>
          <Text style={[typography.heading, { color: theme.text, marginBottom: spacing.sm }]}>Appearance</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {THEMES.map((t) => {
              const active = themePref === t;
              return (
                <Text
                  key={t}
                  onPress={() => setTheme(t)}
                  style={[
                    typography.small,
                    {
                      paddingVertical: spacing.sm,
                      paddingHorizontal: spacing.lg,
                      borderRadius: 999,
                      backgroundColor: active ? theme.primary : 'transparent',
                      color: active ? theme.primaryForeground : theme.text,
                      borderWidth: 1,
                      borderColor: active ? theme.primary : theme.border,
                      textTransform: 'capitalize',
                      overflow: 'hidden',
                    },
                  ]}
                >
                  {t}
                </Text>
              );
            })}
          </View>
        </Card>

        <Card>
          <Text style={[typography.heading, { color: theme.text, marginBottom: spacing.sm }]}>Privacy</Text>
          <Row label="Lock with Face ID / Touch ID" value={bioEnabled} onChange={setBioEnabled} />
        </Card>

        <Card>
          <Text style={[typography.heading, { color: theme.text, marginBottom: spacing.sm }]}>Notifications</Text>
          <Row label="Interview reminders" value={notifications.interviews} onChange={(v) => setNotificationPref('interviews', v)} />
          <Row label="Application follow-ups" value={notifications.applications} onChange={(v) => setNotificationPref('applications', v)} />
          <Row label="Resume insights" value={notifications.resumes} onChange={(v) => setNotificationPref('resumes', v)} />
          <Row label="Account & billing" value={notifications.account} onChange={(v) => setNotificationPref('account', v)} />
          <Row label="Product news" value={notifications.broadcasts} onChange={(v) => setNotificationPref('broadcasts', v)} />
        </Card>
      </Screen>
    </>
  );
}
