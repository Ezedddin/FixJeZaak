import { useLocalSearchParams, useRouter } from 'expo-router';
import { FileText, MessageCircle } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { CaseTimeline } from '@/components/case';
import { BottomSheet, Button, DeadlineBadge, ScreenHeader, StatusBadge } from '@/components/ui';
import { DocumentCard } from '@/components/document/DocumentCard';
import { colors, radius, shadow, spacing, typography } from '@/constants/theme';
import { useCasesStore, selectCaseById } from '@/store/casesStore';
import { caseStatusMeta } from '@/utils/caseStatus';

export default function CaseDashboardScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const cases = useCasesStore((state) => state.cases);
  const markSubmitted = useCasesStore((state) => state.submitCase);
  const legalCase = selectCaseById(cases, id);
  const [docsSheetVisible, setDocsSheetVisible] = useState(false);

  if (!legalCase) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Zaak niet gevonden" />
      </View>
    );
  }

  const statusMeta = caseStatusMeta(legalCase.status);
  const ctaTarget = nextActionTarget(legalCase.id, legalCase.status);

  return (
    <View style={styles.container}>
      <ScreenHeader title={legalCase.title} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.statusCard, shadow.sm]}>
          <StatusBadge label={statusMeta.label} tone={statusMeta.tone} />
          {legalCase.deadline ? (
            <View style={styles.deadlineRow}>
              <Text style={styles.deadlineLabel}>
                {legalCase.status === 'waiting_response' ? 'Reactie verwacht' : 'Deadline'}
              </Text>
              <DeadlineBadge deadline={legalCase.deadline} />
            </View>
          ) : null}
        </View>

        <View style={styles.nextSection}>
          <Text style={styles.sectionTitle}>Volgende stap</Text>
          <Text style={styles.nextActionText}>{legalCase.nextAction}</Text>
          {ctaTarget ? (
            <Button label={ctaTarget.label} onPress={() => router.push(ctaTarget.href)} />
          ) : null}
          {legalCase.status === 'action_required' && legalCase.generatedDocument?.status === 'goedgekeurd' ? (
            <>
              <Button
                label="Deel je brief"
                onPress={() => {
                  const doc = legalCase.generatedDocument!;
                  const header = [`Aan: ${doc.recipient}`, `Betreft: ${doc.subject}`];
                  if (doc.reference) header.push(`Kenmerk: ${doc.reference}`);
                  void Share.share({
                    title: doc.subject,
                    message: [header.join('\n'), ...doc.paragraphs].join('\n\n'),
                  }).catch(() => undefined);
                }}
              />
              <Button
                label="Ik heb het verstuurd"
                variant="secondary"
                onPress={() => markSubmitted(legalCase.id)}
              />
            </>
          ) : null}
        </View>

        <View style={styles.quickActions}>
          <QuickAction
            icon={MessageCircle}
            label="Vraag FixJeZaak"
            onPress={() => router.push({ pathname: '/case/[id]/assistant', params: { id: legalCase.id } })}
          />
          <QuickAction icon={FileText} label="Documenten" onPress={() => setDocsSheetVisible(true)} />
        </View>

        <View style={styles.timelineSection}>
          <Text style={styles.sectionTitle}>Tijdlijn</Text>
          <CaseTimeline events={legalCase.timeline} />
        </View>
      </ScrollView>

      <BottomSheet
        visible={docsSheetVisible}
        onClose={() => setDocsSheetVisible(false)}
        title="Documenten in deze zaak"
      >
        <View style={{ gap: spacing.sm, paddingBottom: spacing.lg }}>
          {legalCase.documents.length === 0 ? (
            <Text style={styles.emptyDocsText}>Nog geen documenten in dit dossier.</Text>
          ) : (
            legalCase.documents.map((doc) => <DocumentCard key={doc.id} document={doc} />)
          )}
        </View>
      </BottomSheet>
    </View>
  );
}

function QuickAction({
  icon: Icon,
  label,
  onPress,
}: {
  icon: typeof MessageCircle;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.quickAction} onPress={onPress}>
      <View style={styles.quickActionIcon}>
        <Icon size={18} color={colors.primary} strokeWidth={2} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </Pressable>
  );
}

function nextActionTarget(
  caseId: string,
  status: string,
): { label: string; href: Parameters<ReturnType<typeof useRouter>['push']>[0] } | null {
  if (status === 'response_received') {
    return { label: 'Bekijk reactie', href: { pathname: '/case/[id]/response', params: { id: caseId } } };
  }
  if (status === 'resolved') {
    return { label: 'Bekijk resultaat', href: { pathname: '/case/[id]/resolved', params: { id: caseId } } };
  }
  return null;
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
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  deadlineLabel: {
    ...typography.small,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  nextSection: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  nextActionText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    ...typography.tiny,
    color: colors.textPrimary,
  },
  timelineSection: {
    gap: spacing.sm,
  },
  emptyDocsText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
