import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, ErrorState, LoadingState, ScreenHeader } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { backendClient, type BackendProfessional, type BookingRequest } from '@/services/backendClient';
import { useAuthStore } from '@/store/authStore';

const BOOKING_OPTIONS: Array<{ id: BookingRequest['option']; title: string; description: string }> = [
  { id: '15min', title: '15 minuten', description: 'Snel advies over een specifieke vraag.' },
  { id: '30min', title: '30 minuten', description: 'Uitgebreider gesprek over je situatie en opties.' },
  { id: 'volledige_review', title: 'Volledige zaakreview', description: 'Een jurist beoordeelt je volledige dossier.' },
];

export default function BookingScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [professionals, setProfessionals] = useState<BackendProfessional[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [option, setOption] = useState<BookingRequest['option']>('30min');
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState('');
  const [question, setQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedWith, setConfirmedWith] = useState<string | null>(null);

  async function loadProfessionals() {
    setLoadError(false);
    try {
      const list = await backendClient.listProfessionals();
      setProfessionals(list);
      setProfessionalId((current) => current ?? list[0]?.id ?? null);
    } catch {
      setLoadError(true);
    }
  }

  useEffect(() => {
    void loadProfessionals();
  }, []);

  async function handleSubmit() {
    if (submitting || !professionalId) return;
    if (!name.trim() || !email.trim() || !question.trim()) {
      setError('Vul je naam, e-mailadres en je vraag in.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await backendClient.createBooking({
        userId: user?.id ?? 'onbekend',
        professionalId,
        option,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        question: question.trim(),
      });
      setConfirmedWith(professionals?.find((p) => p.id === professionalId)?.name ?? 'de jurist');
    } catch {
      setError('Je aanvraag kon niet worden verstuurd. Controleer je e-mailadres en internetverbinding en probeer het opnieuw.');
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmedWith) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Aanvraag verstuurd" showBack={false} />
        <View style={styles.confirmedBody}>
          <Text style={styles.confirmedText}>
            Je aanvraag is verstuurd naar {confirmedWith}. Je krijgt bericht via {email.trim()} om een
            moment af te spreken.
          </Text>
          <Button label="Terug naar Hulp" onPress={() => router.replace('/(tabs)/help')} />
        </View>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Plan een jurist in" />
        <ErrorState
          title="Juristen konden niet worden geladen"
          description="Controleer je internetverbinding en probeer het opnieuw."
          retryLabel="Opnieuw proberen"
          onRetry={loadProfessionals}
        />
      </View>
    );
  }

  if (!professionals) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Plan een jurist in" />
        <LoadingState />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title="Plan een jurist in" subtitle="Een jurist neemt contact met je op." />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>Kies een jurist</Text>
        <View style={{ gap: spacing.sm }}>
          {professionals.map((pro) => (
            <Card
              key={pro.id}
              onPress={() => setProfessionalId(pro.id)}
              style={[styles.proCard, professionalId === pro.id && styles.optionActive]}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{pro.initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.proName}>{pro.name}</Text>
                <Text style={styles.proRole}>{pro.role}</Text>
              </View>
            </Card>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Wat heb je nodig?</Text>
        <View style={{ gap: spacing.sm }}>
          {BOOKING_OPTIONS.map((item) => (
            <Card
              key={item.id}
              onPress={() => setOption(item.id)}
              style={[styles.option, option === item.id && styles.optionActive]}
            >
              <Text style={styles.optionTitle}>{item.title}</Text>
              <Text style={styles.optionDescription}>{item.description}</Text>
            </Card>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Je gegevens</Text>
        <View style={{ gap: spacing.sm }}>
          <Field label="Naam" value={name} onChangeText={setName} />
          <Field label="E-mailadres" value={email} onChangeText={setEmail} keyboardType="email-address" />
          <Field label="Telefoonnummer (optioneel)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Field label="Je vraag" value={question} onChangeText={setQuestion} multiline />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
      <View style={styles.footer}>
        <Button label="Verstuur aanvraag" onPress={handleSubmit} loading={submitting} />
      </View>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  multiline,
  ...inputProps
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  keyboardType?: 'email-address' | 'phone-pad';
}) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        autoCapitalize={inputProps.keyboardType === 'email-address' ? 'none' : 'sentences'}
        multiline={multiline}
        placeholderTextColor={colors.textTertiary}
        {...inputProps}
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
    gap: spacing.xl,
  },
  option: {
    borderColor: colors.border,
  },
  optionActive: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  optionTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  optionDescription: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionLabel: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  proCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.smallMedium,
    color: colors.onPrimary,
  },
  proName: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  proRole: {
    ...typography.small,
    color: colors.textSecondary,
  },
  fieldLabel: {
    ...typography.small,
    color: colors.textSecondary,
  },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    backgroundColor: colors.surface,
  },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  error: {
    ...typography.small,
    color: colors.danger,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  confirmedBody: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  confirmedText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
