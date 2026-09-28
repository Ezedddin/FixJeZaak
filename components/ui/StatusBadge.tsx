import { StyleSheet, Text, View } from 'react-native';

import { radius, spacing, typography } from '@/constants/theme';
import { toneColors, type StatusTone } from '@/utils/caseStatus';

interface StatusBadgeProps {
  label: string;
  tone: StatusTone;
  size?: 'sm' | 'md';
}

export function StatusBadge({ label, tone, size = 'md' }: StatusBadgeProps) {
  const palette = toneColors[tone];
  return (
    <View
      style={[
        styles.base,
        size === 'sm' && styles.sm,
        { backgroundColor: palette.bg, borderColor: palette.border },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: palette.fg }]} />
      <Text style={[styles.label, size === 'sm' && styles.labelSm, { color: palette.fg }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  sm: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    ...typography.smallMedium,
  },
  labelSm: {
    ...typography.tiny,
  },
});
