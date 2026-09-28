import { Modal, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadow, spacing, typography } from '@/constants/theme';
import { Button } from './Button';

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationModal({
  visible,
  title,
  description,
  confirmLabel = 'Bevestigen',
  cancelLabel = 'Annuleren',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.card, shadow.lg]}>
          <Text style={styles.title}>{title}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
          <View style={styles.actions}>
            <View style={styles.actionItem}>
              <Button label={cancelLabel} onPress={onCancel} variant="secondary" />
            </View>
            <View style={styles.actionItem}>
              <Button
                label={confirmLabel}
                onPress={onConfirm}
                variant={destructive ? 'danger' : 'primary'}
                loading={loading}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  actionItem: {
    flex: 1,
  },
});
