import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/constants/theme';
import type { CaseEvent } from '@/types';
import { relativeDayLabel } from '@/utils/format';

interface CaseTimelineProps {
  events: CaseEvent[];
}

export function CaseTimeline({ events }: CaseTimelineProps) {
  return (
    <View>
      {events.map((event, index) => {
        const isLast = index === events.length - 1;
        return (
          <View key={event.id} style={styles.row}>
            <View style={styles.rail}>
              <View style={[styles.dot, isLast && styles.dotActive]} />
              {!isLast ? <View style={styles.line} /> : null}
            </View>
            <View style={[styles.content, !isLast && styles.contentSpacing]}>
              <Text style={styles.date}>{relativeDayLabel(event.date)}</Text>
              <Text style={[styles.title, isLast && styles.titleActive]}>{event.title}</Text>
              {event.description ? <Text style={styles.description}>{event.description}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  rail: {
    width: 20,
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.borderStrong,
    marginTop: 4,
  },
  dotActive: {
    backgroundColor: colors.accent,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingLeft: spacing.sm,
    paddingBottom: spacing.md,
  },
  contentSpacing: {
    paddingBottom: spacing.lg,
  },
  date: {
    ...typography.tiny,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  title: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    marginTop: 2,
  },
  titleActive: {
    color: colors.accent,
  },
  description: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
