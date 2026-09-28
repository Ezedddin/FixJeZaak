import { useRouter } from 'expo-router';
import { ChevronRight, MessageCircle, Scale, Users } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useCasesStore } from '@/store/casesStore';

export default function HelpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cases = useCasesStore((state) => state.cases);

  function openAssistant() {
    const activeCase = [...cases]
      .filter((c) => c.status !== 'resolved')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
    if (activeCase) {
      router.push({ pathname: '/case/[id]/assistant', params: { id: activeCase.id } });
    } else {
      router.push('/(tabs)/cases');
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + spacing.sm, paddingBottom: spacing.xxxl }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Hulp</Text>
      <Text style={styles.subtitle}>Persoonlijke ondersteuning bij je zaak</Text>

      <Pressable style={styles.featuredCard} onPress={openAssistant}>
        <View style={styles.featuredIconWrap}>
          <Scale size={20} color={colors.onPrimary} strokeWidth={2} />
        </View>
        <Text style={styles.featuredTitle}>AI-assistent</Text>
        <Text style={styles.featuredDescription}>
          Direct hulp bij je zaak. Stel een vraag over je dossier, de wet of een procedure.
        </Text>
        <View style={styles.featuredButton}>
          <MessageCircle size={15} color={colors.onPrimary} strokeWidth={2.25} />
          <Text style={styles.featuredButtonText}>Vraag stellen</Text>
        </View>
      </Pressable>

      <View style={styles.list}>
        <HelpRow
          icon={Scale}
          iconColor="#6D4EA8"
          iconBg="#EEE8F7"
          title="Jurist"
          description="Laat een jurist je dossier controleren"
          meta="Hasan of Ezeddin"
          onPress={() => router.push('/help/booking')}
        />
        <HelpRow
          icon={Users}
          iconColor="#1B8A5A"
          iconBg="#E7F5EE"
          title="Begeleiding"
          description="Bereid een belangrijk gesprek voor"
          meta="Voorbereiden & oefenen met AI"
          onPress={() => router.push('/help/conversation-prep')}
        />
      </View>
    </ScrollView>
  );
}

function HelpRow({
  icon: Icon,
  iconColor,
  iconBg,
  title,
  description,
  meta,
  onPress,
}: {
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  meta: string;
  onPress: () => void;
}) {
  return (
    <Card onPress={onPress} style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <Icon size={19} color={iconColor} strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowDescription}>{description}</Text>
        <Text style={styles.rowMeta}>{meta}</Text>
      </View>
      <ChevronRight size={18} color={colors.textTertiary} />
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.xl,
  },
  featuredCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  featuredIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  featuredTitle: {
    ...typography.h3,
    color: colors.onPrimary,
  },
  featuredDescription: {
    ...typography.body,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    marginBottom: spacing.md,
  },
  featuredButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  featuredButtonText: {
    ...typography.smallMedium,
    color: colors.onPrimary,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  rowDescription: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 1,
  },
  rowMeta: {
    ...typography.smallMedium,
    color: colors.accent,
    marginTop: 3,
  },
});
