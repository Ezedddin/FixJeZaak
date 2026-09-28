import { useRouter } from 'expo-router';
import {
  Bell,
  ChevronRight,
  FileText,
  HelpCircle,
  LogOut,
  Shield,
  ShieldCheck,
  User,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmationModal } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';

interface Row {
  key: string;
  label: string;
  subtitle?: string;
  icon: LucideIcon;
  onPress: () => void;
}

interface Section {
  key: string;
  title: string;
  rows: Row[];
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [confirmLogout, setConfirmLogout] = useState(false);


  const sections: Section[] = [
    {
      key: 'account',
      title: 'Account',
      rows: [
        {
          key: 'personal',
          label: 'Persoonlijke gegevens',
          subtitle: user?.name,
          icon: User,
          onPress: () =>
            router.push({ pathname: '/profile/[section]', params: { section: 'persoonlijke-gegevens' } }),
        },
      ],
    },
    {
      key: 'voorkeuren',
      title: 'Voorkeuren',
      rows: [
        {
          key: 'notifications',
          label: 'Meldingen',
          subtitle: 'Aan',
          icon: Bell,
          onPress: () => router.push('/notifications'),
        },
        {
          key: 'privacy',
          label: 'Privacy & gegevens',
          icon: Shield,
          onPress: () => router.push('/profile/privacy'),
        },
        {
          key: 'security',
          label: 'Beveiliging',
          icon: ShieldCheck,
          onPress: () => router.push({ pathname: '/profile/[section]', params: { section: 'beveiliging' } }),
        },
      ],
    },
    {
      key: 'ondersteuning',
      title: 'Ondersteuning',
      rows: [
        {
          key: 'help',
          label: 'Helpcentrum',
          icon: HelpCircle,
          onPress: () => router.push({ pathname: '/profile/[section]', params: { section: 'helpcentrum' } }),
        },
        {
          key: 'terms',
          label: 'Voorwaarden',
          icon: FileText,
          onPress: () => router.push({ pathname: '/profile/[section]', params: { section: 'voorwaarden' } }),
        },
      ],
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxxl }}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.initials ?? '—'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user?.name ?? 'Gast'}</Text>
            <Text style={styles.email}>{user?.email ?? ''}</Text>
          </View>
        </View>

        {sections.map((section) => (
          <View key={section.key} style={styles.section}>
            <Text style={styles.sectionEyebrow}>{section.title.toUpperCase()}</Text>
            <View style={styles.rows}>
              {section.rows.map((row, index) => (
                <RowItem key={row.key} row={row} isLast={index === section.rows.length - 1} />
              ))}
            </View>
          </View>
        ))}

        <Pressable style={styles.logoutRow} onPress={() => setConfirmLogout(true)}>
          <LogOut size={18} color={colors.danger} strokeWidth={2} />
          <Text style={styles.logoutText}>Uitloggen</Text>
        </Pressable>
      </ScrollView>

      <ConfirmationModal
        visible={confirmLogout}
        title="Uitloggen"
        description="Weet je zeker dat je wilt uitloggen?"
        confirmLabel="Uitloggen"
        destructive
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => {
          setConfirmLogout(false);
          logout();
          router.replace('/onboarding');
        }}
      />
    </View>
  );
}

function RowItem({ row, isLast }: { row: Row; isLast: boolean }) {
  const Icon = row.icon;
  return (
    <Pressable style={[styles.row, isLast && styles.rowLast]} onPress={row.onPress}>
      <View style={styles.rowIcon}>
        <Icon size={17} color={colors.textSecondary} strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{row.label}</Text>
        {row.subtitle ? <Text style={styles.rowSubtitle}>{row.subtitle}</Text> : null}
      </View>
      <ChevronRight size={18} color={colors.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.h3,
    color: colors.onPrimary,
  },
  name: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  email: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 1,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionEyebrow: {
    ...typography.tiny,
    color: colors.textTertiary,
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
  },
  rows: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  rowSubtitle: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 1,
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
  },
  logoutText: {
    ...typography.bodyMedium,
    color: colors.danger,
  },
});
