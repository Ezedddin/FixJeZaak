import { useRouter } from 'expo-router';
import { ArrowUp, Bell, Camera, ClipboardList, Mic, Paperclip } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CaseCard } from '@/components/case/CaseCard';
import { CategoryCard } from '@/components/case/CategoryCard';
import { EmptyState } from '@/components/ui';
import { CATEGORY_META, CATEGORY_ORDER } from '@/constants/categories';
import { colors, radius, shadow, spacing, typography } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import { useCasesStore } from '@/store/casesStore';
import { useNotificationsStore, unreadCount } from '@/store/notificationsStore';
import { getGreeting } from '@/utils/greeting';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const cases = useCasesStore((state) => state.cases);
  const notifications = useNotificationsStore((state) => state.notifications);
  const [problemText, setProblemText] = useState('');

  const unread = unreadCount(notifications);

  const ongoingCases = useMemo(
    () =>
      [...cases]
        .filter((c) => c.status !== 'resolved')
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 3),
    [cases],
  );

  function goToIntake(draft?: string) {
    router.push({ pathname: '/case/new', params: draft ? { draft } : {} });
  }

  function goToCategory(categoryId: string) {
    router.push({ pathname: '/case/new', params: { category: categoryId } });
  }

  function handleSend() {
    const text = problemText.trim();
    goToIntake(text.length > 0 ? text : undefined);
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={[styles.hero, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.heroTopRow}>
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.name}>{user?.name ?? 'Welkom'}</Text>
          </View>
          <Pressable style={styles.bellButton} onPress={() => router.push('/notifications')} hitSlop={8}>
            <Bell size={19} color={colors.onPrimary} strokeWidth={2} />
            {unread > 0 ? (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unread}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <View style={[styles.inputCard, shadow.md]}>
          <Text style={styles.inputEyebrow}>Wat kunnen we voor je oplossen?</Text>
          <TextInput
            style={styles.input}
            placeholder="Vertel wat er aan de hand is…"
            placeholderTextColor={colors.textTertiary}
            value={problemText}
            onChangeText={setProblemText}
            multiline
          />
          <View style={styles.inputDivider} />
          <View style={styles.inputActions}>
            <View style={styles.inputActionsLeft}>
              <IconAction icon={Mic} label="Spraak" onPress={() => goToIntake()} />
              <IconAction icon={Camera} label="Foto" onPress={() => goToIntake()} />
              <IconAction icon={Paperclip} label="Bestand" onPress={() => goToIntake()} />
            </View>
            <Pressable style={styles.sendButton} onPress={handleSend} hitSlop={8}>
              <ArrowUp size={17} color={colors.onPrimary} strokeWidth={2.5} />
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Kies je categorie</Text>
        <View style={styles.categoryGrid}>
          {CATEGORY_ORDER.map((id) => (
            <View key={id} style={styles.categoryItem}>
              <CategoryCard meta={CATEGORY_META[id]} onPress={() => goToCategory(id)} />
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Mijn lopende zaken</Text>
            {ongoingCases.length > 0 ? (
              <Pressable onPress={() => router.push('/(tabs)/cases')} hitSlop={8}>
                <Text style={styles.allCasesLink}>Alle zaken</Text>
              </Pressable>
            ) : null}
          </View>
          {ongoingCases.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Nog geen lopende zaken"
              description="Start hierboven je eerste zaak — wij helpen je stap voor stap."
            />
          ) : (
            <View style={styles.caseList}>
              {ongoingCases.map((legalCase) => (
                <CaseCard
                  key={legalCase.id}
                  legalCase={legalCase}
                  onPress={() => router.push({ pathname: '/case/[id]', params: { id: legalCase.id } })}
                />
              ))}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function IconAction({
  icon: Icon,
  label,
  onPress,
}: {
  icon: typeof Mic;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.iconAction} onPress={onPress} hitSlop={6}>
      <Icon size={16} color={colors.textSecondary} strokeWidth={2} />
      <Text style={styles.iconActionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  hero: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  greeting: {
    ...typography.body,
    color: 'rgba(255,255,255,0.65)',
  },
  name: {
    ...typography.h1,
    color: colors.onPrimary,
    marginTop: 2,
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  bellBadgeText: {
    ...typography.tiny,
    fontSize: 10,
    color: colors.onPrimary,
  },
  inputCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  inputEyebrow: {
    ...typography.tiny,
    color: colors.textTertiary,
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  input: {
    ...typography.bodyLg,
    color: colors.textPrimary,
    minHeight: 44,
  },
  inputDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  inputActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputActionsLeft: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  iconAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  iconActionLabel: {
    ...typography.small,
    color: colors.textSecondary,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
    marginHorizontal: -spacing.xxs,
  },
  categoryItem: {
    width: '25%',
    padding: spacing.xxs,
  },
  section: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  allCasesLink: {
    ...typography.smallMedium,
    color: colors.accent,
  },
  caseList: {
    gap: spacing.sm,
  },
});
