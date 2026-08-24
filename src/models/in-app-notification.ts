export type InAppNotificationType =
  | 'check-in-reminder'
  | 'heat-risk'
  | 'weather-safety'
  | 'emergency'
  | 'system';

export interface InAppNotification {
  id: string;
  type: InAppNotificationType;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  href?: string;
}
