import type { AppNotification, NotificationType } from '@/types';
import { generateId } from '@/utils/id';

interface CreateNotificationInput {
  type: NotificationType;
  title: string;
  body: string;
  caseId?: string;
}

function createNotification(input: CreateNotificationInput): AppNotification {
  return {
    id: generateId('notif'),
    type: input.type,
    title: input.title,
    body: input.body,
    caseId: input.caseId,
    createdAt: new Date().toISOString(),
    read: false,
  };
}

export const notificationService = { createNotification };
