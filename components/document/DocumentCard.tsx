import { FileText, Image as ImageIcon } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/theme';
import type { LegalDocument } from '@/types';
import { documentStatusMeta } from '@/utils/caseStatus';
import { Card } from '../ui/Card';
import { StatusBadge } from '../ui/StatusBadge';

interface DocumentCardProps {
  document: LegalDocument;
  onPress?: () => void;
}

export function DocumentCard({ document, onPress }: DocumentCardProps) {
  const isImage = document.mimeType.startsWith('image/');
  const statusMeta = documentStatusMeta(document.status);
  const isProcessing = document.status === 'analyzing' || document.status === 'uploading';

  return (
    <Card onPress={onPress}>
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          {isImage ? (
            <ImageIcon size={18} color={colors.accent} strokeWidth={2} />
          ) : (
            <FileText size={18} color={colors.accent} strokeWidth={2} />
          )}
        </View>
        <View style={styles.content}>
          <Text style={styles.name} numberOfLines={1}>
            {document.name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {document.documentTitle ?? document.fileSizeLabel}
          </Text>
        </View>
        {isProcessing ? (
          <ActivityIndicator size="small" color={colors.info} />
        ) : (
          <StatusBadge label={statusMeta.label} tone={statusMeta.tone} size="sm" />
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  meta: {
    ...typography.small,
    color: colors.textSecondary,
  },
});
