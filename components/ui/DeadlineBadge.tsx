import { Clock } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { radius, spacing, typography } from '@/constants/theme';
import { daysUntil, formatDate } from '@/utils/format';
import { toneColors, type StatusTone } from '@/utils/caseStatus';

interface DeadlineBadgeProps {
  deadline: string;
  prefix?: string;
  variant?: 'pill' | 'plain';
}

function toneFor(days: number): StatusTone {
  if (days <= 3) return 'danger';
  if (days <= 10) return 'warning';
  return 'info';
}

export function DeadlineBadge({ deadline, prefix, variant = 'pill' }: DeadlineBadgeProps) {
  const days = daysUntil(deadline);
  const tone = toneFor(days);
  const palette = toneColors[tone];

  let label: string;
  if (days < 0) label = 'Termijn verstreken';
  else if (days === 0) label = 'Vandaag';
  else if (days === 1) label = 'Nog 1 dag';
  else if (days <= 14) label = `Nog ${days} dagen`;
  else label = formatDate(deadline);

  const text = `${prefix ? `${prefix} ` : ''}${label}`;

  if (variant === 'plain') {
    return (
      <View style={styles.plainRow}>
        <Clock size={14} color={palette.fg} strokeWidth={2.25} />
        <Text style={[styles.plainLabel, { color: palette.fg }]}>{text}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.base, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <Clock size={13} color={palette.fg} strokeWidth={2.25} />
      <Text style={[styles.label, { color: palette.fg }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  label: {
    ...typography.smallMedium,
  },
  plainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  plainLabel: {
    ...typography.smallMedium,
  },
});
