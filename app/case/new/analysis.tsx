import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AnalysisSection, CaseStrengthBadge } from '@/components/case';
import { BottomSheet, Button, ScreenHeader } from '@/components/ui';
import { colors, spacing, typography } from '@/constants/theme';
import { caseService } from '@/services/caseService';
import { useCasesStore } from '@/store/casesStore';
import { useIntakeStore } from '@/store/intakeStore';

export default function CaseAnalysisScreen() {
  const router = useRouter();
  const caseId = useIntakeStore((state) => state.caseId);
  const analysis = useIntakeStore((state) => state.analysis);
  const setRecommendedActions = useIntakeStore((state) => state.setRecommendedActions);
  const storeSetRecommendedActions = useCasesStore((state) => state.setRecommendedActions);
  const patchCase = useCasesStore((state) => state.patchCase);

  const [sheetVisible, setSheetVisible] = useState(false);

  if (!analysis) return null;

  const sources = analysis.sources ?? [];

  function handleContinue() {
    if (!caseId) return;
    const actions = caseService.getRecommendedActions();
    setRecommendedActions(actions);
    storeSetRecommendedActions(caseId, actions);
    patchCase(caseId, { nextAction: 'Kies een aanpak voor je bezwaar' });
    router.push('/case/new/strategy');
  }

  function handleFullAnalysis() {
    setSheetVisible(true);
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Analyse van je zaak" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <CaseStrengthBadge strength={analysis.strength} />
        <AnalysisSection title="Samenvatting" text={analysis.summary} />
        <AnalysisSection title="In jouw voordeel" items={analysis.inFavor} variant="positive" />
        {analysis.potentialIssues.length > 0 ? (
          <AnalysisSection
            title="Mogelijke problemen"
            items={analysis.potentialIssues}
            variant="negative"
          />
        ) : null}
        <AnalysisSection title="Wat kan de tegenpartij zeggen?" text={analysis.counterArgument} />
        <AnalysisSection title="Ons advies" text={analysis.advice} />

        <View style={styles.actions}>
          <Button label="Kies een aanpak" onPress={handleContinue} />
          <Button label="Bekijk bronnen" onPress={handleFullAnalysis} variant="secondary" />
        </View>
      </ScrollView>

      <BottomSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        title="Bronnen"
      >
        <View style={{ gap: spacing.sm, paddingBottom: spacing.lg }}>
          {sources.length === 0 ? (
            <Text style={styles.sheetText}>
              We hebben geen betrouwbare bron gevonden voor deze zaak. De analyse is daarom alleen
              gebaseerd op de gegevens van je boete.
            </Text>
          ) : (
            sources.map((source) => (
              <Text key={source.title} style={styles.sheetText}>
                {source.snippet}{' '}
                <Text style={styles.sourceLink} onPress={() => Linking.openURL(source.sourceUrl)}>
                  ({source.sourceName})
                </Text>
              </Text>
            ))
          )}
        </View>
      </BottomSheet>
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
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  sheetText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  sourceLink: {
    color: colors.accent,
  },
});
