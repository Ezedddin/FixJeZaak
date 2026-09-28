import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Camera, FileUp } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { DocumentCard } from '@/components/document/DocumentCard';
import { UploadCard } from '@/components/document/UploadCard';
import { Button, ScreenHeader } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { caseService } from '@/services/caseService';
import { useCaseType } from '@/services/caseTypes';
import { buildReviewFields, documentService, READABLE_DOCUMENT_TYPES } from '@/services/documentService';
import { selectCaseById, useCasesStore } from '@/store/casesStore';
import { useIntakeStore } from '@/store/intakeStore';
import type { LegalDocument } from '@/types';

export default function UploadDocumentScreen() {
  const router = useRouter();
  const caseId = useIntakeStore((state) => state.caseId);
  const category = useIntakeStore((state) => state.category);
  const description = useIntakeStore((state) => state.description);
  const { info } = useCaseType(category);
  const setUploadedDocument = useIntakeStore((state) => state.setUploadedDocument);
  const setExtractedFields = useIntakeStore((state) => state.setExtractedFields);
  const addDocument = useCasesStore((state) => state.addDocument);
  const patchCase = useCasesStore((state) => state.patchCase);
  const legalCase = useCasesStore((state) => selectCaseById(state.cases, caseId ?? undefined));

  const [document, setDocument] = useState<LegalDocument | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePicked(name: string, image: { base64: string; mediaType: string }) {
    if (!caseId || busy) return;
    setBusy(true);
    setError(null);
    const doc = documentService.createDocument({
      name,
      category: 'mijn_zaken',
      source: 'upload',
      caseId,
      mimeType: image.mediaType,
    });
    setDocument(doc);

    // Case creation links the backend case in the background; if that hasn't
    // landed yet, link now so the document is read server-side.
    let backendCaseId = legalCase?.backendCaseId;
    if (!backendCaseId && legalCase) {
      backendCaseId = await caseService.linkBackendCase(legalCase);
      if (backendCaseId) patchCase(caseId, { backendCaseId });
    }

    const result = await documentService.analyzeDocumentImage(
      { ...image, filename: name },
      { backendCaseId, caseType: category ?? 'anders', description },
    );
    setBusy(false);
    if (!result.ok) {
      setDocument(null);
      setError(result.message);
      return;
    }

    const analyzedDoc: LegalDocument = {
      ...doc,
      status: 'analyzed',
      documentTitle: result.documentTitle,
      extractedFields: result.fields,
    };
    setDocument(analyzedDoc);
    addDocument(caseId, analyzedDoc);
    patchCase(caseId, { status: 'analysing' });
    setUploadedDocument(analyzedDoc);
    setExtractedFields(result.fields);
    router.push('/case/new/document-analysis');
  }

  function handleNoDocument() {
    if (!info) {
      setError('De gegevens voor deze zaak konden niet worden geladen. Controleer je internetverbinding en probeer het opnieuw.');
      return;
    }
    setUploadedDocument(null);
    setExtractedFields(buildReviewFields(info, { description }));
    router.push('/case/new/document-analysis');
  }

  async function readAsBase64(uri: string): Promise<string | null> {
    try {
      return await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    } catch {
      return null;
    }
  }

  async function handleCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('Geef FixJeZaak toegang tot je camera in je instellingen, of kies een bestand.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6, base64: false });
    if (result.canceled) return;

    const asset = result.assets[0];
    const base64 = await readAsBase64(asset.uri);
    if (!base64) {
      setError('De foto kon niet worden geopend. Probeer het opnieuw.');
      return;
    }
    void handlePicked('Boete-foto.jpg', { base64, mediaType: asset.mimeType ?? 'image/jpeg' });
  }

  async function handleFilePicker() {
    const result = await DocumentPicker.getDocumentAsync({ type: READABLE_DOCUMENT_TYPES, copyToCacheDirectory: true });
    if (result.canceled) return;

    const asset = result.assets[0];
    const mediaType = asset.mimeType ?? '';
    if (!READABLE_DOCUMENT_TYPES.includes(mediaType)) {
      setError('Dit bestandstype kunnen we niet lezen. Kies een foto (JPG of PNG) of een PDF.');
      return;
    }
    const base64 = await readAsBase64(asset.uri);
    if (!base64) {
      setError('Het bestand kon niet worden geopend. Probeer het opnieuw.');
      return;
    }
    void handlePicked(asset.name, { base64, mediaType });
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Voeg je documenten toe" subtitle={info?.documentHint ?? 'Upload de brief of het document waar het om gaat.'} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.cardsRow}>
          <UploadCard icon={Camera} label="Maak een foto" onPress={handleCamera} />
          <UploadCard icon={FileUp} label="Kies bestand" onPress={handleFilePicker} />
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {busy ? <Text style={styles.busyText}>We lezen je document…</Text> : null}

        {!busy ? (
          <Button label="Ik heb geen document" variant="secondary" onPress={handleNoDocument} />
        ) : null}

        {document ? (
          <View style={styles.uploadedSection}>
            <Text style={styles.sectionLabel}>Geüpload document</Text>
            <DocumentCard document={document} />
          </View>
        ) : null}
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
  cardsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  uploadedSection: {
    gap: spacing.sm,
  },
  errorBox: {
    backgroundColor: colors.warningBg,
    borderColor: colors.warningBorder,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  errorText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  busyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  sectionLabel: {
    ...typography.h3,
    color: colors.textPrimary,
  },
});
