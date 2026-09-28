import { useRouter } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { onboardingSlides } from '@/data/onboarding';
import { useAuthStore } from '@/store/authStore';

const { width } = Dimensions.get('window');

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const completeOnboarding = useAuthStore((state) => state.completeOnboarding);
  const login = useAuthStore((state) => state.login);
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const isLast = index === onboardingSlides.length - 1;

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setIndex(newIndex);
  }

  function goNext() {
    if (isLast) {
      startFirstCase();
      return;
    }
    const nextIndex = index + 1;
    scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
    setIndex(nextIndex);
  }

  function startFirstCase() {
    login();
    completeOnboarding();
    router.replace('/(tabs)');
  }

  function useExistingAccount() {
    completeOnboarding();
    router.push('/login');
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        ref={scrollRef}
        style={styles.list}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
      >
        {onboardingSlides.map((slide, slideIndex) => (
          <View key={slide.id} style={[styles.slide, { width }]}>
            <View
              style={[
                styles.iconWrap,
                slideIndex === onboardingSlides.length - 1 && styles.iconWrapSuccess,
              ]}
            >
              <Text style={styles.emoji}>{slide.emoji}</Text>
            </View>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.description}>{slide.description}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {onboardingSlides.map((slide, i) => (
            <View key={slide.id} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>

        {isLast ? (
          <Button label="Start mijn eerste zaak" onPress={startFirstCase} icon={ArrowRight} />
        ) : (
          <Button label="Volgende" onPress={goNext} />
        )}

        <Pressable onPress={isLast ? useExistingAccount : startFirstCase} hitSlop={8}>
          <Text style={styles.skipText}>{isLast ? 'Ik heb al een account' : 'Sla over'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
  },
  iconWrapSuccess: {
    backgroundColor: colors.successBg,
  },
  emoji: {
    fontSize: 40,
  },
  title: {
    ...typography.display,
    fontSize: 27,
    lineHeight: 33,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.bodyLg,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    alignSelf: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.borderStrong,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 18,
  },
  skipText: {
    ...typography.smallMedium,
    color: colors.textTertiary,
  },
});
