import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/constants/theme';
import type { Evidence } from '@/types';
import { evidenceStatusMeta } from '@/utils/caseStatus';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { StatusBadge } from '../ui/StatusBadge';

interface EvidenceCardProps {
  evidence: Evidence;
  onUpload?: () => void;
  onSkip?: () => void;
}

export function EvidenceCard({ evidence, onUpload, onSkip }: EvidenceCardProps) {
  const statusMeta = evidenceStatusMeta(evidence.status);
  const needsAction = evidence.status === 'ontbreekt';

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{evidence.title}</Text>
        <StatusBadge label={statusMeta.label} tone={statusMeta.tone} size="sm" />
      </View>
      <Text style={styles.explanation}>{evidence.explanation}</Text>
      {needsAction ? (
        <View style={styles.actions}>
          <View style={styles.actionItem}>
            <Button label="Upload bewijs" onPress={onUpload ?? (() => {})} />
          </View>
          <View style={styles.actionItem}>
            <Button label="Ik heb dit niet" onPress={onSkip ?? (() => {})} variant="secondary" />
          </View>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  title: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    flex: 1,
  },
  explanation: {
    ...typography.body,
    color: colors.textSecondary,
  },
  actions: {
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  actionItem: {
    width: '100%',
  },
});
