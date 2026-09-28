import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';

const MIN_SPLASH_MS = 1400;

export default function SplashScreen() {
  const router = useRouter();
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const hasCompletedOnboarding = useAuthStore((state) => state.hasCompletedOnboarding);
  const opacity = useRef(new Animated.Value(0)).current;
  const mountedAt = useRef(Date.now());

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [opacity]);

  useEffect(() => {
    if (!hasHydrated) return;
    const elapsed = Date.now() - mountedAt.current;
    const remaining = Math.max(0, MIN_SPLASH_MS - elapsed);
    const timer = setTimeout(() => {
      router.replace(hasCompletedOnboarding ? '/(tabs)' : '/onboarding');
    }, remaining);
    return () => clearTimeout(timer);
  }, [hasHydrated, hasCompletedOnboarding, router]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity }]}>
        <Text style={styles.wordmark}>FixJeZaak</Text>
        <Text style={styles.tagline}>Juridisch geregeld.</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  wordmark: {
    ...typography.display,
    color: colors.onPrimary,
    letterSpacing: -0.5,
  },
  tagline: {
    ...typography.bodyLg,
    color: 'rgba(255,255,255,0.72)',
  },
});
