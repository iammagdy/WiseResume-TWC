import React from 'react';
import { Platform, ScrollView, StyleSheet, View, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

const MIN_TOP_INSET = Platform.select({ ios: 20, android: 24, default: 24 }) ?? 24;
const MIN_BOTTOM_INSET = Platform.select({ ios: 16, android: 16, default: 16 }) ?? 16;

export function Screen({ children, scroll = true, refreshControl, contentStyle, edges }: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const activeEdges = edges ?? ['top', 'bottom', 'left', 'right'];
  const Container = scroll ? ScrollView : View;

  const safePadding: ViewStyle = {
    paddingTop: activeEdges.includes('top') ? Math.max(insets.top, MIN_TOP_INSET) : 0,
    paddingBottom: activeEdges.includes('bottom') ? Math.max(insets.bottom, MIN_BOTTOM_INSET) : 0,
    paddingLeft: activeEdges.includes('left') ? insets.left : 0,
    paddingRight: activeEdges.includes('right') ? insets.right : 0,
  };

  return (
    <View style={[styles.safe, { backgroundColor: theme.background }, safePadding]}>
      <Container
        style={styles.container}
        contentContainerStyle={[scroll ? styles.scrollContent : styles.content, contentStyle]}
        refreshControl={scroll ? refreshControl : undefined}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </Container>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  content: { flex: 1, padding: spacing.lg, gap: spacing.lg },
  scrollContent: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
});
