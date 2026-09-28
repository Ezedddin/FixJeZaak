import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, LoadingState, ScreenHeader } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { backendClient } from '@/services/backendClient';

const ROLES = ['werkgever', 'verhuurder', 'gemeente', 'leverancier'];

type Section = { title: string; items: string[] };

export default function ConversationPrepScreen() {
  const router = useRouter();
  const [role, setRole] = useState('werkgever');
  const [situation, setSituation] = useState('');
  const [sections, setSections] = useState<Section[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePrepare() {
    if (situation.trim().length < 10) {
      setError('Beschrijf je situatie in een paar zinnen.');
      return;
    }
    if (role.trim().length < 2) {
      setError('Vul in met wie je het gesprek hebt.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await backendClient.conversationPrep({ situation: situation.trim(), counterpartyRole: role.trim() });
      setSections(result.sections);
    } catch {
      setError('De voorbereiding is niet gelukt. Controleer je internetverbinding en probeer het opnieuw.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Bereid je gesprek voor" />
        <LoadingState label="We zetten je voorbereiding klaar…" />
      </View>
    );
  }

  if (!sections) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Bereid je gesprek voor" subtitle="Vertel waar het gesprek over gaat." />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Met wie heb je het gesprek?</Text>
          <View style={styles.chips}>
            {ROLES.map((r) => (
              <Pressable key={r} onPress={() => setRole(r)} style={[styles.chip, role === r && styles.chipActive]}>
                <Text style={[styles.chipText, role === r && styles.chipTextActive]}>{r}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            style={styles.input}
            value={role}
            onChangeText={setRole}
            placeholder="Of typ zelf, bijv. 'huisarts'"
            placeholderTextColor={colors.textTertiary}
          />
          <Text style={styles.label}>Wat is er aan de hand?</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={situation}
            onChangeText={setSituation}
            multiline
            placeholder="Bijv. mijn werkgever wil mijn contract niet verlengen en heeft een gesprek ingepland."
            placeholderTextColor={colors.textTertiary}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Bereid mijn gesprek voor" onPress={handlePrepare} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Bereid je gesprek voor" subtitle={`Gesprek met je ${role.trim()}`} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {sections.map((section) => (
          <Card key={section.title} style={styles.card}>
            <Text style={styles.cardTitle}>{section.title}</Text>
            <View style={styles.list}>
              {section.items.map((item) => (
                <View key={item} style={styles.listItem}>
                  <View style={styles.bullet} />
                  <Text style={styles.listText}>{item}</Text>
                </View>
              ))}
            </View>
          </Card>
        ))}
        <Button
          label="Oefen dit gesprek met AI"
          onPress={() =>
            router.push({ pathname: '/help/roleplay', params: { situation: situation.trim(), role: role.trim() } })
          }
        />
        <Button label="Andere situatie" variant="secondary" onPress={() => setSections(null)} />
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
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  list: {
    gap: spacing.xs,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.textTertiary,
    marginTop: 8,
  },
  listText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  label: {
    ...typography.smallMedium,
    color: colors.textPrimary,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  chipText: {
    ...typography.small,
    color: colors.textPrimary,
  },
  chipTextActive: {
    color: colors.onPrimary,
  },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: colors.surface,
  },
  inputMultiline: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  error: {
    ...typography.small,
    color: colors.danger,
  },
});
