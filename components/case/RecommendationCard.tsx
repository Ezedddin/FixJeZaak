import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadow, spacing, typography } from '@/constants/theme';
import type { RecommendedAction } from '@/types';
import { Button } from '../ui/Button';

interface RecommendationCardProps {
  action: RecommendedAction;
  onPress: () => void;
}

export function RecommendationCard({ action, onPress }: RecommendationCardProps) {
  return (
    <View
      style={[
        styles.card,
        action.recommended ? styles.cardRecommended : styles.cardDefault,
        action.recommended && shadow.md,
      ]}
    >
      {action.recommended ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>AANBEVOLEN</Text>
        </View>
      ) : null}
      <Text style={styles.title}>{action.title}</Text>
      <Text style={styles.description}>{action.description}</Text>

      <View style={styles.metaGrid}>
        <MetaItem label="Geschatte duur" value={action.durationLabel} />
        <MetaItem label="Benodigd" value={action.requirementsLabel} />
      </View>

      <Button
        label={action.ctaLabel}
        onPress={onPress}
        variant={action.recommended ? 'primary' : 'secondary'}
      />
    </View>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
  },
  cardDefault: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  cardRecommended: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeText: {
    ...typography.tiny,
    color: colors.onPrimary,
    letterSpacing: 0.5,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
  },
  metaGrid: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLabel: {
    ...typography.small,
    color: colors.textTertiary,
  },
  metaValue: {
    ...typography.smallMedium,
    color: colors.textPrimary,
  },
});
