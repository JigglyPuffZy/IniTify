import { Linking, Platform } from 'react-native';
import type { ServiceResult } from '@/src/models/service-result';

/** Strip spaces/dashes; keep + for international numbers */
export function normalizePhoneForDial(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

function buildTelUrl(phone: string): string {
  const normalized = normalizePhoneForDial(phone);
  if (!normalized) {
    throw new Error('Invalid phone number.');
  }
  return Platform.OS === 'ios' ? `telprompt:${normalized}` : `tel:${normalized}`;
}

/**
 * Opens the device phone dialer with the given number.
 * Requires a physical device with cellular/phone app — simulators may not dial.
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

  const url = buildTelUrl(normalized);

  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      return {
        status: 'unavailable',
        data: null,
        message:
          'Phone dialer is not available on this device. Use a physical phone with a SIM or phone app.',
      };
    }

    await Linking.openURL(url);
    return {
      status: 'success',
      data: null,
      message: `Opening dialer for ${normalized}…`,
    };
  } catch {
    return {
      status: 'error',
      data: null,
      message: 'Could not open the phone dialer.',
    };
  }
}
