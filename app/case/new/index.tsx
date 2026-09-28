import { useLocalSearchParams, useRouter } from 'expo-router';
import { Send } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ChatBubble } from '@/components/chat';
import { Button, LoadingState, ScreenHeader } from '@/components/ui';
import { CATEGORY_META } from '@/constants/categories';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { aiService } from '@/services/aiService';
import { caseService } from '@/services/caseService';
import { useCasesStore } from '@/store/casesStore';
import { useIntakeStore } from '@/store/intakeStore';
import type { CaseCategory } from '@/types';
import { generateId } from '@/utils/id';

export default function NewCaseIntakeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ draft?: string; category?: string }>();
  const addCase = useCasesStore((state) => state.addCase);
  const patchCase = useCasesStore((state) => state.patchCase);
  const intake = useIntakeStore();
  const scrollRef = useRef<ScrollView>(null);

  const [initializing, setInitializing] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [finished, setFinished] = useState(false);
  const [freeText, setFreeText] = useState('');
  const hasInitialized = useRef(false);

  const presetCategory = (params.category as CaseCategory | undefined) ?? null;
  const draft = typeof params.draft === 'string' ? params.draft : '';

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    intake.reset();

    if (draft.trim().length > 0) {
      void beginCase(draft.trim());
    } else if (presetCategory) {
      intake.addChatMessage({
        id: generateId('msg'),
        sender: 'assistant',
        text: `Vertel kort wat er speelt rondom ${CATEGORY_META[presetCategory].label.toLowerCase()}.`,
        createdAt: new Date().toISOString(),
      });
      setInitializing(false);
    } else {
      intake.addChatMessage({
        id: generateId('msg'),
        sender: 'assistant',
        text: 'Vertel wat er is gebeurd. Hoe meer details, hoe beter we je kunnen helpen.',
        createdAt: new Date().toISOString(),
      });
      setInitializing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function beginCase(description: string) {
    setInitializing(true);
    const interpretation = presetCategory
      ? { category: presetCategory, title: CATEGORY_META[presetCategory].label }
      : await aiService.interpretProblem(description);

    const newCase = caseService.createCase({
      category: interpretation.category,
      title: interpretation.title,
      description,
    });
    addCase(newCase);
    void caseService.linkBackendCase(newCase).then((backendCaseId) => {
      if (backendCaseId) patchCase(newCase.id, { backendCaseId });
    });
    intake.startIntake({
      category: interpretation.category,
      title: interpretation.title,
      description,
    });
    intake.setCaseId(newCase.id);

    intake.addChatMessage({
      id: generateId('msg'),
      sender: 'user',
      text: description,
      createdAt: new Date().toISOString(),
    });
    intake.addChatMessage({
      id: generateId('msg'),
      sender: 'assistant',
      text: `Bedankt. Ik heb dit genoteerd als "${interpretation.title}". Nog een paar korte vragen.`,
      createdAt: new Date().toISOString(),
    });

    const nextQuestion = await aiService.getNextIntakeQuestion(interpretation.category, []);
    if (nextQuestion) {
      intake.addChatMessage(nextQuestion);
    } else {
      wrapUp(interpretation.category, newCase.id);
    }
    setInitializing(false);
  }

  function handleFreeTextSend() {
    const text = freeText.trim();
    if (!text) return;
    setFreeText('');
    void beginCase(text);
  }

  async function handleOption(value: string, label: string) {
    if (processing || !intake.category) return;
    setProcessing(true);
    intake.addChatMessage({
      id: generateId('msg'),
      sender: 'user',
      text: label,
      createdAt: new Date().toISOString(),
    });

    const stepId = aiService.intakeStepId(intake.category, intake.answeredStepIds.length);
    if (stepId) intake.markStepAnswered(stepId);
    const updatedAnswered = stepId ? [...intake.answeredStepIds, stepId] : intake.answeredStepIds;

    const nextQuestion = await aiService.getNextIntakeQuestion(intake.category, updatedAnswered);
    if (nextQuestion) {
      intake.addChatMessage(nextQuestion);
    } else if (intake.caseId) {
      wrapUp(intake.category, intake.caseId);
    }
    setProcessing(false);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }

  function wrapUp(category: CaseCategory, caseId: string) {
    const isBoete = category === 'boete';
    intake.addChatMessage({
      id: generateId('msg'),
      sender: 'assistant',
      text: isBoete
        ? 'Bedankt! Ik ga nu je documenten bekijken zodat we je zaak verder kunnen onderbouwen.'
        : 'Bedankt voor de informatie. We gaan hier voor je mee aan de slag.',
      createdAt: new Date().toISOString(),
    });
    if (!isBoete) {
      patchCase(caseId, {
        status: 'action_required',
        nextAction: 'We nemen dit binnenkort met je door',
      });
    }
    setFinished(true);
  }

  function handleContinue() {
    if (!intake.category || !intake.caseId) return;
    if (intake.category === 'boete') {
      router.push('/case/new/upload');
    } else {
      router.replace({ pathname: '/case/[id]', params: { id: intake.caseId } });
    }
  }

  const showFreeTextInput = !intake.caseId && !initializing;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <ScreenHeader title="Vertel wat er is gebeurd" />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.messages}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
      >
        {intake.chatMessages.map((message, index) => (
          <ChatBubble
            key={message.id}
            message={message}
            onSelectOption={handleOption}
            disabled={processing || index !== intake.chatMessages.length - 1}
          />
        ))}
        {initializing ? <LoadingState label="Even denken…" fill={false} /> : null}
      </ScrollView>

      {finished ? (
        <View style={styles.footer}>
          <Button
            label={intake.category === 'boete' ? 'Ga verder met documenten' : 'Ga naar mijn zaak'}
            onPress={handleContinue}
          />
        </View>
      ) : showFreeTextInput ? (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Typ hier je situatie…"
            placeholderTextColor={colors.textTertiary}
            value={freeText}
            onChangeText={setFreeText}
            multiline
          />
          <Pressable style={styles.sendButton} onPress={handleFreeTextSend} hitSlop={8}>
            <Send size={16} color={colors.onPrimary} strokeWidth={2.25} />
          </Pressable>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  messages: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    flexGrow: 1,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.textPrimary,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
