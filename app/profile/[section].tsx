import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, ScreenHeader } from '@/components/ui';
import { colors, spacing, typography } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@/types';

function buildContent(user: User | null): Record<string, { title: string; body: string[] }> {
  return {
  'persoonlijke-gegevens': {
    title: 'Persoonlijke gegevens',
    body: [
      `Naam: ${user?.name ?? '—'}`,
      `E-mailadres: ${user?.email || '—'}`,
    ],
  },
  beveiliging: {
    title: 'Beveiliging',
    body: [
      'Online accounts zijn nog niet actief. Je zaken en documenten worden op dit apparaat bewaard; documenten die je laat analyseren worden naar de FixJeZaak-server gestuurd.',
    ],
  },
  helpcentrum: {
    title: 'Helpcentrum',
    body: [
      'Bekijk veelgestelde vragen over bezwaar maken, contracten en juridische ondersteuning.',
      'Kom je er niet uit? Gebruik de AI-assistent of plan een gesprek met een jurist via het Hulp-tabblad.',
    ],
  },
  voorwaarden: {
    title: 'Voorwaarden',
    body: [
      'FixJeZaak biedt begeleiding op basis van beschikbare informatie. We doen geen garanties over de uitkomst van een juridische procedure.',
      'Lees de volledige gebruiksvoorwaarden en het privacybeleid op onze website.',
    ],
  },
  };
}

export default function ProfileSectionScreen() {
  const { section } = useLocalSearchParams<{ section: string }>();
  const user = useAuthStore((state) => state.user);
  const content = buildContent(user)[section ?? ''] ?? { title: 'Overzicht', body: ['Geen informatie beschikbaar.'] };

  return (
    <View style={styles.container}>
      <ScreenHeader title={content.title} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={{ gap: spacing.sm }}>
          {content.body.map((line, index) => (
            <Text key={index} style={styles.line}>
              {line}
            </Text>
          ))}
        </Card>
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
  },
  line: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
