import { Linking, Platform } from 'react-native';
import type { ServiceResult } from '@/src/models/service-result';
import { normalizePhoneForDial } from '@/src/services/emergency/emergency-hotline.service';

/** Opens Messages with a real prefilled SMS (user taps Send). */
export function buildSmsUrl(phone: string, body: string): string {
  const normalized = normalizePhoneForDial(phone);
  const encoded = encodeURIComponent(body);
  return Platform.OS === 'ios'
    ? `sms:${normalized}&body=${encoded}`
    : `sms:${normalized}?body=${encoded}`;
}

export async function openEmergencySms(params: {
  phone: string;
  body: string;
}): Promise<ServiceResult<null>> {
  const normalized = normalizePhoneForDial(params.phone);
  if (!normalized) {
    return {
      status: 'invalid_input',
      data: null,
      message: 'Emergency contact phone number is invalid.',
    };
  }

  if (!params.body.trim()) {
    return {
      status: 'invalid_input',
      data: null,
      message: 'SMS message body is empty.',
    };
  }

  const url = buildSmsUrl(normalized, params.body);

  try {
    await Linking.openURL(url);
    return {
      status: 'success',
      data: null,
      message: 'Opening Messages — tap Send to notify your emergency contact.',
    };
  } catch {
    return {
      status: 'error',
      data: null,
      message: 'Could not open the SMS / Messages app.',
    };
  }
}
