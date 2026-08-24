import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { appConfig } from '@/src/config/app.config';

let client: SupabaseClient | null = null;
let invalidUrlLogged = false;

function isValidSupabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      (parsed.hostname.endsWith('.supabase.co') || parsed.hostname.endsWith('.supabase.in'))
    );
  } catch {
    return false;
  }
}

function isValidSupabaseKey(key: string): boolean {
  if (key.startsWith('eyJ')) return true;
  return key.startsWith('sb_publishable_') && key.length > 20;
}

/** Fetch with a hard timeout so offline/DNS failures don't hang the splash screen */
async function supabaseFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutMs = 8_000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const parentSignal = init?.signal;
  const onAbort = () => controller.abort();
  if (parentSignal) {
    if (parentSignal.aborted) controller.abort();
    else parentSignal.addEventListener('abort', onAbort, { once: true });
  }

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Network request failed');
    }
    throw error;
  } finally {
    clearTimeout(timer);
    parentSignal?.removeEventListener('abort', onAbort);
  }
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!appConfig.supabaseUrl || !appConfig.supabaseAnonKey) {
    return null;
  }

  if (!isValidSupabaseUrl(appConfig.supabaseUrl)) {
    if (!invalidUrlLogged) {
      invalidUrlLogged = true;
      console.warn(
        '[IniTify] EXPO_PUBLIC_SUPABASE_URL is missing or invalid. Expected https://<project-ref>.supabase.co',
      );
    }
    return null;
  }

  if (!isValidSupabaseKey(appConfig.supabaseAnonKey)) {
    if (!invalidUrlLogged) {
      invalidUrlLogged = true;
      console.warn(
        '[IniTify] EXPO_PUBLIC_SUPABASE_ANON_KEY is missing or invalid. Use publishable (sb_publishable_...) or legacy anon JWT from Supabase Dashboard → API.',
      );
    }
    return null;
  }

  if (!client) {
    client = createClient(appConfig.supabaseUrl, appConfig.supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
      global: {
        fetch: supabaseFetch,
      },
    });
  }

  return client;
}
