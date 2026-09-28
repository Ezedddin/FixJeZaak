import { useRouter } from 'expo-router';
import { FileText } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, ScreenHeader } from '@/components/ui';
import { colors, radius, shadow, spacing, typography } from '@/constants/theme';
import { useCasesStore } from '@/store/casesStore';
import { useIntakeStore } from '@/store/intakeStore';

type Tab = 'document' | 'facts' | 'attachments';

export default function DocumentPreviewScreen() {
  const router = useRouter();
  const caseId = useIntakeStore((state) => state.caseId);
  const generatedDocument = useIntakeStore((state) => state.generatedDocument);
  const setGeneratedDocument = useIntakeStore((state) => state.setGeneratedDocument);
  const storeSetGeneratedDocument = useCasesStore((state) => state.setGeneratedDocument);

  const [tab, setTab] = useState<Tab>('document');
  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState(generatedDocument?.paragraphs.join('\n\n') ?? '');

  if (!generatedDocument || !caseId) return null;

  function saveEdits() {
    const paragraphs = draftText.split('\n\n').filter((p) => p.trim().length > 0);
    const updated = { ...generatedDocument!, paragraphs };
    setGeneratedDocument(updated);
    storeSetGeneratedDocument(caseId!, updated);
    setEditing(false);
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Controleer je bezwaar" />

      <View style={styles.tabRow}>
        {(['document', 'facts', 'attachments'] as Tab[]).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>
              {t === 'document' ? 'Document' : t === 'facts' ? 'Gebruikte feiten' : 'Bijlagen'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {tab === 'document' ? (
          <View style={[styles.letter, shadow.md]}>
            <Text style={styles.letterMeta}>Aan: {generatedDocument.recipient}</Text>
            <Text style={styles.letterMeta}>Betreft: {generatedDocument.subject}</Text>
            {generatedDocument.reference ? (
              <Text style={styles.letterMeta}>Kenmerk: {generatedDocument.reference}</Text>
            ) : null}
            <View style={styles.letterDivider} />
            {editing ? (
              <TextInput
                style={styles.letterInput}
                value={draftText}
                onChangeText={setDraftText}
                multiline
              />
            ) : (
              generatedDocument.paragraphs.map((paragraph, index) => (
                <Text key={index} style={styles.letterParagraph}>
                  {paragraph}
                </Text>
              ))
            )}
          </View>
        ) : null}

        {tab === 'facts' ? (
          <Card style={{ gap: spacing.sm }}>
            {generatedDocument.usedFacts.map((fact, index) => (
              <View key={index} style={styles.factRow}>
                <View style={styles.factDot} />
                <Text style={styles.factText}>{fact}</Text>
              </View>
            ))}
          </Card>
        ) : null}

        {tab === 'attachments' ? (
          <Card style={{ gap: spacing.sm }}>
            {generatedDocument.attachments.map((attachment, index) => (
              <View key={index} style={styles.attachmentRow}>
                <FileText size={16} color={colors.accent} strokeWidth={2} />
                <Text style={styles.attachmentText}>{attachment}</Text>
              </View>
            ))}
          </Card>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerRow}>
          <View style={{ flex: 1 }}>
            <Button
              label={editing ? 'Opslaan' : 'Aanpassen'}
              onPress={editing ? saveEdits : () => setEditing(true)}
              variant="secondary"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label="Vraag FixJeZaak"
              variant="secondary"
              onPress={() => router.push({ pathname: '/case/[id]/assistant', params: { id: caseId } })}
            />
          </View>
        </View>
        <Button label="Goedkeuren & doorgaan" onPress={() => router.push('/case/new/approval')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabLabel: {
    ...typography.smallMedium,
    color: colors.textTertiary,
  },
  tabLabelActive: {
    color: colors.textPrimary,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  letter: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  letterMeta: {
    ...typography.small,
    color: colors.textSecondary,
  },
  letterDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  letterParagraph: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  letterInput: {
    ...typography.body,
    color: colors.textPrimary,
    minHeight: 240,
    textAlignVertical: 'top',
  },
  factRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  factDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginTop: 8,
  },
  factText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  attachmentText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  footerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
