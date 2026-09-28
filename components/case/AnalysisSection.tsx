import { Check, Minus, TriangleAlert } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/constants/theme';

type SectionVariant = 'neutral' | 'positive' | 'negative';

interface AnalysisSectionProps {
  title: string;
  text?: string;
  items?: string[];
  variant?: SectionVariant;
}

export function AnalysisSection({ title, text, items, variant = 'neutral' }: AnalysisSectionProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {text ? <Text style={styles.text}>{text}</Text> : null}
      {items ? (
        <View style={styles.list}>
          {items.map((item, index) => (
            <View key={index} style={styles.item}>
              <BulletIcon variant={variant} />
              <Text style={styles.itemText}>{item}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function BulletIcon({ variant }: { variant: SectionVariant }) {
  if (variant === 'positive') return <Check size={15} color={colors.success} strokeWidth={2.5} />;
  if (variant === 'negative')
    return <TriangleAlert size={15} color={colors.warning} strokeWidth={2.25} />;
  return <Minus size={15} color={colors.textTertiary} strokeWidth={2.5} />;
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  text: {
    ...typography.body,
    color: colors.textSecondary,
  },
  list: {
    gap: spacing.xs,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  itemText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
    marginTop: -1,
  },
});
