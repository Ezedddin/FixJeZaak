import { useLocalSearchParams, useRouter } from 'expo-router';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AnalysisSection } from '@/components/case';
import { Button, ScreenHeader, StatusBadge } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { selectCaseById, useCasesStore } from '@/store/casesStore';
import type { CaseOutcome } from '@/types';
import type { StatusTone } from '@/utils/caseStatus';

const OUTCOME_META: Record<string, { label: string; title: string; tone: StatusTone }> = {
  toegewezen: { label: 'Toegewezen', title: 'Je verzoek is toegewezen', tone: 'success' },
  deels_toegewezen: { label: 'Deels toegewezen', title: 'Je verzoek is deels toegewezen', tone: 'warning' },
  afgewezen: { label: 'Afgewezen', title: 'Je verzoek is afgewezen', tone: 'danger' },
  onduidelijk: { label: 'Onduidelijk', title: 'De uitkomst is niet helemaal duidelijk', tone: 'info' },
};

const OUTCOME_TO_CASE: Record<string, CaseOutcome | undefined> = {
  toegewezen: 'gewonnen',
  deels_toegewezen: 'deels',
  afgewezen: 'verloren',
  onduidelijk: undefined,
};

export default function ResponseReceivedScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const cases = useCasesStore((state) => state.cases);
  const legalCase = selectCaseById(cases, id);
  const patchCase = useCasesStore((state) => state.patchCase);
  const addTimelineEvent = useCasesStore((state) => state.addTimelineEvent);
  const response = legalCase?.responseAnalysis;

  if (!legalCase || !response) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Reactie" />
        <Text style={[styles.statusTitle, { padding: spacing.lg }]}>Er is nog geen reactie toegevoegd.</Text>
      </View>
    );
  }

  const meta = OUTCOME_META[response.outcome] ?? OUTCOME_META.onduidelijk;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Reactie ontvangen" subtitle={legalCase.counterparty} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statusBlock}>
          <StatusBadge label={meta.label} tone={meta.tone} />
          <Text style={styles.statusTitle}>{meta.title}</Text>
        </View>

        <AnalysisSection title="Wat staat er in de reactie?" text={response.summary} />
        {response.reasons.length > 0 ? <AnalysisSection title="Genoemde redenen" items={response.reasons} /> : null}
        {response.nextSteps.length > 0 ? (
          <AnalysisSection title="Mogelijke vervolgstappen" items={response.nextSteps} />
        ) : (
          <AnalysisSection
            title="Mogelijke vervolgstappen"
            text="We hebben geen betrouwbare bron gevonden over vervolgstappen voor deze situatie. Laat een jurist meekijken als je verder wilt."
          />
        )}
        {(response.sources ?? []).map((source) => (
          <Text key={source.title} style={styles.source} onPress={() => Linking.openURL(source.sourceUrl)}>
            Bron: {source.sourceName}
          </Text>
        ))}

        <Button
          label="Vraag FixJeZaak"
          variant="secondary"
          onPress={() => router.push({ pathname: '/case/[id]/assistant', params: { id: legalCase.id } })}
        />
        <Button label="Laat een jurist meekijken" onPress={() => router.push('/help/booking')} />
        <Button
          label="Zaak afronden"
          variant="secondary"
          onPress={() => {
            patchCase(legalCase.id, {
              status: 'resolved',
              outcome: OUTCOME_TO_CASE[response.outcome],
              nextAction: 'Deze zaak is afgerond',
            });
            addTimelineEvent(legalCase.id, { type: 'afgerond', date: new Date().toISOString(), title: 'Zaak afgerond' });
            router.replace({ pathname: '/case/[id]/resolved', params: { id: legalCase.id } });
          }}
        />
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
  statusBlock: {
    backgroundColor: colors.warningBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  statusTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  source: {
    ...typography.small,
    color: colors.accent,
  },
});
