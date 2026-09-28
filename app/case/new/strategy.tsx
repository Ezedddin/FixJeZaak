import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { RecommendationCard } from '@/components/case';
import { Button, ScreenHeader } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { caseService } from '@/services/caseService';
import { selectCaseById, useCasesStore } from '@/store/casesStore';
import { useIntakeStore } from '@/store/intakeStore';
import type { RecommendedAction } from '@/types';

export default function StrategyScreen() {
  const router = useRouter();
  const caseId = useIntakeStore((state) => state.caseId);
  const title = useIntakeStore((state) => state.title);
  const extractedFields = useIntakeStore((state) => state.extractedFields);
  const recommendedActions = useIntakeStore((state) => state.recommendedActions);
  const selectAction = useIntakeStore((state) => state.selectAction);
  const setGeneratedDocument = useIntakeStore((state) => state.setGeneratedDocument);
  const backendCaseId = useCasesStore(
    (state) => selectCaseById(state.cases, caseId ?? undefined)?.backendCaseId,
  );

  const storeSelectAction = useCasesStore((state) => state.selectAction);
  const storeSetGeneratedDocument = useCasesStore((state) => state.setGeneratedDocument);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function fieldValue(key: string) {
    return extractedFields.find((f) => f.key === key)?.value;
  }

  async function handleSelect(action: RecommendedAction) {
    if (!caseId || generating) return;

    if (action.type !== 'bezwaar') return;

    selectAction(action.id);
    storeSelectAction(caseId, action.id);
    setGenerating(true);
    setError(null);

    const kenmerk = fieldValue('reference_number');
    const result = await caseService.generateLegalDocument({
      caseId,
      counterparty: fieldValue('authority') ?? 'de instantie',
      subject: `Bezwaar ${title}${kenmerk ? ` — kenmerk ${kenmerk}` : ''}`,
      reference: kenmerk,
      // Only facts the user confirmed — never the analysis' own arguments.
      facts: extractedFields.filter((f) => f.value.trim()).map((f) => `${f.label}: ${f.value}`),
      backendCaseId,
    });

    setGenerating(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setGeneratedDocument(result.value);
    storeSetGeneratedDocument(caseId, result.value);
    router.push('/case/new/document-preview');
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Wat kun je nu doen?" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Button label="Gegevens aanvullen" variant="secondary" onPress={() => router.push('/case/new/document-analysis')} />
          </View>
        ) : null}
        {recommendedActions.map((action) => (
          <RecommendationCard
            key={action.id}
            action={generating ? { ...action, ctaLabel: 'Bezig…' } : action}
            onPress={() => handleSelect(action)}
          />
        ))}
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
    gap: spacing.md,
  },
  errorBox: {
    backgroundColor: colors.warningBg,
    borderColor: colors.warningBorder,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  errorText: {
    ...typography.body,
    color: colors.textPrimary,
  },
});
