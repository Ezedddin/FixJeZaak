import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CategoryMeta } from '@/constants/categories';
import { colors, radius, shadow, spacing, typography } from '@/constants/theme';

interface CategoryCardProps {
  meta: CategoryMeta;
  onPress: () => void;
  selected?: boolean;
}

export function CategoryCard({ meta, onPress, selected = false }: CategoryCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        shadow.sm,
        selected && styles.cardSelected,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: meta.backgroundColor }]}>
        <Text style={styles.emoji}>{meta.emoji}</Text>
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {meta.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  cardSelected: {
    borderColor: colors.primary,
  },
  pressed: {
    opacity: 0.8,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 19,
  },
  label: {
    ...typography.smallMedium,
    color: colors.textPrimary,
  },
});
