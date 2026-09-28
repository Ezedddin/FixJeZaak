import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/constants/theme';

interface LoadingStateProps {
  label?: string;
  fill?: boolean;
}

export function LoadingState({ label = 'Laden…', fill = true }: LoadingStateProps) {
  return (
    <View style={[styles.container, fill && styles.fill]}>
      <ActivityIndicator color={colors.primary} size="small" />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  fill: {
    flex: 1,
  },
  label: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
