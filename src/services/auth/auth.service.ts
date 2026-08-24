import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabaseClient } from '@/src/config/supabase.client';
import type { AuthResult, AuthUser } from '@/src/models/auth';

const SESSION_KEY = '@initify/auth-session';
const LOCAL_ACCOUNTS_KEY = '@initify/local-accounts';

interface LocalAccount {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string | null;
  createdAt: string;
}

interface StoredSession {
  user: AuthUser;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashPassword(password: string): string {
  let hash = 5381;
  for (let i = 0; i < password.length; i += 1) {
    hash = (hash * 33) ^ password.charCodeAt(i);
  }
  return `local_${(hash >>> 0).toString(36)}_${password.length}`;
}

function toAuthUser(
  id: string,
  email: string,
  displayName: string | null,
  mode: AuthUser['mode'],
): AuthUser {
  return { id, email, displayName, mode };
}

async function readSession(): Promise<AuthUser | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredSession;
    return parsed.user ?? null;
  } catch {
    return null;
  }
}

async function writeSession(user: AuthUser | null): Promise<void> {
  if (!user) {
    await AsyncStorage.removeItem(SESSION_KEY);
    return;
  }
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ user } satisfies StoredSession));
}

async function readLocalAccounts(): Promise<LocalAccount[]> {
  const raw = await AsyncStorage.getItem(LOCAL_ACCOUNTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as LocalAccount[];
  } catch {
    return [];
  }
}

async function writeLocalAccounts(accounts: LocalAccount[]): Promise<void> {
  await AsyncStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
}

function mapSupabaseUser(user: {
  id: string;
  email?: string | null;
  user_metadata?: { full_name?: string; name?: string };
}): AuthUser {
  const displayName =
    user.user_metadata?.full_name?.trim() ||
    user.user_metadata?.name?.trim() ||
    user.email?.split('@')[0] ||
    null;
  return toAuthUser(user.id, user.email ?? '', displayName, 'supabase');
}

function formatSupabaseAuthError(error: { message?: string; code?: string; status?: number }): string {
  const code = error.code?.toLowerCase() ?? '';
  const message = error.message ?? '';
  const lower = message.toLowerCase();

  if (
    code === 'over_email_send_rate_limit' ||
    code === 'over_request_rate_limit' ||
    lower.includes('rate limit') ||
    lower.includes('email rate limit exceeded') ||
    lower.includes('limit exceeded')
  ) {
    return (
      'Sign-up/login email limit reached on Supabase (free tier). ' +
      'Wait a few minutes, or ask the admin to turn OFF "Confirm email" in Supabase → Authentication → Providers → Email, ' +
      'then confirm existing users under Authentication → Users.'
    );
  }
  if (code === 'email_not_confirmed' || lower.includes('email not confirmed')) {
    return 'Please confirm your email first. Open the verification link Supabase sent you, then sign in again. If no email arrived, the project may have hit the email send limit — ask admin to disable Confirm email.';
  }
  if (code === 'invalid_credentials' || lower.includes('invalid login credentials')) {
    return 'Invalid email or password. If you just signed up, confirm your email first (or ask admin to confirm your user in Supabase).';
  }
  if (code === 'user_already_registered' || lower.includes('already registered')) {
    return 'An account with this email already exists. Sign in instead.';
  }
  if (lower.includes('password')) {
    return message;
  }

  return message || 'Something went wrong. Please try again.';
}

function formatSupabaseNetworkError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (
    lower.includes('failed to fetch') ||
    lower.includes('network request failed') ||
    lower.includes('err_name_not_resolved') ||
    lower.includes('enotfound')
  ) {
    return 'Cannot reach Supabase. Check EXPO_PUBLIC_SUPABASE_URL in .env — the project URL may be wrong or the project was deleted. Restart Expo after updating.';
  }

  return message || 'Something went wrong. Please try again.';
}

async function signInWithSupabase(email: string, password: string): Promise<AuthResult> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ok: false, user: null, message: 'Supabase is not configured.' };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { ok: false, user: null, message: formatSupabaseAuthError(error) };
    }
    if (!data.user) {
      return { ok: false, user: null, message: 'Sign in failed. Please try again.' };
    }

    const user = mapSupabaseUser(data.user);
    await writeSession(user);
    return { ok: true, user, message: 'Signed in successfully.' };
  } catch (error) {
    return { ok: false, user: null, message: formatSupabaseNetworkError(error) };
  }
}

async function signUpWithSupabase(
  email: string,
  password: string,
  displayName: string | null,
): Promise<AuthResult> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ok: false, user: null, message: 'Supabase is not configured.' };
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: displayName ? { full_name: displayName } : undefined,
      },
    });

    if (error) {
      return { ok: false, user: null, message: formatSupabaseAuthError(error) };
    }
    if (!data.user) {
      return { ok: false, user: null, message: 'Could not create account.' };
    }

    if (!data.session) {
      return {
        ok: true,
        user: null,
        message: 'Account created. Check your email to confirm, then sign in.',
      };
    }

    const user = mapSupabaseUser(data.user);
    await writeSession(user);
    return { ok: true, user, message: 'Account created successfully.' };
  } catch (error) {
    return { ok: false, user: null, message: formatSupabaseNetworkError(error) };
  }
}

async function signInLocally(email: string, password: string): Promise<AuthResult> {
  const normalized = normalizeEmail(email);
  const accounts = await readLocalAccounts();
  const account = accounts.find((entry) => entry.email === normalized);
  if (!account || account.passwordHash !== hashPassword(password)) {
    return { ok: false, user: null, message: 'Invalid email or password.' };
  }

  const user = toAuthUser(account.id, account.email, account.displayName, 'local');
  await writeSession(user);
  return { ok: true, user, message: 'Signed in successfully.' };
}

async function signUpLocally(
  email: string,
  password: string,
  displayName: string | null,
): Promise<AuthResult> {
  const normalized = normalizeEmail(email);
  const accounts = await readLocalAccounts();
  if (accounts.some((entry) => entry.email === normalized)) {
    return { ok: false, user: null, message: 'An account with this email already exists.' };
  }

  const account: LocalAccount = {
    id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    email: normalized,
    passwordHash: hashPassword(password),
    displayName: displayName?.trim() || null,
    createdAt: new Date().toISOString(),
  };

  await writeLocalAccounts([...accounts, account]);
  const user = toAuthUser(account.id, account.email, account.displayName, 'local');
  await writeSession(user);
  return { ok: true, user, message: 'Account created successfully.' };
}

async function restoreSupabaseSession(): Promise<AuthUser | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.user) return null;

    const user = mapSupabaseUser(data.session.user);
    await writeSession(user);
    return user;
  } catch {
    // Offline / DNS — fall back to cached local session
    return null;
  }
}

export const authService = {
  usesSupabase(): boolean {
    return getSupabaseClient() !== null;
  },

  async getSession(): Promise<AuthUser | null> {
    const cached = await readSession();
    if (cached) {
      // Refresh Supabase session in background — don't block splash
      void restoreSupabaseSession().catch(() => undefined);
      return cached;
    }
    try {
      return await restoreSupabaseSession();
    } catch {
      return null;
    }
  },

  async signIn(email: string, password: string): Promise<AuthResult> {
    if (getSupabaseClient()) {
      return signInWithSupabase(email, password);
    }
    return signInLocally(email, password);
  },

  async signUp(
    email: string,
    password: string,
    displayName: string | null = null,
  ): Promise<AuthResult> {
    if (getSupabaseClient()) {
      return signUpWithSupabase(email, password, displayName);
    }
    return signUpLocally(email, password, displayName);
  },

  async signOut(): Promise<void> {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    await writeSession(null);
  },

  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return () => undefined;
    }

    const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const user = mapSupabaseUser(session.user);
        await writeSession(user);
        callback(user);
        return;
      }
      await writeSession(null);
      callback(null);
    });

    return () => data.subscription.unsubscribe();
  },
};
