import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AnalysisSection } from '@/components/case';
import { Button, ScreenHeader, StatusBadge } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { selectCaseById, useCasesStore } from '@/store/casesStore';

export default function ResponseReceivedScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const cases = useCasesStore((state) => state.cases);
  const legalCase = selectCaseById(cases, id);

  if (!legalCase) return null;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Nieuwe reactie ontvangen" subtitle={legalCase.counterparty} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statusBlock}>
          <StatusBadge label="Bezwaar afgewezen" tone="warning" />
          <Text style={styles.statusTitle}>Je bezwaar is afgewezen</Text>
        </View>

        <AnalysisSection
          title="Waarom?"
          text={
            legalCase.analysis?.counterArgument ??
            'De gemeente heeft aangegeven dat de aangeleverde onderbouwing niet voldoende was om de aanslag te vernietigen.'
          }
        />
        <AnalysisSection
          title="Onze analyse"
          text="Op basis van de reactie zien we nog ruimte om in beroep te gaan bij de rechtbank, al is de uitkomst daarvan niet gegarandeerd. We adviseren dit alleen te doen als je de onderbouwing kunt versterken."
        />
        <AnalysisSection
          title="Wat kun je nu doen?"
          items={[
            'In beroep gaan bij de onafhankelijke rechtbank',
            'Aanvullend bewijs verzamelen ter versterking van je zaak',
            'De zaak laten rusten',
          ]}
        />

        <Button label="Bekijk volgende stap" onPress={() => router.back()} />
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
});
