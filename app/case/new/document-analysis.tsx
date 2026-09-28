import { useRouter } from 'expo-router';
import { SquarePen } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, ScreenHeader } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { documentService } from '@/services/documentService';
import { selectCaseById, useCasesStore } from '@/store/casesStore';
import { useIntakeStore } from '@/store/intakeStore';

export default function DocumentAnalysisScreen() {
  const router = useRouter();
  const caseId = useIntakeStore((state) => state.caseId);
  const uploadedDocument = useIntakeStore((state) => state.uploadedDocument);
  const extractedFields = useIntakeStore((state) => state.extractedFields);
  const updateExtractedField = useIntakeStore((state) => state.updateExtractedField);
  const updateDocument = useCasesStore((state) => state.updateDocument);
  const backendCaseId = useCasesStore(
    (state) => selectCaseById(state.cases, caseId ?? undefined)?.backendCaseId,
  );

  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function handleConfirm() {
    if (confirming) return;
    const confirmedFields = extractedFields.map((field) => ({ ...field, needsConfirmation: false }));
    if (caseId && uploadedDocument) {
      updateDocument(caseId, uploadedDocument.id, { extractedFields: confirmedFields });
    }
    // The backend only drafts an objection from confirmed facts, so the
    // user's review (including edits) has to reach it before moving on.
    if (backendCaseId) {
      setConfirming(true);
      await documentService.confirmExtractedFields(backendCaseId, extractedFields);
      setConfirming(false);
    }
    router.push('/case/new/missing-evidence');
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={uploadedDocument?.documentTitle ?? 'Documentanalyse'}
        subtitle="Controleer of deze gegevens kloppen."
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          {extractedFields.map((field) => (
            <View key={field.key} style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>
                {field.label}
                {field.needsConfirmation ? <Text style={styles.checkHint}>  · controleer dit</Text> : null}
              </Text>
              {editing ? (
                <TextInput
                  style={styles.fieldInput}
                  value={field.value}
                  onChangeText={(value) => updateExtractedField(field.key, value)}
                />
              ) : (
                <Text style={styles.fieldValue}>{field.value}</Text>
              )}
            </View>
          ))}
        </Card>

        <Button
          label={editing ? 'Klaar met aanpassen' : 'Aanpassen'}
          onPress={() => setEditing((prev) => !prev)}
          variant="secondary"
          icon={SquarePen}
        />
        <Button label="Gegevens kloppen" onPress={handleConfirm} loading={confirming} />
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
  card: {
    gap: spacing.md,
  },
  fieldRow: {
    gap: 4,
  },
  fieldLabel: {
    ...typography.small,
    color: colors.textTertiary,
  },
  checkHint: {
    color: colors.warning,
  },
  fieldValue: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  fieldInput: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
});
