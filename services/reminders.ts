import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { LegalCase } from '@/types';

const CHANNEL_ID = 'deadlines';
const REMIND_DAYS_BEFORE = [7, 1];
const REMIND_HOUR = 9;

let configured = false;

function configure() {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  if (Platform.OS === 'android') {
    void Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Deadlines',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
}

function reminderDates(deadline: string): Array<{ date: Date; daysBefore: number }> {
  const [year, month, day] = deadline.split('-').map(Number);
  const now = Date.now();
  return REMIND_DAYS_BEFORE.map((daysBefore) => ({
    date: new Date(year, month - 1, day - daysBefore, REMIND_HOUR, 0, 0),
    daysBefore,
  })).filter(({ date }) => date.getTime() > now);
}

/**
 * Schedules phone notifications a week and a day before each open case's
 * deadline. Rebuilds the full schedule each time, so changed or finished
 * cases never leave a stale reminder behind. Asks for permission only once
 * there is actually something to remind about.
 */
export async function syncDeadlineReminders(cases: LegalCase[]): Promise<void> {
  if (Platform.OS === 'web') return;
  configure();

  const planned = cases
    .filter((c) => c.deadline && /^\d{4}-\d{2}-\d{2}$/.test(c.deadline))
    .filter((c) => !['submitted', 'waiting_response', 'response_received', 'resolved'].includes(c.status))
    .flatMap((c) => reminderDates(c.deadline!).map((r) => ({ legalCase: c, ...r })));

  await Notifications.cancelAllScheduledNotificationsAsync();
  if (planned.length === 0) return;

  const current = await Notifications.getPermissionsAsync();
  const granted = current.granted || (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return;

  for (const { legalCase, date, daysBefore } of planned) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: daysBefore === 1 ? `Morgen deadline: ${legalCase.title}` : `Nog een week: ${legalCase.title}`,
        body: legalCase.nextAction,
        data: { caseId: legalCase.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
    });
  }
}
