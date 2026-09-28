import { useRouter } from 'expo-router';
import { FileText } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { Button, ConfirmationModal, ScreenHeader } from '@/components/ui';
import { colors, spacing, typography } from '@/constants/theme';
import { caseService } from '@/services/caseService';
import { selectCaseById, useCasesStore } from '@/store/casesStore';
import { useIntakeStore } from '@/store/intakeStore';
import type { GeneratedLegalDocument } from '@/types';

function letterText(doc: GeneratedLegalDocument): string {
  const header = [`Aan: ${doc.recipient}`, `Betreft: ${doc.subject}`];
  if (doc.reference) header.push(`Kenmerk: ${doc.reference}`);
  return [header.join('\n'), ...doc.paragraphs].join('\n\n');
}

export default function FinalApprovalScreen() {
  const router = useRouter();
  const caseId = useIntakeStore((state) => state.caseId);
  const generatedDocument = useIntakeStore((state) => state.generatedDocument);
  const resetIntake = useIntakeStore((state) => state.reset);
  const approveGeneratedDocument = useCasesStore((state) => state.approveGeneratedDocument);
  const backendCaseId = useCasesStore(
    (state) => selectCaseById(state.cases, caseId ?? undefined)?.backendCaseId,
  );

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!generatedDocument || !caseId) return null;

  async function handleConfirmApprove() {
    const doc = generatedDocument!;
    setSubmitting(true);
    setError(null);
    const result = await caseService.approveDocument({
      backendCaseId,
      backendActionId: doc.backendActionId,
      paragraphs: doc.paragraphs,
    });
    setSubmitting(false);
    setConfirmVisible(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    approveGeneratedDocument(caseId!);

    // FixJeZaak does not send anything itself (yet): hand the approved letter
    // to the user so they can send it to the authority.
    await Share.share({ title: doc.subject, message: letterText(doc) }).catch(() => undefined);

    resetIntake();
    router.replace({ pathname: '/case/[id]', params: { id: caseId! } });
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Klaar om goed te keuren"
        subtitle="Na goedkeuring kun je de brief delen of kopiëren en zelf versturen."
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.row}>
          <Text style={styles.label}>Aan</Text>
          <Text style={styles.value}>{generatedDocument.recipient}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Betreft</Text>
          <Text style={styles.value}>{generatedDocument.subject}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Bijlagen</Text>
          <View style={{ gap: 4 }}>
            {generatedDocument.attachments.map((attachment) => (
              <View key={attachment} style={styles.attachmentRow}>
                <FileText size={15} color={colors.accent} strokeWidth={2} />
                <Text style={styles.value}>{attachment}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button label="Goedkeuren & delen" onPress={() => setConfirmVisible(true)} />
      </View>

      <ConfirmationModal
        visible={confirmVisible}
        title={`${generatedDocument.title} goedkeuren`}
        description={`Je keurt deze brief aan ${generatedDocument.recipient} goed. FixJeZaak verstuurt hem niet zelf: je kunt hem hierna delen of kopiëren en zelf versturen.`}
        confirmLabel="Goedkeuren"
        loading={submitting}
        onConfirm={handleConfirmApprove}
        onCancel={() => setConfirmVisible(false)}
      />
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
    gap: spacing.lg,
  },
  row: {
    gap: 4,
  },
  label: {
    ...typography.small,
    color: colors.textTertiary,
  },
  value: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  error: {
    ...typography.small,
    color: colors.danger,
  },
});
