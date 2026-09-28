import { useRouter } from 'expo-router';
import { Download, FolderOpen, ShieldCheck, Sparkles, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Card, ConfirmationModal, ScreenHeader } from '@/components/ui';
import { colors, spacing, typography } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';

export default function PrivacyScreen() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const [aiProcessing, setAiProcessing] = useState(true);
  const [marketing, setMarketing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Privacy & gegevens" subtitle="Jij bepaalt wat er met je gegevens gebeurt." />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.card}>
          <View style={styles.rowHeader}>
            <ShieldCheck size={18} color={colors.primary} strokeWidth={2} />
            <Text style={styles.cardTitle}>Mijn gegevens</Text>
          </View>
          <Text style={styles.cardText}>
            We bewaren alleen de gegevens die nodig zijn om je zaken te behandelen: je contactgegevens,
            geüploade documenten en de voortgang van je dossiers.
          </Text>
        </Card>

        <Card onPress={() => {}} style={styles.actionRow}>
          <Download size={18} color={colors.textSecondary} strokeWidth={2} />
          <Text style={styles.actionLabel}>Mijn gegevens downloaden</Text>
        </Card>

        <Card style={styles.card}>
          <View style={styles.rowHeader}>
            <Sparkles size={18} color={colors.primary} strokeWidth={2} />
            <Text style={styles.cardTitle}>AI & gegevensverwerking</Text>
          </View>
          <Text style={styles.cardText}>
            Onze AI gebruikt de inhoud van je dossier om analyses en documenten op te stellen. Dit
            gebeurt alleen binnen jouw account en wordt niet gebruikt om andere gebruikers te helpen.
          </Text>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Toestemmingen</Text>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>AI-verwerking van mijn dossier</Text>
              <Text style={styles.toggleHint}>Nodig om analyses en documenten te genereren</Text>
            </View>
            <Switch
              value={aiProcessing}
              onValueChange={setAiProcessing}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          </View>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Marketingcommunicatie</Text>
              <Text style={styles.toggleHint}>Tips en updates over FixJeZaak</Text>
            </View>
            <Switch
              value={marketing}
              onValueChange={setMarketing}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          </View>
        </Card>

        <Card onPress={() => router.push('/(tabs)/cases')} style={styles.actionRow}>
          <FolderOpen size={18} color={colors.textSecondary} strokeWidth={2} />
          <Text style={styles.actionLabel}>Dossiers beheren</Text>
        </Card>

        <Card onPress={() => setConfirmDelete(true)} style={[styles.actionRow, styles.dangerRow]}>
          <Trash2 size={18} color={colors.danger} strokeWidth={2} />
          <Text style={[styles.actionLabel, styles.dangerLabel]}>Account verwijderen</Text>
        </Card>
      </ScrollView>

      <ConfirmationModal
        visible={confirmDelete}
        title="Account verwijderen"
        description="Dit verwijdert permanent al je gegevens en dossiers bij FixJeZaak. Deze actie kan niet ongedaan worden gemaakt."
        confirmLabel="Definitief verwijderen"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          logout();
          router.replace('/onboarding');
        }}
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
    gap: spacing.sm,
  },
  card: {
    gap: spacing.sm,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  cardText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionLabel: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  dangerRow: {
    borderColor: colors.dangerBorder,
  },
  dangerLabel: {
    color: colors.danger,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  toggleLabel: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  toggleHint: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 1,
  },
});
