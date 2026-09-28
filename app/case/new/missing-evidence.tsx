import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, LoadingState, ScreenHeader, StatusBadge } from '@/components/ui';
import { colors, spacing, typography } from '@/constants/theme';
import { caseService } from '@/services/caseService';
import { backendClient } from '@/services/backendClient';
import { documentService } from '@/services/documentService';
import { pickReadableFile } from '@/services/filePicker';
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

  async function handleUpload(source: 'camera' | 'file') {
    if (!caseId) return;
    const picked = await pickReadableFile(source, 'Bewijs');
    if (!picked) return;
    if (!picked.ok) {
      setError(picked.message);
      return;
    }
    if (!backendCaseId) {
      setError('Je bewijs kan nu niet worden opgeslagen. Controleer je internetverbinding en probeer het opnieuw.');
      return;
    }

    setProcessing(true);
    setError(null);
    let uploaded;
    try {
      uploaded = await backendClient.uploadEvidence(backendCaseId, picked.file);
    } catch {
      setProcessing(false);
      setError('Je bewijs kon niet worden geüpload. Controleer je internetverbinding en probeer het opnieuw.');
      return;
    }
    if (!uploaded.readable) {
      setProcessing(false);
      setError('We konden dit bewijs niet goed lezen. Maak een duidelijkere foto of upload een PDF.');
      return;
    }

    const doc = documentService.createDocument({
      name: picked.file.filename,
      category: 'mijn_zaken',
      source: 'upload',
      caseId,
      mimeType: picked.file.mimeType,
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
              <Button label="Maak een foto van je bewijs" onPress={() => handleUpload('camera')} />
              <Button label="Kies een bestand" variant="secondary" onPress={() => handleUpload('file')} />
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
