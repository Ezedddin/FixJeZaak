import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/theme';
import type { CaseStrength } from '@/types';
import { toneColors, type StatusTone } from '@/utils/caseStatus';

const STRENGTH_META: Record<CaseStrength, { label: string; tone: StatusTone }> = {
  sterk: { label: 'Sterk', tone: 'success' },
  redelijk: { label: 'Redelijk', tone: 'info' },
  zwak: { label: 'Zwak', tone: 'warning' },
  onvoldoende_informatie: { label: 'Onvoldoende informatie', tone: 'neutral' },
};

interface CaseStrengthBadgeProps {
  strength: CaseStrength;
}

export function CaseStrengthBadge({ strength }: CaseStrengthBadgeProps) {
  const meta = STRENGTH_META[strength];
  const palette = toneColors[meta.tone];

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Zaaksterkte</Text>
      <View style={[styles.pill, { backgroundColor: palette.bg, borderColor: palette.border }]}>
        <Text style={[styles.pillText, { color: palette.fg }]}>{meta.label.toUpperCase()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    ...typography.smallMedium,
    color: colors.textSecondary,
  },
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  pillText: {
    ...typography.h3,
    letterSpacing: 0.5,
  },
});
