import React, { useState } from 'react';
import { Dimensions, FlatList, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing, typography } from '@/theme/tokens';
import { useSettingsStore } from '@/state/settingsStore';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    title: 'Build resumes that get interviews',
    body: 'Pick from ATS-tested templates and let our AI tighten every bullet so recruiters say yes.',
  },
  {
    title: 'Track every application in one place',
    body: 'Save jobs, log applications, capture follow-ups, and never lose a thread again.',
  },
  {
    title: 'Practice interviews on the go',
    body: 'Speak your answers, get instant feedback, and walk into interviews calm and prepared.',
  },
];

export default function Onboarding() {
  const theme = useTheme();
  const [index, setIndex] = useState(0);
  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding);

  const listRef = React.useRef<FlatList<(typeof SLIDES)[number]> | null>(null);

  const finish = () => {
    completeOnboarding();
    router.replace('/(auth)/sign-in');
  };

  const handleNext = () => {
    if (index >= SLIDES.length - 1) {
      finish();
      return;
    }
    const nextIndex = index + 1;
    setIndex(nextIndex);
    listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
  };

  return (
    <Screen scroll={false} contentStyle={{ flex: 1, justifyContent: 'space-between' }}>
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item, index: i }) => (
          <View testID={`onboarding-slide-${i}`} style={[styles.slide, { width: width - spacing.lg * 2 }]}>
            <Text style={[typography.display, { color: theme.text }]}>{item.title}</Text>
            <Text style={[typography.body, { color: theme.textMuted }]}>{item.body}</Text>
          </View>
        )}
      />
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={{
              width: i === index ? 24 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: i === index ? theme.primary : theme.border,
            }}
          />
        ))}
      </View>
      <View style={{ gap: spacing.md }}>
        <Button
          testID={index === SLIDES.length - 1 ? 'onboarding-finish' : 'onboarding-next'}
          title={index === SLIDES.length - 1 ? 'Get started' : 'Continue'}
          onPress={handleNext}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  slide: { padding: spacing.lg, justifyContent: 'center', gap: spacing.md },
  dots: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', paddingVertical: spacing.lg },
});
