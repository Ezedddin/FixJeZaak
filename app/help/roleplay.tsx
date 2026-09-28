import { useLocalSearchParams, useRouter } from 'expo-router';
import { Send } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ChatBubble } from '@/components/chat';
import { Button, ScreenHeader } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { backendClient } from '@/services/backendClient';
import type { ChatMessage } from '@/types';
import { generateId } from '@/utils/id';

function toTranscript(messages: ChatMessage[]) {
  return messages.map((m) => ({
    role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
    content: m.text,
  }));
}

export default function RoleplayScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ situation?: string; role?: string }>();
  const scenario = { situation: params.situation ?? '', counterpartyRole: params.role ?? '' };

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  async function requestReply(transcript: ChatMessage[]) {
    setSending(true);
    setError(null);
    try {
      const { reply } = await backendClient.roleplayTurn(scenario, toTranscript(transcript));
      setMessages([
        ...transcript,
        { id: generateId('msg'), sender: 'assistant', text: reply, createdAt: new Date().toISOString() },
      ]);
    } catch {
      setError('Het oefengesprek reageert niet. Controleer je internetverbinding en probeer het opnieuw.');
    } finally {
      setSending(false);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
  }

  useEffect(() => {
    if (scenario.situation) void requestReply([]);
    // Only the opening line on first render; later turns are user-driven.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    const next: ChatMessage[] = [
      ...messages,
      { id: generateId('msg'), sender: 'user', text, createdAt: new Date().toISOString() },
    ];
    setMessages(next);
    void requestReply(next);
  }

  if (!scenario.situation) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Oefen het gesprek" />
        <View style={styles.missing}>
          <Text style={styles.missingText}>Beschrijf eerst je situatie, dan kun je het gesprek oefenen.</Text>
          <Button label="Naar gespreksvoorbereiding" onPress={() => router.replace('/help/conversation-prep')} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScreenHeader title="Oefen het gesprek" subtitle={`Rol: je ${scenario.counterpartyRole}`} />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.messages}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((message) => (
          <ChatBubble key={message.id} message={message} />
        ))}
        {sending ? <Text style={styles.typing}>Je {scenario.counterpartyRole} typt…</Text> : null}
        {error ? (
          <View style={{ gap: spacing.sm }}>
            <Text style={styles.error}>{error}</Text>
            <Button label="Opnieuw proberen" variant="secondary" onPress={() => requestReply(messages)} />
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Typ je reactie…"
          placeholderTextColor={colors.textTertiary}
          value={input}
          onChangeText={setInput}
          multiline
        />
        <Pressable style={styles.sendButton} onPress={handleSend} hitSlop={8}>
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
  typing: {
    ...typography.small,
    color: colors.textTertiary,
    marginTop: spacing.xxs,
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
  error: {
    ...typography.small,
    color: colors.danger,
  },
  missing: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  missingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
