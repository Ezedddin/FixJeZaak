import { useEffect } from 'react';

import { syncDeadlineReminders } from '@/services/reminders';
import { useCasesStore } from '@/store/casesStore';
import { useNotificationsStore } from '@/store/notificationsStore';
import type { CaseStatus } from '@/types';
import { daysUntil, formatDate } from '@/utils/format';

const REMIND_WITHIN_DAYS = 7;
const DONE_STATUSES: CaseStatus[] = ['submitted', 'waiting_response', 'response_received', 'resolved'];

/**
 * Adds an in-app reminder when a case deadline is a week away or less, once
 * per case and deadline, and keeps the phone's scheduled deadline
 * notifications in line with the cases. Runs whenever the cases change
 * (e.g. on app start after the stores rehydrate).
 */
export function useDeadlineReminders() {
  const cases = useCasesStore((state) => state.cases);
  const notifications = useNotificationsStore((state) => state.notifications);
  const addNotification = useNotificationsStore((state) => state.addNotification);

  const deadlineKey = cases.map((c) => `${c.id}:${c.deadline ?? ''}:${c.status}`).join('|');
  useEffect(() => {
    void syncDeadlineReminders(cases).catch(() => undefined);
    // Only reschedule when a deadline or status actually changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadlineKey]);

  useEffect(() => {
    for (const legalCase of cases) {
      if (!legalCase.deadline || DONE_STATUSES.includes(legalCase.status)) continue;
      const days = daysUntil(legalCase.deadline);
      if (days > REMIND_WITHIN_DAYS) continue;

      const id = `deadline_${legalCase.id}_${legalCase.deadline}`;
      if (notifications.some((n) => n.id === id)) continue;

      addNotification({
        id,
        type: 'deadline',
        title: days < 0 ? `Deadline verstreken: ${legalCase.title}` : `Deadline nadert: ${legalCase.title}`,
        body:
          days < 0
            ? `De deadline van ${formatDate(legalCase.deadline)} is verstreken. Bekijk je zaak om te zien wat je nog kunt doen.`
            : `Je hebt nog tot ${formatDate(legalCase.deadline)}. ${legalCase.nextAction}.`,
        createdAt: new Date().toISOString(),
        read: false,
        caseId: legalCase.id,
      });
    }
  }, [cases, notifications, addNotification]);
}
