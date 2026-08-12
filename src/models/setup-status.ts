export type ItemStatus =
  | 'done'
  | 'in_progress'
  | 'blocked'
  | 'needs_you'
  | 'optional';

export interface SetupChecklistItem {
  id: string;
  title: string;
  status: ItemStatus;
  detail: string;
  action: string;
}

export interface SystemSetupStatus {
  readyForAssessment: boolean;
  readyForProduction: boolean;
  items: SetupChecklistItem[];
}
