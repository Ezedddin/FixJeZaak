import { useLocalSearchParams } from 'expo-router';
import { Send } from 'lucide-react-native';
import { useRef, useState } from 'react';
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
import { ScreenHeader } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { defaultSuggestedQuestions } from '@/data/suggestedQuestions';
import { aiService } from '@/services/aiService';
import { caseService } from '@/services/caseService';
import { selectCaseById, useCasesStore } from '@/store/casesStore';
import type { ChatMessage } from '@/types';
import { generateId } from '@/utils/id';

export default function CaseAssistantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cases = useCasesStore((state) => state.cases);
  const legalCase = selectCaseById(cases, id);
  const patchCase = useCasesStore((state) => state.patchCase);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  async function ask(question: string) {
    if (!question.trim() || thinking) return;
    setInput('');
    setMessages((prev) => [
      ...prev,
      { id: generateId('msg'), sender: 'user', text: question, createdAt: new Date().toISOString() },
    ]);
    setThinking(true);

    // Cases may not have a linked backend case yet (created
    // lazily here rather than blocking case creation on backend reachability).
    let backendCaseId = legalCase?.backendCaseId;
    if (!backendCaseId && legalCase) {
      backendCaseId = await caseService.linkBackendCase(legalCase);
      if (backendCaseId) patchCase(legalCase.id, { backendCaseId });
    }

    const answer = await aiService.askCaseAssistant(question, backendCaseId);
    setMessages((prev) => [
      ...prev,
      { id: generateId('msg'), sender: 'assistant', text: answer, createdAt: new Date().toISOString() },
    ]);
    setThinking(false);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <ScreenHeader title="Vraag FixJeZaak" subtitle={legalCase ? `Zaak: ${legalCase.title}` : undefined} />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.messages}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 ? (
          <View style={styles.suggestions}>
            <Text style={styles.suggestionsLabel}>Veelgestelde vragen over jouw zaak</Text>
            {defaultSuggestedQuestions.slice(0, 3).map((q) => (
              <Pressable key={q.id} style={styles.suggestionChip} onPress={() => ask(q.question)}>
                <Text style={styles.suggestionText}>{q.question}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {messages.map((message) => (
          <ChatBubble key={message.id} message={message} />
        ))}
        {thinking ? <Text style={styles.typing}>FixJeZaak denkt na…</Text> : null}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Stel een vraag over je zaak…"
          placeholderTextColor={colors.textTertiary}
          value={input}
          onChangeText={setInput}
          multiline
        />
        <Pressable style={styles.sendButton} onPress={() => ask(input)} hitSlop={8}>
          <Send size={16} color={colors.onPrimary} strokeWidth={2.25} />
        </Pressable>
      </View>
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
  suggestions: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  suggestionsLabel: {
    ...typography.smallMedium,
    color: colors.textTertiary,
    marginBottom: spacing.xxs,
  },
  suggestionChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  suggestionText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  typing: {
    ...typography.small,
    color: colors.textTertiary,
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
