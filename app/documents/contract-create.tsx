import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { z } from 'zod';

import { Card, LoadingState, ProgressSteps, ScreenHeader } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { backendClient } from '@/services/backendClient';
import { useAuthStore } from '@/store/authStore';
import type { ContractTemplate } from '@/types';

const CONTRACT_TEMPLATES: ContractTemplate[] = [
  { id: 'arbeidsovereenkomst', title: 'Arbeidsovereenkomst', description: 'Stel een arbeidscontract op voor een nieuwe werknemer.' },
  { id: 'freelanceovereenkomst', title: 'Freelanceovereenkomst', description: "Leg afspraken met een zzp'er of opdrachtnemer vast." },
  { id: 'nda', title: 'NDA', description: 'Geheimhoudingsverklaring voor gevoelige informatie.' },
  { id: 'leningsovereenkomst', title: 'Leningsovereenkomst', description: 'Leg de voorwaarden van een lening tussen partijen vast.' },
  { id: 'samenwerkingsovereenkomst', title: 'Samenwerkingsovereenkomst', description: 'Maak afspraken over een zakelijke samenwerking.' },
];

const detailsSchema = z.object({
  eigenNaam: z.string().min(1, 'Vul je naam in'),
  tegenpartij: z.string().min(1, 'Vul een naam in'),
  ingangsdatum: z.string().min(1, 'Vul een datum in'),
  omschrijving: z.string().min(10, 'Beschrijf de afspraken iets uitgebreider'),
});

type DetailsForm = z.infer<typeof detailsSchema>;

interface Draft {
  title: string;
  paragraphs: string[];
}

export default function ContractCreateScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [step, setStep] = useState(1);
  const [template, setTemplate] = useState<ContractTemplate | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<DetailsForm>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { eigenNaam: user?.name ?? '', tegenpartij: '', ingangsdatum: '', omschrijving: '' },
  });

  function selectTemplate(t: ContractTemplate) {
    setTemplate(t);
    setStep(2);
  }

  async function onSubmitDetails(data: DetailsForm) {
    if (!template) return;
    setGenerating(true);
    setError(null);
    try {
      const result = await backendClient.draftContract({
        contractType: template.id,
        ownName: data.eigenNaam,
        counterparty: data.tegenpartij,
        startDate: data.ingangsdatum,
        description: data.omschrijving,
      });
      setDraft(result);
      setStep(3);
    } catch {
      setError('Het opstellen van je contract is niet gelukt. Controleer je internetverbinding en probeer het opnieuw.');
    } finally {
      setGenerating(false);
    }
  }

  function shareDraft() {
    if (!draft) return;
    void Share.share({ title: draft.title, message: [draft.title, ...draft.paragraphs].join('\n\n') }).catch(
      () => undefined,
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Contract maken" />
      <View style={styles.progressWrap}>
        <ProgressSteps currentStep={step} totalSteps={3} />
      </View>

      {step === 1 ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionLabel}>Kies een type contract</Text>
          <View style={{ gap: spacing.sm }}>
            {CONTRACT_TEMPLATES.map((t) => (
              <Card key={t.id} onPress={() => selectTemplate(t)}>
                <Text style={styles.templateTitle}>{t.title}</Text>
                <Text style={styles.templateDescription}>{t.description}</Text>
              </Card>
            ))}
          </View>
        </ScrollView>
      ) : null}

      {step === 2 && template && generating ? <LoadingState label="FixJeZaak stelt je contract op…" /> : null}

      {step === 2 && template && !generating ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionLabel}>{template.title}</Text>
          <View style={styles.form}>
            <FormField label="Jouw naam of bedrijfsnaam" name="eigenNaam" control={control} errors={errors} />
            <FormField label="Naam wederpartij" name="tegenpartij" control={control} errors={errors} />
            <FormField
              label="Ingangsdatum"
              name="ingangsdatum"
              control={control}
              errors={errors}
              placeholder="bijv. 1 september 2026"
            />
            <FormField
              label="Afspraken"
              name="omschrijving"
              control={control}
              errors={errors}
              placeholder="Wat spreken jullie af? Denk aan bedragen, looptijd, taken en opzegging."
              multiline
            />
          </View>
          {error ? <Text style={styles.fieldError}>{error}</Text> : null}
          <Button label="Stel contract op" onPress={handleSubmit(onSubmitDetails)} />
        </ScrollView>
      ) : null}

      {step === 3 && draft ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionLabel}>{draft.title}</Text>
          <Text style={styles.notice}>
            Dit is een concept. Vul de onderdelen met [INVULLEN] aan en controleer alles voordat je tekent.
          </Text>
          <Card style={{ gap: spacing.md }}>
            {draft.paragraphs.map((paragraph, index) => (
              <Text key={index} style={styles.paragraph}>
                {paragraph}
              </Text>
            ))}
          </Card>
          <Button label="Delen of kopiëren" onPress={shareDraft} />
          <Button label="Laat een jurist meekijken" variant="secondary" onPress={() => router.push('/help/booking')} />
          <Button label="Terug naar Documenten" variant="secondary" onPress={() => router.replace('/(tabs)/documents')} />
        </ScrollView>
      ) : null}
    </View>
  );
}

function FormField({
  label,
  name,
  control,
  errors,
  placeholder,
  multiline,
}: {
  label: string;
  name: keyof DetailsForm;
  control: ReturnType<typeof useForm<DetailsForm>>['control'];
  errors: ReturnType<typeof useForm<DetailsForm>>['formState']['errors'];
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={[styles.input, multiline && styles.inputMultiline]}
            placeholder={placeholder}
            placeholderTextColor={colors.textTertiary}
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            multiline={multiline}
          />
        )}
      />
      {errors[name] ? <Text style={styles.fieldError}>{errors[name]?.message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  progressWrap: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  sectionLabel: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  templateTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  templateDescription: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },
  form: {
    gap: spacing.md,
  },
  field: {
    gap: spacing.xs,
  },
  fieldLabel: {
    ...typography.smallMedium,
    color: colors.textPrimary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    ...typography.body,
    color: colors.textPrimary,
  },
  inputMultiline: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  fieldError: {
    ...typography.small,
    color: colors.danger,
  },
  notice: {
    ...typography.small,
    color: colors.textSecondary,
  },
  paragraph: {
    ...typography.body,
    color: colors.textPrimary,
  },
});
