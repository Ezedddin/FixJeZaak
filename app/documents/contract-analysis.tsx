import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Camera, FileUp } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { UploadCard } from '@/components/document/UploadCard';
import { BottomSheet, Button, Card, LoadingState, ScreenHeader } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { backendClient, type BackendContractAnalysis } from '@/services/backendClient';
import { READABLE_DOCUMENT_TYPES } from '@/services/documentService';
import type { RiskLevel } from '@/types';
import { toneColors, type StatusTone } from '@/utils/caseStatus';

const RISK_META: Record<RiskLevel, { label: string; tone: StatusTone }> = {
  hoog: { label: 'Belangrijk risico', tone: 'danger' },
  gemiddeld: { label: 'Aandachtspunt', tone: 'warning' },
  laag: { label: 'Gebruikelijk', tone: 'success' },
};

type Analysis = Extract<BackendContractAnalysis, { readable: true }>;

export default function ContractAnalysisScreen() {
  const router = useRouter();
  const [documentName, setDocumentName] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  async function analyze(name: string, uri: string, mimeType: string) {
    setError(null);
    let base64: string;
    try {
      base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    } catch {
      setError('Het bestand kon niet worden geopend. Probeer het opnieuw.');
      return;
    }
    setAnalyzing(true);
    try {
      const result = await backendClient.analyzeContract({ base64, mimeType, filename: name });
      if (!result.readable) {
        setError(
          'We konden dit niet lezen als contract. Maak een duidelijkere foto van elke pagina, of upload het contract als PDF.',
        );
        return;
      }
      setDocumentName(name);
      setAnalysis(result);
    } catch {
      setError('De analyse is niet gelukt. Controleer je internetverbinding en probeer het opnieuw.');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('Geef FixJeZaak toegang tot je camera in je instellingen, of kies een bestand.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (result.canceled) return;
    const asset = result.assets[0];
    await analyze('Contract-foto.jpg', asset.uri, asset.mimeType ?? 'image/jpeg');
  }

  async function handleFilePicker() {
    const result = await DocumentPicker.getDocumentAsync({ type: READABLE_DOCUMENT_TYPES, copyToCacheDirectory: true });
    if (result.canceled) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? '';
    if (!READABLE_DOCUMENT_TYPES.includes(mimeType)) {
      setError('Dit bestandstype kunnen we niet lezen. Kies een PDF of een foto (JPG of PNG).');
      return;
    }
    await analyze(asset.name, asset.uri, mimeType);
  }

  if (analyzing) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Contract controleren" />
        <LoadingState label="We lezen je contract…" />
      </View>
    );
  }

  if (!analysis) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Contract controleren" subtitle="Upload het contract dat je wilt laten controleren." />
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.cardsRow}>
            <UploadCard icon={Camera} label="Maak een foto" onPress={handleCamera} />
            <UploadCard icon={FileUp} label="Kies bestand" onPress={handleFilePicker} />
          </View>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          <Text style={styles.disclaimer}>
            De analyse is een hulpmiddel en geen juridisch advies. Laat bij twijfel een jurist meekijken.
          </Text>
        </ScrollView>
      </View>
    );
  }

  const suggestions = analysis.clauses.filter((clause) => clause.suggestion);

  return (
    <View style={styles.container}>
      <ScreenHeader title={documentName ?? 'Contract'} subtitle="Contractanalyse" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryText}>{analysis.summary}</Text>
        </Card>

        <View style={styles.clauseList}>
          {analysis.clauses.map((clause, index) => {
            const meta = RISK_META[clause.risk];
            const palette = toneColors[meta.tone];
            return (
              <Card key={`${index}-${clause.title}`} style={styles.clauseCard}>
                <View style={[styles.riskPill, { backgroundColor: palette.bg, borderColor: palette.border }]}>
                  <View style={[styles.riskDot, { backgroundColor: palette.fg }]} />
                  <Text style={[styles.riskLabel, { color: palette.fg }]}>{meta.label}</Text>
                </View>
                <Text style={styles.clauseTitle}>{clause.title}</Text>
                <Text style={styles.clauseExplanation}>{clause.explanation}</Text>
              </Card>
            );
          })}
        </View>

        <View style={styles.actions}>
          {suggestions.length > 0 ? (
            <Button
              label="Bekijk voorgestelde wijzigingen"
              variant="secondary"
              onPress={() => setSheetVisible(true)}
            />
          ) : null}
          <Button
            label="Ander contract controleren"
            variant="secondary"
            onPress={() => {
              setAnalysis(null);
              setDocumentName(null);
            }}
          />
          <Button label="Laat jurist controleren" onPress={() => router.push('/help/booking')} />
        </View>
        <Text style={styles.disclaimer}>
          De analyse is een hulpmiddel en geen juridisch advies. Laat bij twijfel een jurist meekijken.
        </Text>
      </ScrollView>

      <BottomSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        title="Voorgestelde wijzigingen"
      >
        <View style={{ gap: spacing.md, paddingBottom: spacing.lg }}>
          {suggestions.map((clause, index) => (
            <View key={`${index}-${clause.title}`}>
              <Text style={styles.suggestionTitle}>{clause.title}</Text>
              <Text style={styles.suggestionText}>{clause.suggestion}</Text>
            </View>
          ))}
        </View>
      </BottomSheet>
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
    gap: spacing.lg,
  },
  summaryCard: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 0,
  },
  summaryText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  clauseList: {
    gap: spacing.sm,
  },
  clauseCard: {
    gap: spacing.xs,
  },
  riskPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  riskDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  riskLabel: {
    ...typography.tiny,
  },
  clauseTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  clauseExplanation: {
    ...typography.body,
    color: colors.textSecondary,
  },
  actions: {
    gap: spacing.sm,
  },
  suggestionTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  suggestionText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  errorBox: {
    backgroundColor: colors.warningBg,
    borderColor: colors.warningBorder,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  errorText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  disclaimer: {
    ...typography.small,
    color: colors.textTertiary,
  },
});
