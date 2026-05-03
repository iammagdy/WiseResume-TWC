import React from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, typography } from '@/theme/tokens';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string | null;
}

export function Input({ label, error, style, ...rest }: InputProps) {
  const theme = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      {label ? (
        <Text style={[typography.small, { color: theme.textMuted, fontWeight: '500' }]}>{label}</Text>
      ) : null}
      <TextInput
        placeholderTextColor={theme.textMuted}
        style={[
          styles.input,
          {
            backgroundColor: theme.surfaceElevated,
            color: theme.text,
            borderColor: error ? theme.destructive : theme.border,
          },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <Text style={[typography.small, { color: theme.destructive }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
    fontSize: 15,
  },
});
