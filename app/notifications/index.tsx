import { useRouter } from 'expo-router';
import { Bell, Calendar, Clock, MessageCircle, Sparkles } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyState, ScreenHeader } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useNotificationsStore } from '@/store/notificationsStore';
import type { AppNotification, NotificationType } from '@/types';
import { timeAgoLabel } from '@/utils/format';

const TYPE_ICON: Record<NotificationType, LucideIcon> = {
  deadline: Clock,
  reactie: MessageCircle,
  analyse: Sparkles,
  afspraak: Calendar,
  systeem: Bell,
};

export default function NotificationsScreen() {
  const router = useRouter();
  const notifications = useNotificationsStore((state) => state.notifications);
  const markAsRead = useNotificationsStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationsStore((state) => state.markAllAsRead);

  function handlePress(notification: AppNotification) {
    markAsRead(notification.id);
    if (notification.caseId) {
      router.push({ pathname: '/case/[id]', params: { id: notification.caseId } });
    }
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Meldingen"
        rightElement={
          <Pressable onPress={markAllAsRead} hitSlop={8}>
            <Text style={styles.markAll}>Alles gelezen</Text>
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {notifications.length === 0 ? (
          <EmptyState icon={Bell} title="Geen meldingen" />
        ) : (
          notifications
            .slice()
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((notification) => {
              const Icon = TYPE_ICON[notification.type];
              return (
                <Pressable
                  key={notification.id}
                  style={[styles.row, !notification.read && styles.rowUnread]}
                  onPress={() => handlePress(notification)}
                >
                  <View style={styles.iconWrap}>
                    <Icon size={17} color={colors.primary} strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{notification.title}</Text>
                    <Text style={styles.body}>{notification.body}</Text>
                    <Text style={styles.time}>{timeAgoLabel(notification.createdAt)}</Text>
                  </View>
                  {!notification.read ? <View style={styles.dot} /> : null}
                </Pressable>
              );
            })
        )}
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
    gap: spacing.xs,
  },
  markAll: {
    ...typography.smallMedium,
    color: colors.accent,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowUnread: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  body: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },
  time: {
    ...typography.tiny,
    color: colors.textTertiary,
    marginTop: spacing.xxs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginTop: 6,
  },
});
