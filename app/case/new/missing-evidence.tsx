import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, LoadingState, ScreenHeader, StatusBadge } from '@/components/ui';
import { colors, spacing, typography } from '@/constants/theme';
import { caseService } from '@/services/caseService';
import { documentService } from '@/services/documentService';
import { selectCaseById, useCasesStore } from '@/store/casesStore';
import { useIntakeStore } from '@/store/intakeStore';
import { generateId } from '@/utils/id';

const EVIDENCE_TITLE = 'Aanvullend bewijs';
const EVIDENCE_EXPLANATION =
  "Heb je iets dat jouw kant van het verhaal ondersteunt? Bijvoorbeeld een betalingsbewijs, foto's van de situatie of eerdere correspondentie.";

export default function MissingEvidenceScreen() {
  const router = useRouter();
  const caseId = useIntakeStore((state) => state.caseId);
  const description = useIntakeStore((state) => state.description);
  const setEvidenceStatus = useIntakeStore((state) => state.setEvidenceStatus);
  const setAnalysis = useIntakeStore((state) => state.setAnalysis);
  const addDocument = useCasesStore((state) => state.addDocument);
  const upsertEvidence = useCasesStore((state) => state.upsertEvidence);
  const setCaseAnalysis = useCasesStore((state) => state.setAnalysis);
  const patchCase = useCasesStore((state) => state.patchCase);
  const backendCaseId = useCasesStore(
    (state) => selectCaseById(state.cases, caseId ?? undefined)?.backendCaseId,
  );

  const [showWeakerNotice, setShowWeakerNotice] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastHasEvidence, setLastHasEvidence] = useState<boolean | null>(null);

  async function finishWithEvidence(hasEvidence: boolean) {
    if (!caseId) return;
    setProcessing(true);
    setError(null);
    setLastHasEvidence(hasEvidence);
    patchCase(caseId, { status: 'analysing' });
    const result = await caseService.analyzeCase({ hasEvidence, description, backendCaseId });
    setProcessing(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setCaseAnalysis(caseId, result.value);
    setAnalysis(result.value);
    router.push('/case/new/analysis');
  }

  async function handleUpload() {
    if (!caseId) return;
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (result.canceled) return;
    const fileName = result.assets[0].name;
    const doc = documentService.createDocument({
      name: fileName,
      category: 'mijn_zaken',
      source: 'upload',
      caseId,
    });
    addDocument(caseId, { ...doc, status: 'klaar' });
    upsertEvidence(caseId, {
      id: generateId('evi'),
      caseId,
      title: EVIDENCE_TITLE,
      explanation: EVIDENCE_EXPLANATION,
      status: 'geupload',
      documentId: doc.id,
    });
    setEvidenceStatus('geupload');
    await finishWithEvidence(true);
  }

  function handleSkip() {
    setShowWeakerNotice(true);
  }

  async function confirmSkip() {
    if (!caseId) return;
    upsertEvidence(caseId, {
      id: generateId('evi'),
      caseId,
      title: EVIDENCE_TITLE,
      explanation: EVIDENCE_EXPLANATION,
      status: 'overgeslagen',
    });
    setEvidenceStatus('overgeslagen');
    await finishWithEvidence(false);
  }

  if (processing) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="We werken je analyse bij" showBack={false} />
        <LoadingState label="Analyse bijwerken…" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="We hebben nog iets nodig" />
      <View style={styles.content}>
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>{EVIDENCE_TITLE}</Text>
          <Text style={styles.cardExplanation}>{EVIDENCE_EXPLANATION}</Text>

          {error ? (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>{error}</Text>
              {lastHasEvidence !== null ? (
                <Button label="Opnieuw proberen" onPress={() => finishWithEvidence(lastHasEvidence)} />
              ) : null}
            </View>
          ) : null}

          {showWeakerNotice ? (
            <View style={styles.notice}>
              <StatusBadge label="Zaak mogelijk zwakker" tone="warning" size="sm" />
              <Text style={styles.noticeText}>
                Zonder betalingsbewijs is je zaak lastiger hard te maken. We gaan wel gewoon verder
                met de informatie die we hebben.
              </Text>
              <Button label="Doorgaan" onPress={confirmSkip} variant="secondary" />
            </View>
          ) : (
            <View style={styles.actions}>
              <Button label="Upload bewijs" onPress={handleUpload} />
              <Button label="Ik heb dit niet" onPress={handleSkip} variant="secondary" />
            </View>
          )}
        </Card>
      </View>
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
  },
  card: {
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  cardExplanation: {
    ...typography.body,
    color: colors.textSecondary,
  },
  actions: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  notice: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  noticeText: {
    ...typography.small,
    color: colors.textSecondary,
  },
});
