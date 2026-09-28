export type NotificationType = 'deadline' | 'reactie' | 'analyse' | 'afspraak' | 'systeem';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  caseId?: string;
}
