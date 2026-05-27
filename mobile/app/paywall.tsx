import React from 'react';
import { Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing, typography } from '@/theme/tokens';

interface PlanPreview {
  identifier: string;
  price: string;
  period: string;
  title: string;
  description: string;
}

const PLAN_PREVIEWS: PlanPreview[] = [
  {
    identifier: 'monthly',
    price: '$9.99',
    period: '/ month',
    title: 'Pro monthly',
    description: 'Unlimited resumes, AI rewrites, full interview practice.',
  },
  {
    identifier: 'annual',
    price: '$59.99',
    period: '/ year',
    title: 'Pro annual',
    description: 'Save 50% - your best price.',
  },
];

export default function Paywall() {
  const theme = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: 'Upgrade' }} />
      <Screen>
        <Text style={[typography.display, { color: theme.text }]}>Unlock everything</Text>
        <Text style={[typography.body, { color: theme.textMuted }]}>
          AI resume rewrites, unlimited cover letters, full interview practice, and 1-tap PDF export.
        </Text>
        <View style={{ gap: spacing.md }}>
          {PLAN_PREVIEWS.map((plan) => (
            <Card key={plan.identifier} style={{ borderColor: theme.border, borderWidth: 2 }}>
              <Text style={[typography.heading, { color: theme.text }]}>{plan.title}</Text>
              <Text style={[typography.body, { color: theme.text }]}>
                {plan.price} <Text style={{ color: theme.textMuted }}>{plan.period}</Text>
              </Text>
              <Text style={[typography.small, { color: theme.textMuted, marginTop: spacing.xs }]}>
                {plan.description}
              </Text>
            </Card>
          ))}
        </View>
        <Button title="Coming Soon" disabled />
        <Text style={[typography.caption, { color: theme.textMuted, textAlign: 'center', marginTop: spacing.md }]}>
          Online payment is not available yet. Existing internal plan access remains unchanged.
        </Text>
      </Screen>
    </>
  );
}
