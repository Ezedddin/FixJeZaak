import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

import { Button } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';

const loginSchema = z.object({
  email: z.string().min(1, 'E-mailadres is verplicht').email('Vul een geldig e-mailadres in'),
  password: z.string().min(6, 'Wachtwoord moet minimaal 6 tekens zijn'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const login = useAuthStore((state) => state.login);
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  function onSubmit({ email }: LoginForm) {
    setSubmitting(true);
    login(email.trim().toLowerCase());
    setSubmitting(false);
    router.replace('/(tabs)');
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ paddingTop: insets.top + spacing.xxl, paddingHorizontal: spacing.xl, flex: 1 }}>
        <Text style={styles.title}>Welkom terug</Text>
        <Text style={styles.subtitle}>Log in om verder te gaan met je zaken.</Text>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>E-mailadres</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={styles.input}
                  placeholder="naam@voorbeeld.nl"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.email ? <Text style={styles.error}>{errors.email.message}</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Wachtwoord</Text>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textTertiary}
                  secureTextEntry
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.password ? <Text style={styles.error}>{errors.password.message}</Text> : null}
          </View>
        </View>

        <View style={styles.footer}>
          <Button label="Inloggen" onPress={handleSubmit(onSubmit)} loading={submitting} />
          <Text style={styles.hint}>Online accounts zijn nog niet actief: je gegevens blijven op dit apparaat.</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  form: {
    marginTop: spacing.xxl,
    gap: spacing.lg,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
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
  error: {
    ...typography.small,
    color: colors.danger,
  },
  footer: {
    marginTop: spacing.xxl,
    gap: spacing.sm,
  },
  hint: {
    ...typography.small,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});
