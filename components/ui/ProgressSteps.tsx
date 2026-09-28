import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/theme';

interface ProgressStepsProps {
  currentStep: number;
  totalSteps: number;
  label?: string;
}

export function ProgressSteps({ currentStep, totalSteps, label }: ProgressStepsProps) {
  const progress = Math.min(1, Math.max(0, currentStep / totalSteps));

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.stepLabel}>
          Stap {currentStep} van {totalSteps}
        </Text>
        {label ? <Text style={styles.stepLabel}>{label}</Text> : null}
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepLabel: {
    ...typography.smallMedium,
    color: colors.textSecondary,
  },
  track: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunken,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
});
