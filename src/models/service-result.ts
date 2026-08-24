export type ServiceStatus =
  | 'success'
  | 'cached'
  | 'loading'
  | 'unavailable'
  | 'requires_configuration'
  | 'permission_denied'
  | 'invalid_input'
  | 'error';

export interface ServiceResult<T> {
  status: ServiceStatus;
  data: T | null;
  message: string;
  feed?: unknown;
}
