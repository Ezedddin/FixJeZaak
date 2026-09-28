import { useLocalSearchParams, useRouter } from 'expo-router';
import { PartyPopper } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { CaseTimeline } from '@/components/case';
import { Button, ScreenHeader } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { selectCaseById, useCasesStore } from '@/store/casesStore';
import { formatCurrency } from '@/utils/format';

export default function CaseResolvedScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const cases = useCasesStore((state) => state.cases);
  const legalCase = selectCaseById(cases, id);

  if (!legalCase) return null;

  const resolutionEvent = [...legalCase.timeline].reverse().find((e) => e.type === 'afgerond');

  return (
    <View style={styles.container}>
      <ScreenHeader title="Zaak opgelost" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.successCard}>
          <View style={styles.iconWrap}>
            <PartyPopper size={26} color={colors.success} strokeWidth={2} />
          </View>
          <Text style={styles.resultTitle}>{resolutionEvent?.title ?? 'Zaak afgerond'}</Text>
          {legalCase.amountSaved ? (
            <Text style={styles.amount}>{formatCurrency(legalCase.amountSaved)} bespaard</Text>
          ) : null}
          {resolutionEvent?.description ? (
            <Text style={styles.description}>{resolutionEvent.description}</Text>
          ) : null}
        </View>

        <View style={styles.timelineSection}>
          <Text style={styles.sectionTitle}>Tijdlijn</Text>
          <CaseTimeline events={legalCase.timeline} />
        </View>

        <View style={styles.actions}>
          <Button
            label="Vraag FixJeZaak"
            variant="secondary"
            onPress={() => router.push({ pathname: '/case/[id]/assistant', params: { id: legalCase.id } })}
          />
          <Button label="Documenten" variant="secondary" onPress={() => router.push('/(tabs)/documents')} />
          <Button label="Sluit zaak" onPress={() => router.push('/(tabs)/cases')} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },
  successCard: {
    backgroundColor: colors.successBg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.successBorder,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  resultTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  amount: {
    ...typography.display,
    color: colors.success,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  timelineSection: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  actions: {
    gap: spacing.sm,
  },
});
