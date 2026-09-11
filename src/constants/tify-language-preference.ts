import type { TifyUserLanguage } from '@/src/utils/tify-language';

export type TifyLanguagePreference = 'en' | 'tl' | 'taglish';

export const TIFY_LANGUAGE_OPTIONS: ReadonlyArray<{
  id: TifyLanguagePreference;
  title: string;
  subtitle: string;
  sample: string;
}> = [
  {
    id: 'en',
    title: 'English',
    subtitle: 'Tify replies in English',
    sample: 'How are you feeling in the heat?',
  },
  {
    id: 'tl',
    title: 'Filipino',
    subtitle: 'Tagalog replies from Tify',
    sample: 'Kamusta ka sa init ngayon?',
  },
  {
    id: 'taglish',
    title: 'Taglish',
    subtitle: 'Mix of Filipino and English',
    sample: 'Kamusta ka sa heat today?',
  },
];

export function preferenceToUserLanguage(pref: TifyLanguagePreference): TifyUserLanguage {
  if (pref === 'taglish') return 'mixed';
  return pref;
}

export function tifyGreetingLine(
  firstName: string,
  heatIndexLabel: string | null,
  pref: TifyLanguagePreference,
): string {
  const heat =
    heatIndexLabel != null ? ` Heat index: ${heatIndexLabel}°C.` : '';

  switch (pref) {
    case 'en':
      return `Hi ${firstName}! I'm Tify, your heat safety assistant.${heat}\n\nHow are you feeling in the heat? Tap a button below or type your answer.`;
    case 'tl':
      return `Hi ${firstName}! Ako si Tify — heat safety assistant mo.${heat}\n\nKamusta ka sa init ngayon? Pili lang sa buttons sa baba o i-type ang sagot mo.`;
    default:
      return `Hi ${firstName}! Ako si Tify — heat safety assistant mo.${heat}\n\nKamusta ka sa init? / How are you feeling in the heat?\nPili lang sa buttons sa baba, o type mo ang sagot mo.`;
  }
}

export function tifyChipLabel(reply: string, pref: TifyLanguagePreference): string {
  const en: Record<string, string> = {
    'Feeling Well': 'Feeling well',
    'Mild Discomfort': 'Mild discomfort',
    'Not Feeling Well': 'Not feeling well',
    'Well Hydrated': 'Well hydrated',
    'Needs Hydration': 'Needs water',
    'Dehydrated / Concerning': 'Dehydrated',
    Low: 'Low activity',
    Moderate: 'Moderate',
    High: 'High activity',
    'Walang sintomas': 'No symptoms',
    'Sakit ng ulo': 'Headache',
    Nahihilo: 'Dizzy',
    'Masakit katawan': 'Body pain',
    'Save check-in': 'Save check-in',
    'Start over': 'Start over',
  };

  const tl: Record<string, string> = {
    'Feeling Well': 'Okay ako',
    'Mild Discomfort': 'Medyo hindi okay',
    'Not Feeling Well': 'Hindi maganda ang pakiramdam',
    'Well Hydrated': 'Hydrated ako',
    'Needs Hydration': 'Kailangan ng tubig',
    'Dehydrated / Concerning': 'Dehydrated',
    Low: 'Mababang activity',
    Moderate: 'Katamtamang activity',
    High: 'Mataas na activity',
    'Walang sintomas': 'Walang sintomas',
    'Sakit ng ulo': 'Sakit ng ulo',
    Nahihilo: 'Nahihilo',
    'Masakit katawan': 'Masakit katawan',
    'Save check-in': 'I-save ang check-in',
    'Start over': 'Ulit mula sa simula',
  };

  if (pref === 'en') return en[reply] ?? reply;
  if (pref === 'tl') return tl[reply] ?? reply;
  return tl[reply] ?? en[reply] ?? reply;
}
