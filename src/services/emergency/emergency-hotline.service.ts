import { Linking, Platform } from 'react-native';
import type { ServiceResult } from '@/src/models/service-result';

/** Strip spaces/dashes/parentheses; keep leading + for international numbers */
export function normalizePhoneForDial(phone: string): string {
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';
  return hasPlus ? `+${digits}` : digits;
}

function buildTelUrls(phone: string): string[] {
  const normalized = normalizePhoneForDial(phone);
  // Android: tel: works; some devices prefer tel://. iOS: telprompt: shows confirm.
  if (Platform.OS === 'ios') {
    return [`telprompt:${normalized}`, `tel:${normalized}`];
  }
  return [`tel:${normalized}`, `tel://${normalized}`];
}

/**
 * Opens the device phone dialer with the given number.
 * Does not gate on Linking.canOpenURL — on Android 11+ that often returns false
 * for tel: even when the dialer works (package visibility). SMS already opens the same way.
 */
export async function dialPhoneNumber(phone: string): Promise<ServiceResult<null>> {
  const normalized = normalizePhoneForDial(phone);
  if (!normalized) {
    return {
      status: 'invalid_input',
      data: null,
      message: 'Enter a valid phone number.',
    };
  }

  const urls = buildTelUrls(normalized);
  let lastError: unknown = null;

  for (const url of urls) {
    try {
      await Linking.openURL(url);
      return {
        status: 'success',
        data: null,
        message: `Opening dialer for ${normalized}…`,
      };
    } catch (error) {
      lastError = error;
    }
  }

  return {
    status: 'error',
    data: null,
    message:
      lastError instanceof Error
        ? `Could not open the phone dialer (${lastError.message}).`
        : 'Could not open the phone dialer. Try calling from your Phone app.',
  };
}
