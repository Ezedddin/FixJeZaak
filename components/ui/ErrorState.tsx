import { TriangleAlert } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/theme';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  description?: string;
  retryLabel?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Er ging iets mis',
  description = 'Probeer het opnieuw. Als dit blijft gebeuren, neem dan contact met ons op.',
  retryLabel = 'Opnieuw proberen',
  onRetry,
}: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <TriangleAlert size={26} color={colors.danger} strokeWidth={1.75} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {onRetry ? (
        <View style={styles.action}>
          <Button label={retryLabel} onPress={onRetry} variant="secondary" fullWidth={false} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xxs,
  },
  action: {
    marginTop: spacing.lg,
  },
});
