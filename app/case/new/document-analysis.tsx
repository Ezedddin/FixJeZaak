import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, ScreenHeader } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { caseService } from '@/services/caseService';
import { useCaseType } from '@/services/caseTypes';
import { documentService } from '@/services/documentService';
import { selectCaseById, useCasesStore } from '@/store/casesStore';
import { useIntakeStore } from '@/store/intakeStore';
import { parseDateInput } from '@/utils/date';

export default function DocumentAnalysisScreen() {
  const router = useRouter();
  const caseId = useIntakeStore((state) => state.caseId);
  const category = useIntakeStore((state) => state.category);
  const uploadedDocument = useIntakeStore((state) => state.uploadedDocument);
  const extractedFields = useIntakeStore((state) => state.extractedFields);
  const updateExtractedField = useIntakeStore((state) => state.updateExtractedField);
  const updateDocument = useCasesStore((state) => state.updateDocument);
  const patchCase = useCasesStore((state) => state.patchCase);
  const legalCase = useCasesStore((state) => selectCaseById(state.cases, caseId ?? undefined));
  const { info } = useCaseType(category);

  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const required = new Set(info?.requiredFields ?? []);

  async function handleConfirm() {
    if (confirming || !caseId) return;
    const missing = extractedFields.filter((f) => required.has(f.key) && !f.value.trim());
    if (missing.length > 0) {
      setError(`Vul nog in: ${missing.map((f) => f.label).join(', ')}.`);
      return;
    }
    setError(null);
    setConfirming(true);

    let backendCaseId = legalCase?.backendCaseId;
    if (!backendCaseId && legalCase) {
      backendCaseId = await caseService.linkBackendCase(legalCase);
      if (backendCaseId) patchCase(caseId, { backendCaseId });
    }
    // The backend only drafts a letter from confirmed facts, so the user's
    // review (including edits) has to reach it before moving on.
    const saved = backendCaseId
      ? await documentService.confirmExtractedFields(backendCaseId, extractedFields)
      : false;
    setConfirming(false);
    if (!saved) {
      setError('Je gegevens konden niet worden opgeslagen. Controleer je internetverbinding en probeer het opnieuw.');
      return;
    }

    const valueOf = (key: string | null | undefined) =>
      key ? extractedFields.find((f) => f.key === key)?.value.trim() || undefined : undefined;
    const deadline = parseDateInput(valueOf(info?.deadlineField) ?? '');
    patchCase(caseId, {
      counterparty: valueOf(info?.recipientField),
      ...(deadline ? { deadline } : {}),
    });

    const confirmedFields = extractedFields.map((field) => ({ ...field, needsConfirmation: false }));
    if (uploadedDocument) {
      updateDocument(caseId, uploadedDocument.id, { extractedFields: confirmedFields });
    }
    router.push('/case/new/missing-evidence');
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader
        title={uploadedDocument?.documentTitle ?? 'Gegevens van je zaak'}
        subtitle={uploadedDocument ? 'Controleer of deze gegevens kloppen en vul aan wat ontbreekt.' : 'Vul de gegevens van je zaak in.'}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={styles.card}>
          {extractedFields.map((field) => (
            <View key={field.key} style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>
                {field.label}
                {required.has(field.key) ? ' *' : ''}
                {field.needsConfirmation ? <Text style={styles.checkHint}>  · controleer dit</Text> : null}
              </Text>
              <TextInput
                style={[styles.fieldInput, field.key === 'issue' && styles.fieldInputMultiline]}
                value={field.value}
                multiline={field.key === 'issue'}
                placeholder={required.has(field.key) ? 'Verplicht' : 'Optioneel'}
                placeholderTextColor={colors.textTertiary}
                onChangeText={(value) => updateExtractedField(field.key, value)}
              />
            </View>
          ))}
        </Card>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button label="Gegevens kloppen" onPress={handleConfirm} loading={confirming} />
      </ScrollView>
    </KeyboardAvoidingView>
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
  fieldInput: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  fieldInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  error: {
    ...typography.small,
    color: colors.danger,
  },
});
