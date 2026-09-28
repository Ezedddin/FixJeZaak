import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, shadow, spacing } from '@/constants/theme';

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padding?: number;
  elevated?: boolean;
}

export function Card({ children, onPress, style, padding = spacing.md, elevated = true }: CardProps) {
  const boxStyle = [styles.base, elevated && shadow.sm, { padding }, style];

  if (!onPress) {
    return <View style={boxStyle}>{children}</View>;
  }

  // Pressable carries the box styling directly (no extra wrapper View) so that
  // layout props (width, flex, gap) in `style` resolve against the real parent
  // instead of being trapped on an inner node with no defined size.
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [...boxStyle, pressed && styles.pressed]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.9,
  },
});
