import React from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';

interface ScreenProps {
  testID?: string;
  children: React.ReactNode;
  scroll?: boolean;
  refreshControl?: ScrollViewProps['refreshControl'];
  contentStyle?: StyleProp<ViewStyle>;
  edges?: Array<'top' | 'bottom' | 'left' | 'right'>;
}

export function Screen({ children, scroll = true, refreshControl, contentStyle, edges }: ScreenProps) {
  const theme = useTheme();
  const Container = scroll ? ScrollView : View;
  return (
    <SafeAreaView edges={edges ?? ['top', 'bottom']} style={[styles.safe, { backgroundColor: theme.background }]}>
      <Container
        style={styles.container}
        contentContainerStyle={[scroll ? styles.scrollContent : styles.content, contentStyle]}
        refreshControl={scroll ? refreshControl : undefined}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </Container>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  content: { flex: 1, padding: spacing.lg, gap: spacing.lg },
  scrollContent: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
});
