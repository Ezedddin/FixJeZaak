import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/theme';
import type { ChatMessage } from '@/types';

interface ChatBubbleProps {
  message: ChatMessage;
  onSelectOption?: (value: string, label: string) => void;
  disabled?: boolean;
}

export function ChatBubble({ message, onSelectOption, disabled }: ChatBubbleProps) {
  const isUser = message.sender === 'user';

  return (
    <View style={[styles.container, isUser ? styles.alignRight : styles.alignLeft]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        <Text style={[styles.text, isUser ? styles.userText : styles.assistantText]}>
          {message.text}
        </Text>
      </View>
      {message.options && message.options.length > 0 ? (
        <View style={styles.options}>
          {message.options.map((option) => (
            <Pressable
              key={option.value}
              disabled={disabled}
              onPress={() => onSelectOption?.(option.value, option.label)}
              style={({ pressed }) => [
                styles.option,
                pressed && !disabled && styles.optionPressed,
                disabled && styles.optionDisabled,
              ]}
            >
              <Text style={styles.optionText}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
    maxWidth: '88%',
  },
  alignLeft: {
    alignSelf: 'flex-start',
  },
  alignRight: {
    alignSelf: 'flex-end',
  },
  bubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  assistantBubble: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderTopRightRadius: 4,
  },
  text: {
    ...typography.body,
  },
  assistantText: {
    color: colors.textPrimary,
  },
  userText: {
    color: colors.onPrimary,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  option: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  optionPressed: {
    opacity: 0.7,
  },
  optionDisabled: {
    opacity: 0.4,
  },
  optionText: {
    ...typography.smallMedium,
    color: colors.accent,
  },
});
