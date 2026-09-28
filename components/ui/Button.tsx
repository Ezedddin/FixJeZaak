import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        size === 'lg' ? styles.lg : styles.md,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      <Content
        label={label}
        variant={variant}
        loading={loading}
        Icon={Icon}
        iconPosition={iconPosition}
      />
    </Pressable>
  );
}

function Content({
  label,
  variant,
  loading,
  Icon,
  iconPosition,
}: {
  label: string;
  variant: ButtonVariant;
  loading: boolean;
  Icon?: LucideIcon;
  iconPosition: 'left' | 'right';
}) {
  const textColor = textColorFor(variant);

  if (loading) {
    return <ActivityIndicator color={textColor} />;
  }

  const iconEl: ReactNode = Icon ? <Icon size={18} color={textColor} strokeWidth={2.25} /> : null;

  return (
    <View style={styles.row}>
      {iconPosition === 'left' && iconEl}
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      {iconPosition === 'right' && iconEl}
    </View>
  );
}

function textColorFor(variant: ButtonVariant): string {
  switch (variant) {
    case 'primary':
      return colors.onPrimary;
    case 'secondary':
      return colors.primary;
    case 'ghost':
      return colors.accent;
    case 'danger':
      return colors.onPrimary;
  }
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  md: {
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
  },
  lg: {
    paddingVertical: 16,
    paddingHorizontal: spacing.xl,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  label: {
    ...typography.bodyMedium,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
});

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: colors.danger,
  },
});
