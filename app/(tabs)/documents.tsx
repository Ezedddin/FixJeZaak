import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import {
  Eye,
  FilePlus,
  FileSignature,
  FileText,
  Plus,
  Search,
  SquarePen,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DocumentCard } from '@/components/document/DocumentCard';
import { Card, EmptyState } from '@/components/ui';
import { DOCUMENT_CATEGORY_META, DOCUMENT_CATEGORY_ORDER } from '@/constants/categories';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useCasesStore } from '@/store/casesStore';
import { useDocumentsStore } from '@/store/documentsStore';
import type { DocumentVaultCategory, LegalDocument } from '@/types';
import { generateId } from '@/utils/id';

export default function DocumentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const vaultDocuments = useDocumentsStore((state) => state.vaultDocuments);
  const addVaultDocument = useDocumentsStore((state) => state.addVaultDocument);
  const cases = useCasesStore((state) => state.cases);
  const [selectedCategory, setSelectedCategory] = useState<DocumentVaultCategory | null>(null);
  const [search, setSearch] = useState('');

  const allDocuments = useMemo<LegalDocument[]>(() => {
    const caseDocuments = cases.flatMap((c) => c.documents);
    return [...vaultDocuments, ...caseDocuments].sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
    );
  }, [vaultDocuments, cases]);

  const countByCategory = useMemo(() => {
    const counts: Partial<Record<DocumentVaultCategory, number>> = {};
    for (const doc of allDocuments) {
      counts[doc.category] = (counts[doc.category] ?? 0) + 1;
    }
    return counts;
  }, [allDocuments]);

  const visibleDocuments = useMemo(() => {
    let docs = allDocuments;
    if (selectedCategory) docs = docs.filter((doc) => doc.category === selectedCategory);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      docs = docs.filter((doc) => doc.name.toLowerCase().includes(q));
    }
    return selectedCategory || search.trim() ? docs : docs.slice(0, 6);
  }, [allDocuments, selectedCategory, search]);

  async function handleAddDocument() {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (result.canceled) return;
    const asset = result.assets[0];
    addVaultDocument({
      id: generateId('doc'),
      name: asset.name,
      category: 'mijn_zaken',
      source: 'upload',
      status: 'klaar',
      mimeType: asset.mimeType ?? 'application/octet-stream',
      fileSizeLabel: asset.size ? `${Math.round(asset.size / 1024)} KB` : '—',
      uploadedAt: new Date().toISOString(),
    });
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + spacing.sm, paddingBottom: spacing.xxxl }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <Text style={styles.title}>Documenten</Text>
        <Pressable style={styles.addButton} onPress={handleAddDocument} hitSlop={8}>
          <Plus size={20} color={colors.onPrimary} strokeWidth={2.5} />
        </Pressable>
      </View>

      <View style={styles.searchBar}>
        <Search size={16} color={colors.textTertiary} strokeWidth={2} />
        <TextInput
          style={styles.searchInput}
          placeholder="Zoek document…"
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.actionsGrid}>
        <ActionTile icon={FilePlus} label="Document toevoegen" onPress={handleAddDocument} />
        <ActionTile
          icon={Eye}
          label="Contract controleren"
          onPress={() => router.push('/documents/contract-analysis')}
        />
        <ActionTile
          icon={FileSignature}
          label="Contract maken"
          onPress={() => router.push('/documents/contract-create')}
        />
        <ActionTile
          icon={SquarePen}
          label="Juridische brief maken"
          onPress={() => router.push('/case/new')}
        />
      </View>


      <Text style={styles.sectionTitle}>Mappen</Text>
      <View style={styles.folderGrid}>
        {DOCUMENT_CATEGORY_ORDER.map((id) => {
          const meta = DOCUMENT_CATEGORY_META[id];
          const active = selectedCategory === id;
          return (
            <Pressable
              key={id}
              style={[styles.folderTile, active && styles.folderTileActive]}
              onPress={() => setSelectedCategory(active ? null : id)}
            >
              <View style={[styles.folderIconWrap, { backgroundColor: meta.backgroundColor }]}>
                <Text style={styles.folderEmoji}>{meta.emoji}</Text>
              </View>
              <Text style={styles.folderLabel}>{meta.label}</Text>
              <Text style={styles.folderCount}>{countByCategory[id] ?? 0} bestanden</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>
        {selectedCategory
          ? DOCUMENT_CATEGORY_META[selectedCategory].label
          : search.trim()
            ? 'Zoekresultaten'
            : 'Recente documenten'}
      </Text>
      {visibleDocuments.length === 0 ? (
        <EmptyState icon={FileText} title="Geen documenten gevonden" />
      ) : (
        <View style={styles.documentList}>
          {visibleDocuments.map((doc) => (
            <DocumentCard key={doc.id} document={doc} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function ActionTile({ icon: Icon, label, onPress }: { icon: LucideIcon; label: string; onPress: () => void }) {
  return (
    <Card onPress={onPress} style={styles.actionTile} padding={spacing.md}>
      <View style={styles.actionIconWrap}>
        <Icon size={17} color={colors.primary} strokeWidth={2} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  addButton: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    marginBottom: spacing.lg,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  actionTile: {
    width: '47%',
    gap: spacing.sm,
  },
  actionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    ...typography.smallMedium,
    color: colors.textPrimary,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  folderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  folderTile: {
    width: '30.5%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: 4,
  },
  folderTileActive: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  folderIconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  folderEmoji: {
    fontSize: 16,
  },
  folderLabel: {
    ...typography.smallMedium,
    color: colors.textPrimary,
  },
  folderCount: {
    ...typography.tiny,
    color: colors.textTertiary,
  },
  documentList: {
    gap: spacing.sm,
  },
});
