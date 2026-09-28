import { ArrowRight, ChevronRight } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/theme';
import type { LegalCase } from '@/types';
import { caseActionLabel, caseStatusMeta } from '@/utils/caseStatus';
import { Card } from '../ui/Card';
import { DeadlineBadge } from '../ui/DeadlineBadge';
import { StatusBadge } from '../ui/StatusBadge';

interface CaseCardProps {
  legalCase: LegalCase;
  onPress: () => void;
}

export function CaseCard({ legalCase, onPress }: CaseCardProps) {
  const statusMeta = caseStatusMeta(legalCase.status);
  const actionLabel = caseActionLabel(legalCase.status);

  return (
    <Card onPress={onPress} style={styles.card} padding={spacing.lg}>
      <View style={styles.topRow}>
        <Text style={styles.eyebrow}>{legalCase.category.toUpperCase()}</Text>
        <ChevronRight size={18} color={colors.textTertiary} />
      </View>

      <Text style={styles.title} numberOfLines={1}>
        {legalCase.title}
      </Text>

      <StatusBadge label={statusMeta.label} tone={statusMeta.tone} />

      {legalCase.deadline ? (
        <View style={styles.deadlineWrap}>
          <DeadlineBadge deadline={legalCase.deadline} variant="plain" />
        </View>
      ) : null}

      <View style={styles.actionRow}>
        <ArrowRight size={15} color={colors.accent} strokeWidth={2.25} />
        <Text style={styles.actionText}>{actionLabel}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.xs,
    borderRadius: radius.xl,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    ...typography.tiny,
    color: colors.textTertiary,
    letterSpacing: 0.6,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: -2,
  },
  deadlineWrap: {
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xs,
  },
  actionText: {
    ...typography.smallMedium,
    color: colors.accent,
  },
});
