import { useRouter } from 'expo-router';
import { ClipboardList } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CaseCard } from '@/components/case/CaseCard';
import { EmptyState } from '@/components/ui';
import { colors, spacing, typography } from '@/constants/theme';
import { useCasesStore } from '@/store/casesStore';
import type { LegalCase } from '@/types';

type TabKey = 'actie' | 'lopend' | 'afgerond';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'actie', label: 'Actie nodig' },
  { key: 'lopend', label: 'Lopend' },
  { key: 'afgerond', label: 'Afgerond' },
];

function bucketFor(legalCase: LegalCase): TabKey {
  if (legalCase.status === 'resolved') return 'afgerond';
  if (legalCase.status === 'action_required' || legalCase.status === 'response_received') {
    return 'actie';
  }
  return 'lopend';
}

export default function CasesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cases = useCasesStore((state) => state.cases);
  const [tab, setTab] = useState<TabKey>('actie');

  const grouped = useMemo(() => {
    const buckets: Record<TabKey, LegalCase[]> = { actie: [], lopend: [], afgerond: [] };
    for (const legalCase of cases) {
      buckets[bucketFor(legalCase)].push(legalCase);
    }
    for (const key of Object.keys(buckets) as TabKey[]) {
      buckets[key].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }
    return buckets;
  }, [cases]);

  const activeCases = grouped[tab];

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <Text style={styles.title}>Mijn Zaken</Text>

      <View style={styles.tabRow}>
        {TABS.map((t) => {
          const count = grouped[t.key].length;
          const active = t.key === tab;
          return (
            <Pressable key={t.key} style={styles.tabButton} onPress={() => setTab(t.key)}>
              <View style={styles.tabLabelRow}>
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{t.label}</Text>
                {count > 0 ? (
                  <View style={[styles.tabBadge, active && styles.tabBadgeActive]}>
                    <Text style={styles.tabBadgeText}>{count}</Text>
                  </View>
                ) : null}
              </View>
              <View style={[styles.tabUnderline, active && styles.tabUnderlineActive]} />
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {activeCases.length === 0 ? (
          <EmptyState icon={ClipboardList} title="Geen zaken in deze categorie" />
        ) : (
          activeCases.map((legalCase) => (
            <CaseCard
              key={legalCase.id}
              legalCase={legalCase}
              onPress={() => router.push({ pathname: '/case/[id]', params: { id: legalCase.id } })}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  tabRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.lg,
  },
  tabButton: {
    alignItems: 'flex-start',
  },
  tabLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: spacing.sm,
  },
  tabLabel: {
    ...typography.bodyMedium,
    color: colors.textTertiary,
  },
  tabLabelActive: {
    color: colors.textPrimary,
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.neutral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeActive: {
    backgroundColor: colors.danger,
  },
  tabBadgeText: {
    ...typography.tiny,
    fontSize: 10,
    color: colors.onPrimary,
  },
  tabUnderline: {
    height: 2,
    backgroundColor: 'transparent',
  },
  tabUnderlineActive: {
    backgroundColor: colors.textPrimary,
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.xxxl,
  },
});
