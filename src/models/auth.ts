export type AuthMode = 'supabase' | 'local';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  mode: AuthMode;
}

export interface AuthResult {
  ok: boolean;
  user: AuthUser | null;
  message: string;
}
